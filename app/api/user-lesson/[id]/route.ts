import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import {
  findUserLesson,
  parseUserLessonUpdateBody,
  updateUserLesson,
} from "@/app/lib/enrollment";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Не авторизован", 401);
    }

    const { id } = await params;
    const record = await findUserLesson(parseNumericId(id));
    if (!record) {
      return jsonError("Прогресс урока не найден", 404);
    }

    const actorId = Number(session.user.id);
    const isOwner = record.userId === actorId;
    const isAdmin = session.user.role === "admin";
    const isTeacher =
      session.user.role === "teacher" &&
      record.lesson.coursePart.course.instructors.some(
        (item) => item.userId === actorId,
      );

    if (!isOwner && !isAdmin && !isTeacher) {
      return jsonError("Нет доступа к этой записи", 403);
    }

    return NextResponse.json(record);
  } catch (error) {
    return prismaErrorResponse(error, "Прогресс урока");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return jsonError("Не авторизован", 401);
    }

    const { id } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Некорректный JSON", 400);
    }

    const data = parseUserLessonUpdateBody(body);
    const record = await updateUserLesson(
      parseNumericId(id),
      { id: Number(session.user.id), role: session.user.role as Role },
      data,
    );
    return NextResponse.json(record);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Прогресс урока не найден") {
        return jsonError(error.message, 404);
      }
      if (
        error.message.startsWith("Нет доступа") ||
        error.message.startsWith("Студент")
      ) {
        return jsonError(error.message, 403);
      }
      if (
        error.message.startsWith("Поле") ||
        error.message.startsWith("Нет полей") ||
        error.message.startsWith("Ожидается")
      ) {
        return jsonError(error.message, 400);
      }
    }
    return prismaErrorResponse(error, "Прогресс урока");
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return PATCH(request, context);
}
