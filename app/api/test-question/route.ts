import { type NextRequest, NextResponse } from "next/server";

import { jsonError, prismaErrorResponse } from "@/app/lib/api";
import {
  findTestQuestion,
  listTestQuestions,
  parseTestQuestionBody,
} from "@/app/lib/lessons";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const lessonIdRaw = request.nextUrl.searchParams.get("lessonId");
  if (!lessonIdRaw || !/^\d+$/.test(lessonIdRaw)) {
    return jsonError("Нужен query-параметр lessonId", 400);
  }

  const includeCorrect =
    request.nextUrl.searchParams.get("includeCorrect") === "1";

  try {
    const questions = await listTestQuestions(
      Number(lessonIdRaw),
      includeCorrect,
    );
    return NextResponse.json(questions);
  } catch (error) {
    return prismaErrorResponse(error, "Вопрос");
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
    const data = parseTestQuestionBody(body, "create");
    if (
      !data.lessonId ||
      !data.question ||
      !data.type ||
      data.sortOrder === undefined
    ) {
      return jsonError("Нужны lessonId, question, type и sortOrder", 400);
    }

    const lesson = await prisma.lesson.findFirst({
      where: { id: data.lessonId, deletedAt: null, type: "test" },
      select: { id: true },
    });
    if (!lesson) {
      return jsonError("Урок-тест не найден", 404);
    }

    const question = await prisma.testQuestion.create({
      data: {
        lessonId: data.lessonId,
        question: data.question,
        type: data.type,
        score: data.score ?? 1,
        sortOrder: data.sortOrder,
        ...(data.options?.length
          ? {
              options: {
                create: data.options.map((option) => ({
                  text: option.text,
                  isCorrect: option.isCorrect,
                  sortOrder: option.sortOrder,
                })),
              },
            }
          : {}),
      },
    });

    const full = await findTestQuestion(question.id, true);
    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Вопрос");
  }
}
