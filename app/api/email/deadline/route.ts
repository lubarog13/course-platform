import { NextResponse, type NextRequest } from "next/server";

import { jsonError } from "@/app/lib/api";
import { notifyDeadlineReminders } from "@/app/lib/notifications";

function parseDaysParam(value: string | null): number[] | null {
  if (value == null || value.trim() === "") {
    return [0, 1, 3];
  }
  const days = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number(part));
  if (days.some((day) => !Number.isInteger(day) || day < -30 || day > 30)) {
    return null;
  }
  return days;
}

function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const cronHeader = request.headers.get("x-cron-secret");
  return cronHeader === secret;
}

/**
 * Cron: уведомления о дедлайнах частей курса (in-app + email).
 * Authorization: Bearer $CRON_SECRET или заголовок x-cron-secret.
 * Query: days=0,1,3 (дней до дедлайна), dryRun=1 — только подсчёт.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return jsonError("Не авторизован", 401);
  }

  const days = parseDaysParam(request.nextUrl.searchParams.get("days"));
  if (!days) {
    return jsonError(
      "Параметр days должен быть списком целых чисел от -30 до 30, например days=0,1,3",
      400,
    );
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const result = await notifyDeadlineReminders(days, { dryRun });
    return NextResponse.json({ ok: true, dryRun, ...result });
  } catch (error) {
    console.error("POST /api/email/deadline:", error);
    return jsonError("Не удалось отправить уведомления о дедлайнах", 500);
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
