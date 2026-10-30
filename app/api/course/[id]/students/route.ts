import { type NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";

import { jsonError, prismaErrorResponse } from "@/app/lib/api";
import { listCourseStudentsForTeacher } from "@/app/lib/enrollment";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/course/[id]/students
 * Список студентов курса с общим прогрессом и дедлайном (преподаватель/админ).
 * ?limit=&offset=
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return jsonError("Не авторизован", 401);
    }

    const { id } = await params;
    const limitRaw = request.nextUrl.searchParams.get("limit");
    const offsetRaw = request.nextUrl.searchParams.get("offset");
    const limit =
      limitRaw && /^\d+$/.test(limitRaw) ? Math.min(100, Number(limitRaw)) : 20;
    const offset =
      offsetRaw && /^\d+$/.test(offsetRaw) ? Number(offsetRaw) : 0;

    const page = await listCourseStudentsForTeacher(
      id,
      { id: Number(session.user.id), role: session.user.role as Role },
      limit,
      offset,
    );
    return NextResponse.json(page);
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "not_found") {
        return jsonError(error.message, 404);
      }
      if (error.cause === "no_access") {
        return jsonError(error.message, 403);
      }
    }
    return prismaErrorResponse(error, "Студенты курса");
  }
}
