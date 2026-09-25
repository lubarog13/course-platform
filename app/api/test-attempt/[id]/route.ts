import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import {
  findTestAttempt,
  parseTestAttemptAnswersBody,
  saveTestAttemptAnswers,
} from "@/app/lib/lessons";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/test-attempt/[id] — своя попытка с ответами. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Не авторизован", 401);
    }

    const { id } = await params;
    const attemptId = parseNumericId(id);
    const attempt = await findTestAttempt(attemptId, Number(session.user.id));
    if (!attempt) {
      return jsonError("Попытка не найдена", 404);
    }
    return NextResponse.json(attempt);
  } catch (error) {
    return prismaErrorResponse(error, "Попытка теста");
  }
}

/**
 * PATCH /api/test-attempt/[id]
 * Сохраняет ответы, только если submittedAt ещё null.
 * Body: { answers: [{ questionId, optionIds?, answerText?, answerFileId? }], submit?: boolean }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
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
      if (
        error.message === "Попытка уже отправлена, ответы изменить нельзя" ||
        error.message === "Урок не является тестом" ||
        error.message.startsWith("Вопрос ") ||
        error.message.startsWith("Для ") ||
        error.message.startsWith("Вариант ")
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
