import { type NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";

import { auth } from "@/auth";
import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import {
  findTestAttempt,
  getTestAttemptForReview,
  parseTeacherGradeBody,
  parseTestAttemptAnswersBody,
  saveTeacherTestScores,
  saveTestAttemptAnswers,
} from "@/app/lib/lessons";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/test-attempt/[id] — своя попытка с разбором (если завершена). */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Не авторизован", 401);
    }

    const { id } = await params;
    const attemptId = parseNumericId(id);
    const userId = Number(session.user.id);

    try {
      const reviewed = await getTestAttemptForReview(attemptId, userId);
      return NextResponse.json(reviewed);
    } catch (error) {
      if (error instanceof Error && error.message === "Попытка ещё не завершена") {
        const attempt = await findTestAttempt(attemptId, null, userId);
        return NextResponse.json(attempt);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Попытка не найдена") {
        return jsonError(error.message, 404);
      }
      if (
        error.message === "Просмотр ответов отключён" ||
        error.message === "Урок не является тестом"
      ) {
        return jsonError(error.message, 400);
      }
    }
    return prismaErrorResponse(error, "Попытка теста");
  }
}

/**
 * PATCH /api/test-attempt/[id]
 * Студент: { answers, submit? } — только если submittedAt ещё null.
 * Преподаватель: { scores: [{ questionId, score }] } — ручная оценка завершённой попытки.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return jsonError("Не авторизован", 401);
    }

    const { id } = await params;
    const attemptId = parseNumericId(id);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Некорректный JSON", 400);
    }

    const isTeacherGrade =
      body !== null &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      "scores" in body;

    if (isTeacherGrade) {
      const data = parseTeacherGradeBody(body);
      const attempt = await saveTeacherTestScores(
        attemptId,
        { id: Number(session.user.id), role: session.user.role as Role },
        data,
      );
      return NextResponse.json(attempt);
    }

    const data = parseTestAttemptAnswersBody(body);
    const attempt = await saveTestAttemptAnswers(
      attemptId,
      Number(session.user.id),
      data,
    );
    return NextResponse.json(attempt);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Попытка не найдена") {
        return jsonError(error.message, 404);
      }
      if (error.message === "Нет доступа к проверке теста") {
        return jsonError(error.message, 403);
      }
      if (
        error.message === "Попытка уже отправлена, ответы изменить нельзя" ||
        error.message === "Урок не является тестом" ||
        error.message === "Срок сдачи части курса истёк" ||
        error.message === "Нельзя оценить незавершённую попытку" ||
        error.message.startsWith("Вопрос ") ||
        error.message.startsWith("Для ") ||
        error.message.startsWith("Вариант ") ||
        error.message.startsWith("Баллы за вопрос ") ||
        error.message.startsWith("Поле ") ||
        error.message.startsWith("scores[")
      ) {
        return jsonError(error.message, 400);
      }
    }
    return prismaErrorResponse(error, "Попытка теста");
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return PATCH(request, context);
}
