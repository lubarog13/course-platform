import { type NextRequest, NextResponse } from "next/server";

import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import {
  findLesson,
  lessonRecordFields,
  parseLessonBody,
  replaceLessonQuestions,
} from "@/app/lib/lessons";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const includeCorrect =
      request.nextUrl.searchParams.get("includeCorrect") === "1";
    const lesson = await findLesson(parseNumericId(id), includeCorrect);
    if (!lesson) {
      return jsonError("Урок не найден", 404);
    }
    return NextResponse.json(lesson);
  } catch (error) {
    return prismaErrorResponse(error, "Урок");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const lessonId = parseNumericId(id);
    const existing = await findLesson(lessonId, true);
    if (!existing) {
      return jsonError("Урок не найден", 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Некорректный JSON", 400);
    }

    const data = parseLessonBody(body, "update");
    const fields = lessonRecordFields(data);
    const nextType = data.type ?? existing.type;

    if (data.testQuestions !== undefined && nextType !== "test") {
      return jsonError("Поле testQuestions допустимо только для type=test", 400);
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(fields).length > 0 || data.published !== undefined) {
        await tx.lesson.update({
          where: { id: lessonId },
          data: {
            ...fields,
            ...(data.published !== undefined
              ? { publishedAt: data.published ? new Date() : null }
              : {}),
          },
        });
      }

      if (nextType === "test" && data.testQuestions !== undefined) {
        await replaceLessonQuestions(lessonId, data.testQuestions, tx);
      }

      if (nextType !== "test" && existing.type === "test") {
        await replaceLessonQuestions(lessonId, [], tx);
      }
    });

    const full = await findLesson(lessonId, true);
    return NextResponse.json(full);
  } catch (error) {
    return prismaErrorResponse(error, "Урок");
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return PATCH(request, context);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const lessonId = parseNumericId(id);
    const existing = await findLesson(lessonId, true);
    if (!existing) {
      return jsonError("Урок не найден", 404);
    }

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ id: lessonId, deletedAt: new Date() });
  } catch (error) {
    return prismaErrorResponse(error, "Урок");
  }
}
