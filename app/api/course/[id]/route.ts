import { type NextRequest, NextResponse } from "next/server";

import {
  courseInclude,
  findCourse,
  jsonError,
  parseCourseBody,
  prismaErrorResponse,
  serializeCourse,
} from "@/app/lib/courses";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const course = await findCourse(id);

  if (!course || course.deletedAt) {
    return jsonError("Курс не найден", 404);
  }

  return NextResponse.json(serializeCourse(course));
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const existing = await findCourse(id);

  if (!existing || existing.deletedAt) {
    return jsonError("Курс не найден", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный JSON", 400);
  }

  try {
    const data = parseCourseBody(body, "update");
    const course = await prisma.course.update({
      where: { id: existing.id },
      data,
      include: courseInclude,
    });

    return NextResponse.json(serializeCourse(course));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Поле")) {
      return jsonError(error.message, 400);
    }
    if (error instanceof Error && error.message.startsWith("Ожидается")) {
      return jsonError(error.message, 400);
    }
    return prismaErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return PATCH(request, context);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const existing = await findCourse(id);

  if (!existing || existing.deletedAt) {
    return jsonError("Курс не найден", 404);
  }

  const course = await prisma.course.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
    include: courseInclude,
  });

  return NextResponse.json(serializeCourse(course));
}
