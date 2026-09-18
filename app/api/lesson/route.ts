import { type NextRequest, NextResponse } from "next/server";

import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import { findLesson, listLessons, parseLessonBody } from "@/app/lib/lessons";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const coursePartIdRaw = request.nextUrl.searchParams.get("coursePartId");
  if (!coursePartIdRaw || !/^\d+$/.test(coursePartIdRaw)) {
    return jsonError("Нужен query-параметр coursePartId", 400);
  }

  try {
    const lessons = await listLessons(Number(coursePartIdRaw));
    return NextResponse.json(lessons);
  } catch (error) {
    return prismaErrorResponse(error, "Урок");
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
    const data = parseLessonBody(body, "create");
    if (!data.coursePartId || !data.name || data.sortOrder === undefined || !data.type) {
      return jsonError("Нужны coursePartId, name, sortOrder и type", 400);
    }

    const part = await prisma.coursePart.findFirst({
      where: { id: data.coursePartId, deletedAt: null },
      select: { id: true },
    });
    if (!part) {
      return jsonError("Часть курса не найдена", 404);
    }

    const conflict = await prisma.lesson.findFirst({
      where: {
        coursePartId: data.coursePartId,
        sortOrder: data.sortOrder,
        deletedAt: null,
      },
      select: { id: true },
    });

    const lesson = await prisma.$transaction(async (tx) => {
      if (conflict) {
        const toShift = await tx.lesson.findMany({
          where: {
            coursePartId: data.coursePartId,
            deletedAt: null,
            sortOrder: { gte: data.sortOrder },
          },
          orderBy: { sortOrder: "desc" },
          select: { id: true, sortOrder: true },
        });

        for (const item of toShift) {
          await tx.lesson.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder + 1 },
          });
        }
      }

      return tx.lesson.create({
        data: {
          coursePartId: data.coursePartId,
          name: data.name ?? "",
          description: data.description,
          sortOrder: data.sortOrder || 0,
          type: data.type || "text",
          textContent: data.textContent,
          videoId: data.videoId,
          attachmentId: data.attachmentId,
          points: data.points ?? 0,
          durationSeconds: data.durationSeconds,
          timeLimitSeconds: data.timeLimitSeconds,
          passingScore: data.passingScore,
          reviewEnabled: data.reviewEnabled ?? true,
          manualGrading: data.manualGrading ?? false,
          maxAttempts: data.maxAttempts,
          publishedAt: data.published ? new Date() : null,
        },
      });
    });

    const full = await findLesson(lesson.id, true);
    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Урок");
  }
}
