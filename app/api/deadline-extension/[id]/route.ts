import { type NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";

import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import {
  parseDeadlineExtensionStatusBody,
  updateDeadlineExtensionStatus,
} from "@/app/lib/deadlineExtension";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/deadline-extension/[id] — { status } */
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

    const data = parseDeadlineExtensionStatusBody(body);
    const updated = await updateDeadlineExtensionStatus(
      parseNumericId(id),
      { id: Number(session.user.id), role: session.user.role as Role },
      data,
    );
    return NextResponse.json({ request: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "invalid") return jsonError(error.message, 400);
      if (error.cause === "not_found") return jsonError(error.message, 404);
      if (error.cause === "no_access") return jsonError(error.message, 403);
    }
    return prismaErrorResponse(error, "Заявка на продление");
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return PATCH(request, context);
}
