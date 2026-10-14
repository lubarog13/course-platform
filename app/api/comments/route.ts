import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError, prismaErrorResponse } from "@/app/lib/api";
import {
  assertCanAccessLessonComments,
  createComment,
  findComment,
  listComments,
  parseCreateCommentBody,
} from "@/app/lib/comments";
import type { Role } from "@prisma/client";
import { createNotification } from "@/app/lib/notifications";
import { NotificationType, NotificationEntityType } from "@prisma/client";
import { getInstructors } from "@/app/lib/comments";


export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return jsonError("Не авторизован", 401);
    }

    const { searchParams } = request.nextUrl;
    const lessonId = Number(searchParams.get("lessonId"));
    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return jsonError("Некорректный lessonId", 400);
    }

    const parentRaw = searchParams.get("parentId");
    const parentId =
      parentRaw === null || parentRaw === ""
        ? null
        : Number(parentRaw);
    if (parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) {
      return jsonError("Некорректный parentId", 400);
    }

    const actor = {
      id: Number(session.user.id),
      role: session.user.role as Role,
    };
    const access = await assertCanAccessLessonComments(lessonId, actor);
    const result = await listComments(
      lessonId,
      parentId,
      searchParams.get("limit"),
      searchParams.get("offset"),
    );

    return NextResponse.json({
      ...result,
      teacherIds: access.teacherIds,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "not_found") return jsonError(error.message, 404);
      if (error.cause === "no_access") return jsonError(error.message, 403);
      if (error.cause === "invalid") return jsonError(error.message, 400);
    }
    return prismaErrorResponse(error, "Комментарий");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return jsonError("Не авторизован", 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Некорректный JSON", 400);
    }

    const data = parseCreateCommentBody(body);
    const comment = await createComment(
      {
        id: Number(session.user.id),
        role: session.user.role as Role,
      },
      data,
    );
    if (comment.parentId) {
      const parentComment = await findComment(comment.parentId, 50, 0);
      if (parentComment) {
        await createNotification(parentComment.userId, NotificationType.lesson_comment, "Ответ на комментарий", "Пользователь " + session.user.name + " ответил на комментарий ", NotificationEntityType.lesson, comment.lessonId);
      }
    }
    else {
      const instructors = await getInstructors(comment.lessonId);
      if (instructors && instructors.length > 0) {
        for (const instructorId of instructors) {
          await createNotification(instructorId, NotificationType.lesson_comment, "Новый комментарий", "Пользователь " + session.user.name + " оставил комментарий на урок " + comment.lessonId, NotificationEntityType.lesson, comment.lessonId);
        }
      }
    }


    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "not_found") return jsonError(error.message, 404);
      if (error.cause === "no_access") return jsonError(error.message, 403);
      if (error.cause === "invalid") return jsonError(error.message, 400);
    }
    return prismaErrorResponse(error, "Комментарий");
  }
}
