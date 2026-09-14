import { type NextRequest, NextResponse } from "next/server";

import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import {
  findCoursePart,
  listCourseParts,
  parseCoursePartBody,
} from "@/app/lib/courseParts";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const courseIdRaw = request.nextUrl.searchParams.get("courseId");
  if (!courseIdRaw || !/^\d+$/.test(courseIdRaw)) {
    return jsonError("Нужен query-параметр courseId", 400);
  }

  try {
    const parts = await listCourseParts(Number(courseIdRaw));
    return NextResponse.json(parts);
  } catch (error) {
    return prismaErrorResponse(error, "Часть курса");
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный JSON", 400);
  }

  try {
    const data = parseCoursePartBody(body, "create");
    if (!data.courseId || !data.name || data.sortOrder === undefined) {
      return jsonError("Нужны courseId, name и sortOrder", 400);
    }

    const course = await prisma.course.findFirst({
      where: { id: data.courseId, deletedAt: null },
      select: { id: true },
    });
    if (!course) {
      return jsonError("Курс не найден", 404);
    }

    const part = await prisma.coursePart.create({
      data: {
        courseId: data.courseId,
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder,
      },
    });

    const full = await findCoursePart(part.id);
    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Часть курса");
  }
}
