import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import { startTestAttempt } from "@/app/lib/lessons";

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
        error.message === "Исчерпано максимальное число попыток"
      ) {
        return jsonError(error.message, 400);
      }
    }
    return prismaErrorResponse(error, "Попытка теста");
  }
}
