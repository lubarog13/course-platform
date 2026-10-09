import { type NextRequest, NextResponse } from "next/server";

import {
  courseSingleInclude,
  findCourse,
  jsonError,
  parseCourseBody,
  prismaErrorResponse,
  serializeCourse,
  syncCourseParts,
  toCourseFullDto,
} from "@/app/lib/courses";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/auth";
import { isCourseStaff } from "@/app/lib/enrollment";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  const { id } = await params;
  const course = await findCourse(id);

  if (!course || course.deletedAt) {
    return jsonError("Курс не найден", 404);
  }

  if (!course.publishedAt) {
    const actorId = session?.user?.id ? Number(session.user.id) : null;
    const isAdmin = session?.user?.role === "admin";
    const isOwner =
      actorId != null &&
      course.instructors.some(
        (item) => item.userId === actorId && item.role === "owner",
      );
    if (!isAdmin && !isOwner) {
      return jsonError("Курс не найден", 404);
    }
  }

  return NextResponse.json(toCourseFullDto(serializeCourse(course)));
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return jsonError("Не авторизован", 401);
  }

  const { id } = await params;
  const existing = await findCourse(id);

  if (!existing || existing.deletedAt) {
    return jsonError("Курс не найден", 404);
  }

  const staff = await isCourseStaff(
    existing.id,
    Number(session.user.id),
    session.user.role as Role,
  );
  if (!staff) {
    return jsonError("Нет прав на редактирование курса", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный JSON", 400);
  }

  try {
    const data = parseCourseBody(body, "update");
    const { parts, ...courseData } = data;

    await prisma.course.update({
      where: { id: existing.id },
      data: courseData,
    });

    if (parts !== undefined) {
      await syncCourseParts(existing.id, parts);
    }

    const full = await prisma.course.findFirst({
      where: { id: existing.id },
      include: {
        ...courseSingleInclude,
        enrollments: false,
      },
    });
    if (!full) {
      return jsonError("Курс не найден", 404);
    }

    return NextResponse.json(toCourseFullDto(serializeCourse(full as never)));
  } catch (error) {
    if (error instanceof Error && error.cause === "invalid") {
      return jsonError(error.message, 400);
    }
    return prismaErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return PATCH(request, context);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return jsonError("Не авторизован", 401);
  }

  const { id } = await params;
  const existing = await findCourse(id);

  if (!existing || existing.deletedAt) {
    return jsonError("Курс не найден", 404);
  }

  const staff = await isCourseStaff(
    existing.id,
    Number(session.user.id),
    session.user.role as Role,
  );
  if (!staff) {
    return jsonError("Нет прав на удаление курса", 403);
  }

  const course = await prisma.course.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
    include: courseSingleInclude,
  });

  return NextResponse.json(toCourseFullDto(serializeCourse(course as never)));
}
