import type { CourseReview, EnrollmentStatus, Role } from "@prisma/client";

import {
  asRequiredId,
  asRequiredInt,
  asRequiredString,
  requireObject,
} from "@/app/lib/api";
import { prisma } from "@/app/lib/prisma";
import { createNotification, sendEmailNotification } from "./notifications";
import { NotificationType } from "./models";

const REVIEW_STATUSES = new Set<EnrollmentStatus>([
  "enrolled",
  "in_progress",
  "completed",
]);

export type ReviewCreateData = {
  courseId: number;
  rating: number;
  comment: string;
};

export type ReviewDto = CourseReview & {
  user: {
    id: number;
    name: string;
    surname: string;
    patronymic: string | null;
    role: string;
  };
};

const reviewUserSelect = {
  id: true,
  name: true,
  surname: true,
  patronymic: true,
  role: true,
} as const;

const REVIEW_LIST_LIMIT = 20;

export function parseReviewBody(body: unknown): ReviewCreateData {
  const raw = requireObject(body);
  const courseId = asRequiredId(raw.courseId, "courseId");
  const rating = asRequiredInt(raw.rating, "rating", 1);
  if (rating > 5) {
    throw new Error("Рейтинг должен быть от 1 до 5", { cause: "invalid" });
  }
  const comment = asRequiredString(raw.comment, "comment");
  if (comment.length > 500) {
    throw new Error("Комментарий должен быть не более 500 символов", {
      cause: "invalid",
    });
  }
  return { courseId, rating, comment };
}

export async function findOwnCourseReview(
  userId: number,
  courseId: number,
): Promise<CourseReview | null> {
  return prisma.courseReview.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
}

/** Последние отзывы курса для карусели (по умолчанию до 20). */
export async function listCourseReviews(
  courseId: number,
  limit = REVIEW_LIST_LIMIT,
): Promise<ReviewDto[]> {
  const take = Math.min(Math.max(1, limit), REVIEW_LIST_LIMIT);
  return prisma.courseReview.findMany({
    where: { courseId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: { select: reviewUserSelect },
    },
  });
}

export async function saveCourseReview(
  userId: number,
  data: ReviewCreateData,
): Promise<CourseReview> {
  const course = await prisma.course.findFirst({
    where: { id: data.courseId, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
  if (!course) {
    throw new Error("Курс не найден", { cause: "not_found" });
  }

  const enrollment = await prisma.userCourse.findUnique({
    where: { userId_courseId: { userId, courseId: data.courseId } },
    select: { status: true },
  });
  if (!enrollment || !REVIEW_STATUSES.has(enrollment.status)) {
    throw new Error("Оставить отзыв можно после записи на курс", {
      cause: "no_access",
    });
  }

  return prisma.$transaction(async (tx) => {
    const review = await tx.courseReview.upsert({
      where: { userId_courseId: { userId, courseId: data.courseId } },
      create: {
        userId,
        courseId: data.courseId,
        rating: data.rating,
        comment: data.comment,
      },
      update: {
        rating: data.rating,
        comment: data.comment,
      },
    });

    const aggregate = await tx.courseReview.aggregate({
      where: { courseId: data.courseId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.course.update({
      where: { id: data.courseId },
      data: {
        rating: aggregate._avg.rating,
        ratingCount: aggregate._count._all,
      },
    });

    const adminUsers = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });

    for (const adminUser of adminUsers) {
      await createNotification(
        adminUser.id,
        NotificationType.course_review,
        "Новый отзыв",
        "Пользователь оставил отзыв на курс " + course.name,
        "course",
        course.id,
      );
      try {
        await sendEmailNotification(adminUser.id, {
          title: "Новый отзыв",
          body: "Пользователь оставил отзыв на курс " + course.name,
          url: '/course/' + course.slug,
          label: 'Открыть курс'
        });
      } catch (error) {
        console.error("Error sending email notification:", error);
      }
    }

    return review;
  });
}

/** Удаляет отзыв: автор или администратор. Пересчитывает рейтинг курса. */
export async function deleteCourseReview(
  reviewId: number,
  actor: { id: number; role: Role },
): Promise<{ ok: true; courseId: number }> {
  const review = await prisma.courseReview.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, courseId: true },
  });
  if (!review) {
    throw new Error("Отзыв не найден", { cause: "not_found" });
  }

  const isAuthor = review.userId === actor.id;
  const isAdmin = actor.role === "admin";
  if (!isAuthor && !isAdmin) {
    throw new Error("Нет прав на удаление отзыва", { cause: "no_access" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.courseReview.delete({ where: { id: review.id } });

    const aggregate = await tx.courseReview.aggregate({
      where: { courseId: review.courseId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.course.update({
      where: { id: review.courseId },
      data: {
        rating: aggregate._count._all > 0 ? aggregate._avg.rating : null,
        ratingCount: aggregate._count._all,
      },
    });
  });

  return { ok: true, courseId: review.courseId };
}
