import { type NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";

import { auth } from "@/auth";
import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import {
  findTestAttemptsByLessonId,
  findTestAttemptsByLessonIdForTeacher,
  getLatestSubmittedAttemptForTeacher,
  findStudentsWithAttemptsByLessonIdForTeacher,
  startTestAttempt,
} from "@/app/lib/lessons";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/test/[id] — id = lessonId. Создаёт пустую попытку (или возвращает незавершённую). */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Не авторизован", 401);
    }

    const { id } = await params;
    const lessonId = parseNumericId(id);
    const userId = Number(session.user.id);
    const attempt = await startTestAttempt(lessonId, userId);
    return NextResponse.json(attempt, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Урок не найден") {
        return jsonError(error.message, 404);
      }
      if (
        error.message === "Попытку можно начать только для урока типа test" ||
        error.message === "Исчерпано максимальное число попыток" ||
        error.message === "Срок сдачи части курса истёк"
      ) {
        return jsonError(error.message, 400);
      }
    }
    return prismaErrorResponse(error, "Попытка теста");
  }
}

/**
 * GET /api/test/[id]
 * Без query — свои попытки.
 * ?userId=N — попытки студента (преподаватель/админ).
 * ?userId=N&latest=1 — последняя завершённая попытка студента.
 * ?teacher=1&limit=N&offset=N - список студентов с попытками по тесту
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return jsonError("Не авторизован", 401);
    }

    const { id } = await params;
    const lessonId = parseNumericId(id);
    const actorId = Number(session.user.id);
    const role = session.user.role as Role;

    const studentUserIdRaw = request.nextUrl.searchParams.get("userId");
    const latestOnly = request.nextUrl.searchParams.get("latest") === "1";
    const teacherList = request.nextUrl.searchParams.get("teacher") === "1";
    const limit = request.nextUrl.searchParams.get("limit");
    const offset = request.nextUrl.searchParams.get("offset");
    if (studentUserIdRaw) {
      if (!/^\d+$/.test(studentUserIdRaw)) {
        return jsonError("Некорректный userId", 400);
      }
      const studentUserId = Number(studentUserIdRaw);
      const actor = { id: actorId, role };

      if (teacherList) {
        const attempts = await findStudentsWithAttemptsByLessonIdForTeacher(
          lessonId,
          actor,
          limit ? Number(limit) : undefined,
          offset ? Number(offset) : undefined,
        );
        return NextResponse.json(attempts, { status: 200 });
      }

      if (latestOnly) {
        const attempt = await getLatestSubmittedAttemptForTeacher(
          lessonId,
          studentUserId,
          actor,
        );
        return NextResponse.json(attempt, { status: 200 });
      }

      const attempts = await findTestAttemptsByLessonIdForTeacher(
        lessonId,
        studentUserId,
        actor,
      );
      if (!attempts || attempts.length === 0) {
        return jsonError("Попытки не найдены", 404);
      }
      return NextResponse.json(attempts, { status: 200 });
    }

    const attempts = await findTestAttemptsByLessonId(lessonId, actorId);
    if (!attempts || attempts.length === 0) {
      return jsonError("Попытки не найдены", 404);
    }
    return NextResponse.json(attempts, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Урок не найден" ||
        error.message === "Завершённая попытка не найдена"
      ) {
        return jsonError(error.message, 404);
      }
      if (
        error.message === "Нет доступа к проверке теста" ||
        error.message === "Урок не является тестом"
      ) {
        return jsonError(error.message, 403);
      }
    }
    return prismaErrorResponse(error, "Попытки теста");
  }
}
