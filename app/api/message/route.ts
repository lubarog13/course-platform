import { type NextRequest, NextResponse } from "next/server";

import { jsonError, prismaErrorResponse } from "@/app/lib/api";
import {
  createMessage,
  listConversations,
  listMessagesWithPeer,
  markThreadRead,
  parseMessageCreateBody,
  parseOptionalPeerId,
} from "@/app/lib/messages";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/message
 * Без query — список диалогов.
 * ?receiverId=N&limit=&beforeId= — сообщения с пользователем N
 *   (по умолчанию помечает входящие прочитанными; markRead=0 чтобы отключить).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Не авторизован", 401);
    }

    const viewerId = Number(session.user.id);
    const peerId = parseOptionalPeerId(
      request.nextUrl.searchParams.get("receiverId"),
    );

    if (peerId != null) {
      const markRead =
        request.nextUrl.searchParams.get("markRead") !== "0";
      const limitRaw = request.nextUrl.searchParams.get("limit");
      const beforeIdRaw = request.nextUrl.searchParams.get("beforeId");
      const limit =
        limitRaw && /^\d+$/.test(limitRaw) ? Number(limitRaw) : undefined;
      const beforeId =
        beforeIdRaw && /^\d+$/.test(beforeIdRaw)
          ? Number(beforeIdRaw)
          : null;

      if (markRead && beforeId == null) {
        await markThreadRead(viewerId, peerId);
      }
      const result = await listMessagesWithPeer(viewerId, peerId, {
        limit,
        beforeId,
      });
      return NextResponse.json(result);
    }

    const conversations = await listConversations(viewerId);
    return NextResponse.json({ conversations });
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "not_found") {
        return jsonError(error.message, 404);
      }
      if (error.cause === "invalid") {
        return jsonError(error.message, 400);
      }
    }
    return prismaErrorResponse(error, "Сообщения");
  }
}

/** POST /api/message — { receiverId, content, attachmentIds? } */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Не авторизован", 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Некорректный JSON", 400);
    }

    const data = parseMessageCreateBody(body);
    const message = await createMessage(Number(session.user.id), data);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "not_found") {
        return jsonError(error.message, 404);
      }
      if (error.cause === "invalid") {
        return jsonError(error.message, 400);
      }
    }
    return prismaErrorResponse(error, "Сообщение");
  }
}
