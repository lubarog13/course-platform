import type { CoursePart, Lesson, UserLesson } from "@prisma/client";

import {
  asOptionalInt,
  asOptionalString,
  asRequiredId,
  asRequiredInt,
  asRequiredString,
  requireObject,
} from "@/app/lib/api";
import { prisma } from "@/app/lib/prisma";

export type LessonDto = Pick<Lesson, "id" | "name" | "description" | "sortOrder" | "type" | "points" | "durationSeconds"> & {
  userProgress?: Pick<UserLesson, "completed" | "points"> | null;
};

export type CoursePartDto = CoursePart & {
  lessons: LessonDto[];
  userProgress?: {
    completed: boolean;
    progress: number;
    deadline: Date | null;
  } | null;
};

export type CoursePartExtendedDto = CoursePartDto & {
  course: {
    id: number;
    name: string;
  };
};

export function coursePartsFromSql(response: any[]): CoursePartDto[] {
  const result = [] as CoursePartDto[];
  let counter = -1;
  for (const [index, item] of response.entries()) {
    if (index === 0 || item["course_part_id"] !== response[index - 1]["course_part_id"]) {
      result.push({
        id: item["course_part_id"],
        name: item["name"],
        description: item["description"],
        sortOrder: item["sort_order"],
        createdAt: item["created_at"],
        updatedAt: item["updated_at"],
        deletedAt: item["deleted_at"],
        courseId: item["course_id"],
        deadlineDays: item["deadline_days"],
        lessons: [],
        userProgress:
          item["part_completed"] != null || item["part_progress"] != null || item["part_deadline"] != null
            ? {
                completed: Boolean(item["part_completed"]),
                progress: Number(item["part_progress"] ?? 0),
                deadline: item["part_deadline"] != null ? new Date(item["part_deadline"]) : null,
              }
            : null,
      });
      counter++;
    }
    if (item["lesson_id"] != null) {
      result[counter].lessons.push({
        id: item["lesson_id"],
        name: item["lesson_name"],
        description: item["lesson_description"],
        sortOrder: item["lesson_sort_order"],
        type: item["lesson_type"],
        points: item["lesson_points"],
        durationSeconds: item["lesson_duration_seconds"],
        userProgress:
          item["user_completed"] != null || item["user_points"] != null
            ? {
                completed: Boolean(item["user_completed"]),
                points: Number(item["user_points"] ?? 0),
              }
            : null,
      });
    }
  }
  return result;
}

export type CoursePartWriteData = {
  courseId?: number;
  name?: string;
  description?: string | null;
  sortOrder?: number;
};

export function parseCoursePartBody(
  body: unknown,
  mode: "create" | "update",
): CoursePartWriteData {
  const raw = requireObject(body);
  const name =
    mode === "create"
      ? asRequiredString(raw.name, "name")
      : asOptionalString(raw.name, "name") ?? undefined;
  const description = asOptionalString(raw.description, "description");
  const sortOrder =
    mode === "create"
      ? asRequiredInt(raw.sortOrder, "sortOrder", 0)
      : asOptionalInt(raw.sortOrder, "sortOrder", 0);
  const courseId =
    mode === "create"
      ? asRequiredId(raw.courseId, "courseId")
      : asOptionalIdNullable(raw.courseId, "courseId");

  return {
    ...(courseId !== undefined && courseId !== null ? { courseId } : {}),
    ...(name !== undefined && name !== null ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(sortOrder !== undefined && sortOrder !== null ? { sortOrder } : {}),
  };
}

function asOptionalIdNullable(
  value: unknown,
  field: string,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return asRequiredId(value, field);
}

export async function findCoursePart(id: number, showDeleted: boolean = false, showDrafts: boolean = false) {
  return prisma.coursePart.findFirst({
    where: { id, deletedAt: showDeleted ? undefined : null },
    include: {
      lessons: {
        where: { deletedAt: showDeleted ? undefined : null, publishedAt: showDrafts ? undefined : { not: null } },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          sortOrder: true,
          type: true,
          points: true,
          durationSeconds: true,
        },
      },
    },
  });
}

export async function listCourseParts(courseId: number | null, userId: number | null) {
  return prisma.coursePart.findMany({
    where: {
      ...(courseId !== null ? { courseId } : {}),
      ...(userId !== null ? { course: { instructors: { some: { userId } } } } : {}),
      deletedAt: null,
    },
    orderBy: { sortOrder: "asc" },
    include: {
      lessons: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          sortOrder: true,
          type: true,
          points: true,
          durationSeconds: true,
        },
      },
      course: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}
