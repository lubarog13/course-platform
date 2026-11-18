import { type NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";

import { jsonError, prismaErrorResponse } from "@/app/lib/api";
import {
  createDeadlineExtensionRequest,
  findCurrentDeadlineExtensionRequest,
  listDeadlineExtensionRequests,
  parseDeadlineExtensionBody,
} from "@/app/lib/deadlineExtension";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/deadline-extension
 * - ?courseId= | ?coursePartId= — текущая заявка студента
 * - без них (admin/teacher) — пагинированный список (?page&limit&order&sort)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return jsonError("Не авторизован", 401);
    }

    const courseIdRaw = request.nextUrl.searchParams.get("courseId");
    const coursePartIdRaw = request.nextUrl.searchParams.get("coursePartId");
    const courseId = courseIdRaw ? Number(courseIdRaw) : undefined;
    const coursePartId = coursePartIdRaw ? Number(coursePartIdRaw) : undefined;
    const hasTarget = courseId != null || coursePartId != null;

    if (hasTarget) {
      if (courseId != null && (!Number.isInteger(courseId) || courseId <= 0)) {
        return jsonError("Некорректный courseId", 400);
      }
      if (
        coursePartId != null &&
        (!Number.isInteger(coursePartId) || coursePartId <= 0)
      ) {
        return jsonError("Некорректный coursePartId", 400);
      }
      if ((courseId != null) === (coursePartId != null)) {
        return jsonError(
          "Укажите ровно одно из полей: courseId или coursePartId",
          400,
        );
      }

      const extensionRequest = await findCurrentDeadlineExtensionRequest(
        Number(session.user.id),
        {
          ...(courseId != null ? { courseId } : {}),
          ...(coursePartId != null ? { coursePartId } : {}),
        },
      );

      return NextResponse.json({ request: extensionRequest });
    }

    const list = await listDeadlineExtensionRequests(
      {
        id: Number(session.user.id),
        role: session.user.role as Role,
      },
      {
        page: request.nextUrl.searchParams.get("page"),
        limit: request.nextUrl.searchParams.get("limit"),
        order: request.nextUrl.searchParams.get("order"),
        sort: request.nextUrl.searchParams.get("sort"),
      },
    );
    return NextResponse.json(list);
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "invalid") return jsonError(error.message, 400);
      if (error.cause === "no_access") return jsonError(error.message, 403);
    }
    return prismaErrorResponse(error, "Заявка на продление");
  }
}

/** POST /api/deadline-extension — { courseId | coursePartId, reason, requestedDays } */
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

    const data = parseDeadlineExtensionBody(body);
    const extensionRequest = await createDeadlineExtensionRequest(
      Number(session.user.id),
      data,
    );
    return NextResponse.json({ request: extensionRequest }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "invalid") return jsonError(error.message, 400);
      if (error.cause === "not_found") return jsonError(error.message, 404);
      if (error.cause === "no_access") return jsonError(error.message, 403);
      if (error.cause === "conflict") return jsonError(error.message, 409);
    }
    return prismaErrorResponse(error, "Заявка на продление");
  }
}
