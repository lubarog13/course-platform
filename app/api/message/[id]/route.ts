import { type NextRequest, NextResponse } from "next/server";

import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import {
  deleteMessage,
  findMessageForActor,
  parseMessageUpdateBody,
  updateMessage,
} from "@/app/lib/messages";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/message/[id] — одно сообщение (участник диалога). */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Не авторизован", 401);
    }

    const { id } = await params;
    const actorId = Number(session.user.id);
    const message = await findMessageForActor(parseNumericId(id), actorId);

    const deletedForViewer =
      (message.senderId === actorId && message.deletedBySenderAt != null) ||
      (message.receiverId === actorId && message.deletedByReceiverAt != null);

    return NextResponse.json({
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: deletedForViewer ? "" : message.content,
      sentAt: message.sentAt,
      read: message.read,
      deletedBySenderAt: message.deletedBySenderAt,
      deletedByReceiverAt: message.deletedByReceiverAt,
      sender: message.sender,
      receiver: message.receiver,
      attachments: deletedForViewer
        ? []
        : message.attachments.map((item) => item.file),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "not_found" || error.cause === "invalid") {
        return jsonError(
          error.message,
          error.cause === "not_found" ? 404 : 400,
        );
      }
    }
    return prismaErrorResponse(error, "Сообщение");
  }
}

/**
 * PATCH /api/message/[id]
 * Разрешено только: { deleted: true } или { read: true }.
 * Редактирование текста запрещено.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Не авторизован", 401);
    }

    const { id } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Некорректный JSON", 400);
    }

    const data = parseMessageUpdateBody(body);
    const message = await updateMessage(
      parseNumericId(id),
      Number(session.user.id),
      data,
    );
    return NextResponse.json(message);
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "not_found") {
        return jsonError(error.message, 404);
      }
      if (error.cause === "no_access") {
        return jsonError(error.message, 403);
      }
      if (error.cause === "invalid") {
        return jsonError(error.message, 400);
      }
    }
    return prismaErrorResponse(error, "Сообщение");
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return PATCH(request, context);
}

/** DELETE /api/message/[id] — мягкое удаление для текущего участника. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Не авторизован", 401);
    }

    const { id } = await params;
    const message = await deleteMessage(
      parseNumericId(id),
      Number(session.user.id),
    );
    return NextResponse.json(message);
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "not_found") {
        return jsonError(error.message, 404);
      }
      if (error.cause === "no_access") {
        return jsonError(error.message, 403);
      }
      if (error.cause === "invalid") {
        return jsonError(error.message, 400);
      }
    }
    return prismaErrorResponse(error, "Сообщение");
  }
}
