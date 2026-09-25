import { type NextRequest, NextResponse } from "next/server";

import {
  courseInclude,
  jsonError,
  listCourses,
  parseCourseBody,
  prismaErrorResponse,
  serializeCourse,
} from "@/app/lib/courses";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const session = await auth(); 
  const forUser = params.get("enrolled") ? params.get("enrolled") == '1' : null;
  if (forUser && !session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  try {
    const result = await listCourses({
      published: params.get("published"),
      deleted: params.get("deleted"),
      page: params.get("page"),
      limit: params.get("limit"),
      offset: params.get("offset"),
      sort: params.get("sort"),
      order: params.get("order"),
      level: params.get("level"),
      category: params.get("category"),
      instructor: params.get("instructor"),
      tags: params.get("tags")?.split(",") ?? [],
      search: params.get("search"),
      enrolled: params.get("enrolled") ? Number(session?.user?.id) : null,
    });

    return NextResponse.json(result);
  } catch (error) {
    return prismaErrorResponse(error);
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
    const data = parseCourseBody(body, "create");
    if (!data.name || !data.slug) {
      return jsonError("Нужны name и slug", 400);
    }

    const course = await prisma.course.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        language: data.language ?? "ru",
        level: data.level,
        needEnrollment: data.needEnrollment ?? false,
        coverFileId: data.coverFileId,
        categoryId: data.categoryId,
        tags: data.tags ?? [],
        publishedAt: data.publishedAt,
      },
      include: courseInclude,
    });

    return NextResponse.json(serializeCourse(course), { status: 201 });
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
