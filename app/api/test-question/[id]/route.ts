import { type NextRequest, NextResponse } from "next/server";

import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import {
  findTestQuestion,
  parseTestQuestionBody,
  replaceQuestionOptions,
} from "@/app/lib/lessons";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const includeCorrect =
      request.nextUrl.searchParams.get("includeCorrect") !== "0";
    const question = await findTestQuestion(
      parseNumericId(id),
      includeCorrect,
    );
    if (!question) {
      return jsonError("Вопрос не найден", 404);
    }
    return NextResponse.json(question);
  } catch (error) {
    return prismaErrorResponse(error, "Вопрос");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const questionId = parseNumericId(id);
    const existing = await findTestQuestion(questionId, true);
    if (!existing) {
      return jsonError("Вопрос не найден", 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Некорректный JSON", 400);
    }

    const data = parseTestQuestionBody(body, "update");
    const { options, ...fields } = data;

    if (Object.keys(fields).length > 0) {
      await prisma.testQuestion.update({
        where: { id: questionId },
        data: fields,
      });
    }

    if (options !== undefined) {
      const type = data.type ?? existing.type;
      if (type === "text") {
        await prisma.testQuestionOption.deleteMany({
          where: { questionId },
        });
      } else {
        await replaceQuestionOptions(questionId, options);
      }
    }

    const full = await findTestQuestion(questionId, true);
    return NextResponse.json(full);
  } catch (error) {
    return prismaErrorResponse(error, "Вопрос");
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return PATCH(request, context);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const questionId = parseNumericId(id);
    const existing = await findTestQuestion(questionId, true);
    if (!existing) {
      return jsonError("Вопрос не найден", 404);
    }

    await prisma.testQuestion.delete({ where: { id: questionId } });
    return NextResponse.json({ id: questionId, deleted: true });
  } catch (error) {
    return prismaErrorResponse(error, "Вопрос");
  }
}
