import type { TestQuestionDto } from "@/app/lib/lessons";

import type { CourseFormValues } from "./courseForm";
import type { CoursePartDto, CoursePartEditData } from "@/app/lib/courseParts";

const DRAFT_VERSION = 1 as const;

export type CourseEditDraft = {
  version: typeof DRAFT_VERSION;
  updatedAt: string;
  values: CourseFormValues;
  courseParts: CoursePartEditData[];
  publishedAt: string | null;
};

export function courseEditDraftKey(userId: number, courseId: number) {
  return `course-platform:course-edit:${userId}:${courseId}`;
}

function reviveFormValues(raw: CourseFormValues): CourseFormValues {
  const publishedAt = raw.publishedAt
    ? raw.publishedAt instanceof Date
      ? raw.publishedAt
      : new Date(raw.publishedAt)
    : null;
  return {
    ...raw,
    publishedAt:
      publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
  };
}

export function loadCourseEditDraft(
  userId: number,
  courseId: number,
): CourseEditDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(courseEditDraftKey(userId, courseId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CourseEditDraft;
    if (parsed?.version !== DRAFT_VERSION || !parsed.values) return null;
    return {
      ...parsed,
      values: reviveFormValues(parsed.values),
      publishedAt: parsed.publishedAt ?? null,
    };
  } catch {
    return null;
  }
}

export function saveCourseEditDraft(
  userId: number,
  courseId: number,
  payload: {
    values: CourseFormValues;
    courseParts: CoursePartEditData[];
    publishedAt: Date | null;
  },
) {
  if (typeof window === "undefined") return;
  try {
    const publishedAtIso = payload.publishedAt?.toISOString() ?? null;
    const draft: CourseEditDraft = {
      version: DRAFT_VERSION,
      updatedAt: new Date().toISOString(),
      values: {
        ...payload.values,
        publishedAt: payload.values.publishedAt
          ? payload.values.publishedAt instanceof Date
            ? payload.values.publishedAt
            : new Date(payload.values.publishedAt)
          : null,
        description: payload.values.description ?? "",
      },
      courseParts: payload.courseParts,
      publishedAt: publishedAtIso,
    };
    window.localStorage.setItem(
      courseEditDraftKey(userId, courseId),
      JSON.stringify(draft),
    );
  } catch {
    // quota / private mode — молча пропускаем
  }
}

export function clearCourseEditDraft(userId: number, courseId: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(courseEditDraftKey(userId, courseId));
  } catch {
    // ignore
  }
}
