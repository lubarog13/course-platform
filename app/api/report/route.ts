import { type NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";

import { auth } from "@/auth";
import { jsonError, prismaErrorResponse } from "@/app/lib/api";
import {
  createReportMessage,
  parseReportMessageCreateBody,
} from "@/app/lib/messages";
import {
  createNotification,
  sendEmailNotification,
} from "@/app/lib/notifications";

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    let data;
    try {
      data = parseReportMessageCreateBody(body);
    } catch (error) {
      if (error instanceof Error && error.cause === "invalid") {
        return jsonError(error.message, 400);
      }
      throw error;
    }
    if (!data) {
      return jsonError("Некорректные данные", 400);
    }

    const messages = await createReportMessage(Number(session.user.id), data);
    const reporterName = session.user.name ?? "Пользователь";

    for (const message of messages) {
      await createNotification(
        message.receiverId,
        NotificationType.new_message,
        "Новая жалоба",
        `${reporterName} отправил(а) жалобу`,
        "message",
        message.id,
      );
      try {
        await sendEmailNotification(message.receiverId, {
          title: "Новая жалоба",
          body: `${reporterName} отправил(а) жалобу на платформе`,
          url: `/user/messages?receiverId=${session.user.id}`,
          label: "Открыть переписку",
        });
      } catch (error) {
        console.error("Error sending report email notification:", error);
      }
    }

    return NextResponse.json(messages, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "not_found") {
        return jsonError(error.message, 404);
      }
      if (error.cause === "invalid") {
        return jsonError(error.message, 400);
      }
    }
    return prismaErrorResponse(error, "Жалоба");
  }
}
