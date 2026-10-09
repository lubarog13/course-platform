import { type NextRequest, NextResponse } from "next/server";

import {
  courseInclude,
  courseSingleInclude,
  jsonError,
  listCourses,
  parseCourseBody,
  prismaErrorResponse,
  serializeCourse,
  syncCourseParts,
  toCourseFullDto,
} from "@/app/lib/courses";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const session = await auth();
  const forUser = params.get("enrolled") ? params.get("enrolled") == "1" : null;
  if (forUser && !session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  try {
    const viewerId = session?.user?.id ? Number(session.user.id) : null;
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
      viewerId: Number.isFinite(viewerId) ? viewerId : null,
      viewerIsAdmin: session?.user?.role === "admin",
    });

    return NextResponse.json(result);
  } catch (error) {
    return prismaErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Не авторизован", 401);
  }
  if (session.user.role !== "teacher" && session.user.role !== "admin") {
    return jsonError("Нет прав на создание курса", 403);
  }

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

    const { parts, ...courseData } = data;
    const userId = Number(session.user.id);
    const name = courseData.name as string;
    const slug = courseData.slug as string;

    const course = await prisma.course.create({
      data: {
        name,
        slug,
        description: courseData.description,
        language: courseData.language ?? "ru",
        level: courseData.level,
        needEnrollment: courseData.needEnrollment ?? false,
        coverFileId: courseData.coverFileId,
        categoryId: courseData.categoryId,
        tags: courseData.tags ?? [],
        deadlineDays: courseData.deadlineDays,
        publishedAt: courseData.publishedAt,
        instructors: {
          create: {
            userId,
            role: "owner",
          },
        },
      },
      include: courseInclude,
    });

    if (parts && parts.length > 0) {
      await syncCourseParts(course.id, parts);
    }

    const full = await prisma.course.findFirst({
      where: { id: course.id },
      include: {
        ...courseSingleInclude,
        enrollments: false,
      },
    });
    if (!full) {
      return jsonError("Курс не найден после создания", 500);
    }

    return NextResponse.json(toCourseFullDto(serializeCourse(full as never)), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof Error && error.cause === "invalid") {
      return jsonError(error.message, 400);
    }
    return prismaErrorResponse(error);
  }
}
