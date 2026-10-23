import { jsonError } from "@/app/lib/api";
import { getNotificationCount, getNotifications } from "@/app/lib/notifications";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Не авторизован", 401);
  }
  const userId = Number(session.user.id);

  if (searchParams.get("count") === "1") {
    const count = await getNotificationCount(userId, true);
    return NextResponse.json({ count });
  }

  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const notifications = await getNotifications(userId, Number(limit), Number(offset));
  return NextResponse.json(notifications);
}