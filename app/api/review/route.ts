import { type NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";

import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import {
  deleteCourseReview,
  findOwnCourseReview,
  listCourseReviews,
  parseReviewBody,
  saveCourseReview,
} from "@/app/lib/reviews";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/review?courseId=
 * Список последних отзывов (до 20). Для авторизованного пользователя —
 * ещё и его отзыв в поле review (или null).
 */
export async function GET(request: NextRequest) {
  try {
    const courseId = Number(request.nextUrl.searchParams.get("courseId"));
    if (!Number.isInteger(courseId) || courseId <= 0) {
      return jsonError("Некорректный courseId", 400);
    }

    const session = await auth();
    const reviews = await listCourseReviews(courseId);

    if (!session?.user?.id) {
      return NextResponse.json({ reviews, review: null });
    }

    const review = await findOwnCourseReview(Number(session.user.id), courseId);
    return NextResponse.json({ reviews, review });
  } catch (error) {
    return prismaErrorResponse(error, "Отзыв");
  }
}

/** POST /api/review — { courseId, rating, comment }. Повторная отправка обновляет свой отзыв. */
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

    const data = parseReviewBody(body);
    const review = await saveCourseReview(Number(session.user.id), data);
    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "not_found") return jsonError(error.message, 404);
      if (error.cause === "no_access") return jsonError(error.message, 403);
      if (error.cause === "invalid") return jsonError(error.message, 400);
    }
    return prismaErrorResponse(error, "Отзыв");
  }
}

/**
 * DELETE /api/review?id=
 * Удаляет отзыв. Разрешено автору или администратору.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return jsonError("Не авторизован", 401);
    }

    const idParam = request.nextUrl.searchParams.get("id");
    if (!idParam) {
      return jsonError("Нужен id отзыва", 400);
    }

    const result = await deleteCourseReview(parseNumericId(idParam), {
      id: Number(session.user.id),
      role: session.user.role as Role,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "not_found") return jsonError(error.message, 404);
      if (error.cause === "no_access") return jsonError(error.message, 403);
      if (error.cause === "invalid") return jsonError(error.message, 400);
    }
    return prismaErrorResponse(error, "Отзыв");
  }
}
