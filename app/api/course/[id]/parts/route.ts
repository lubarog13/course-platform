import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { coursePartsFromSql } from "@/app/lib/courseParts";
import { prisma } from "@/app/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

type CoursePartsSqlRow = {
  course_id: number;
  course_name: string;
  course_progress: number | null;
  course_status: string | null;
  course_part_id: number;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  deadline_days: number | null;
  part_completed: boolean | null;
  part_progress: number | null;
  part_deadline: Date | null;
  lesson_id: number | null;
  lesson_name: string | null;
  lesson_description: string | null;
  lesson_sort_order: number | null;
  lesson_type: string | null;
  lesson_points: number | null;
  lesson_duration_seconds: number | null;
  user_completed: boolean | null;
  user_points: number | null;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  const currentUser = Number(session.user.id);

  const course = await prisma.course.findFirst({
    where: { slug: id, deletedAt: null },
    select: {
      id: true,
      name: true,
      instructors: {
        where: { userId: currentUser },
        select: { userId: true },
      },
    },
  });
  if (!course) {
    return NextResponse.json({ error: "Курс не найден" }, { status: 404 });
  }

  const isInstructor = course.instructors.length > 0;
  const isAdmin = session.user.role === "admin";

  const enrollment = await prisma.userCourse.findFirst({
    where: {
      userId: currentUser,
      courseId: course.id,
    },
  });

  if (!enrollment && !isInstructor && !isAdmin) {
    return NextResponse.json({ error: "Не записан на курс" }, { status: 403 });
  }

  const parts = await prisma.$queryRaw<CoursePartsSqlRow[]>`
    SELECT
      "Course".id AS course_id,
      "Course"."name" AS course_name,
      "UserCourse".progress AS course_progress,
      "UserCourse".status AS course_status,
      "CoursePart".id AS course_part_id,
      "CoursePart".name,
      "CoursePart".description,
      "CoursePart".sort_order,
      "CoursePart".created_at,
      "CoursePart".updated_at,
      "CoursePart".deleted_at,
      "CoursePart".deadline_days,
      "UserCoursePart".completed AS part_completed,
      "UserCoursePart".progress AS part_progress,
      "UserCoursePart".deadline AS part_deadline,
      "Lesson".id AS lesson_id,
      "Lesson"."name" AS lesson_name,
      "Lesson"."description" AS lesson_description,
      "Lesson"."sort_order" AS lesson_sort_order,
      "Lesson"."type" AS lesson_type,
      "Lesson"."points" AS lesson_points,
      "Lesson"."duration_seconds" AS lesson_duration_seconds,
      "UserLesson".completed AS user_completed,
      "UserLesson".points AS user_points
    FROM "CoursePart"
    INNER JOIN "Course"
      ON "CoursePart"."course_id" = "Course"."id"
    LEFT JOIN "UserCourse"
      ON "UserCourse"."course_id" = "Course"."id"
      AND "UserCourse"."user_id" = ${currentUser}
    LEFT JOIN "Lesson"
      ON "CoursePart"."id" = "Lesson"."course_part_id"
      AND "Lesson"."deleted_at" IS NULL
    LEFT JOIN "UserLesson"
      ON "Lesson"."id" = "UserLesson"."lesson_id"
      AND "UserLesson"."user_id" = ${currentUser}
    LEFT JOIN "UserCoursePart"
      ON "CoursePart"."id" = "UserCoursePart"."course_part_id"
      AND "UserCoursePart"."user_id" = ${currentUser}
    WHERE "Course"."slug" = ${id}
      AND "CoursePart"."deleted_at" IS NULL
    ORDER BY "CoursePart"."sort_order", "Lesson"."sort_order"
  `;

  const first = parts[0];
  return NextResponse.json({
    courseName: first?.course_name ?? course.name,
    courseProgress: first?.course_progress ?? enrollment?.progress ?? 0,
    courseStatus: first?.course_status ?? enrollment?.status ?? null,
    parts: coursePartsFromSql(parts),
    canEdit: isInstructor || isAdmin,
  });
}
