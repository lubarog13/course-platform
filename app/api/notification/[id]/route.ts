import { jsonError, prismaErrorResponse } from "@/app/lib/api";
import { markNotificationAsRead } from "@/app/lib/notifications";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

import { parseNumericId } from "@/app/lib/api";
type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Не авторизован", 401);
    }

    const { id } = await params;
    const notificationId = parseNumericId(id);
    const notification = await markNotificationAsRead(notificationId);
    return NextResponse.json(notification);
    } catch (error) {
        return prismaErrorResponse(error, "Уведомление");
    }
}