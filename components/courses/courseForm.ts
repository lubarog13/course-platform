import { z } from "zod";

import { CourseLevel } from "@/app/lib/models";
import type { CourseFullDto } from "@/app/lib/courses";

const nullableNumber = z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    if (typeof value === "number") return Number.isNaN(value) ? null : value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  }, z.number().nullable());
  
  const requiredNumber = z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  }, z.number());

 export const courseFormSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    language: z.string().optional(),
    level: z.nativeEnum(CourseLevel).optional(),
    needEnrollment: z.boolean().optional(),
    cover: z.object({
      id: z.number(),
      url: z.string(),
      originalName: z.string(),
    }).nullable(),
    categoryId: nullableNumber,
    tags: z.array(z.string()).optional(),
    deadlineDays: nullableNumber,
    publishedAt: z.date().nullable(),
  }).superRefine((data, ctx) => {
    if (data.deadlineDays != null && (Number.isNaN(data.deadlineDays) || data.deadlineDays < 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["deadlineDays"],
        message: "Срок сдачи не может быть отрицательным",
      });
    }

  });

  export type CourseFormValues = z.infer<typeof courseFormSchema>;

  export function toCourseFormValues(course: CourseFullDto): CourseFormValues {
    return {
      name: course.name,
      description: course.description ?? undefined,
      language: course.language,
      level: course.level ?? undefined,
      needEnrollment: course.needEnrollment,
      cover: course.coverFile ? {
        id: course.coverFile.id,
        url: course.coverFile.url,
        originalName: course.coverFile.originalName,
      } : null,
      categoryId: course.categoryId,
      tags: course.tags,
      deadlineDays: course.deadlineDays,
      publishedAt: course.publishedAt ? new Date(course.publishedAt) : null,
    };
  }