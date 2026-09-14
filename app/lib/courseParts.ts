import type { CoursePart, Lesson } from "@prisma/client";

import {
  asOptionalInt,
  asOptionalString,
  asRequiredId,
  asRequiredInt,
  asRequiredString,
  requireObject,
} from "@/app/lib/api";
import { prisma } from "@/app/lib/prisma";

export type LessonDto = Pick<
  Lesson,
  "id" | "name" | "description" | "sortOrder" | "type" | "points" | "durationSeconds"
>;

export type CoursePartDto = CoursePart & {
  lessons: LessonDto[];
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
        lessons: [],
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

export async function findCoursePart(id: number) {
  return prisma.coursePart.findFirst({
    where: { id, deletedAt: null },
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
    },
  });
}

export async function listCourseParts(courseId: number) {
  return prisma.coursePart.findMany({
    where: { courseId, deletedAt: null },
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
    },
  });
}
