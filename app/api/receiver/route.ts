import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { jsonError, prismaErrorResponse } from "@/app/lib/api";
import { listPossibleReceivers } from "@/app/lib/messages";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Не авторизован", 401);
    }
    const receivers = await listPossibleReceivers(Number(session.user.id));
    return NextResponse.json(receivers);
  } catch (error) {
    return prismaErrorResponse(error, "Получатели");
  }
}