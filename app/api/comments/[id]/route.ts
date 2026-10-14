import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import {
  assertCanAccessLessonComments,
  deleteComment,
  findComment,
  parseUpdateCommentBody,
  updateComment,
} from "@/app/lib/comments";
import type { Role } from "@prisma/client";


export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string, limit?: string, offset?: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return jsonError("Не авторизован", 401);
    }

    const { id, limit, offset } = await params;
    const comment = await findComment(parseNumericId(id), parseInt(limit ?? "50"), parseInt(offset ?? "0"));
    if (!comment) {
      return jsonError("Комментарий не найден", 404);
    }

    await assertCanAccessLessonComments(comment.lessonId, {
      id: Number(session.user.id),
      role: session.user.role as Role,
    });

    const { lesson: _lesson, ...rest } = comment;
    return NextResponse.json({
      ...rest,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      deletedAt: comment.deletedAt?.toISOString() ?? null,
      replies: comment.replies.map((reply) => ({
        ...reply,
        createdAt: reply.createdAt.toISOString(),
        updatedAt: reply.updatedAt.toISOString(),
        deletedAt: reply.deletedAt?.toISOString() ?? null,
      })),
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

    const data = parseUpdateCommentBody(body);
    const comment = await updateComment(
      parseNumericId(id),
      {
        id: Number(session.user.id),
        role: session.user.role as Role,
      },
      data,
    );

    return NextResponse.json(comment);
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "not_found") return jsonError(error.message, 404);
      if (error.cause === "no_access") return jsonError(error.message, 403);
      if (error.cause === "invalid") return jsonError(error.message, 400);
    }
    return prismaErrorResponse(error, "Комментарий");
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return jsonError("Не авторизован", 401);
    }

    const { id } = await params;
    const result = await deleteComment(parseNumericId(id), {
      id: Number(session.user.id),
      role: session.user.role as Role,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "not_found") return jsonError(error.message, 404);
      if (error.cause === "no_access") return jsonError(error.message, 403);
      if (error.cause === "invalid") return jsonError(error.message, 400);
    }
    return prismaErrorResponse(error, "Комментарий");
  }
}
