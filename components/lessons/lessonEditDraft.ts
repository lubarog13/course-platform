import type { TestQuestionDto } from "@/app/lib/lessons";

import type { LessonFormValues } from "./lessonForm";

const DRAFT_VERSION = 1 as const;

export type LessonEditDraft = {
  version: typeof DRAFT_VERSION;
  updatedAt: string;
  values: LessonFormValues;
  testQuestions: TestQuestionDto[];
  publishedAt: string | null;
};

export function lessonEditDraftKey(userId: number, lessonId: number) {
  return `course-platform:lesson-edit:${userId}:${lessonId}`;
}

function reviveFormValues(raw: LessonFormValues): LessonFormValues {
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

export function loadLessonEditDraft(
  userId: number,
  lessonId: number,
): LessonEditDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(lessonEditDraftKey(userId, lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LessonEditDraft;
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

export function saveLessonEditDraft(
  userId: number,
  lessonId: number,
  payload: {
    values: LessonFormValues;
    testQuestions: TestQuestionDto[];
    publishedAt: Date | null;
  },
) {
  if (typeof window === "undefined") return;
  try {
    const publishedAtIso = payload.publishedAt?.toISOString() ?? null;
    const draft: LessonEditDraft = {
      version: DRAFT_VERSION,
      updatedAt: new Date().toISOString(),
      values: {
        ...payload.values,
        publishedAt: payload.values.publishedAt
          ? payload.values.publishedAt instanceof Date
            ? payload.values.publishedAt
            : new Date(payload.values.publishedAt)
          : null,
        textContent: payload.values.textContent ?? "",
      },
      testQuestions: payload.testQuestions,
      publishedAt: publishedAtIso,
    };
    window.localStorage.setItem(
      lessonEditDraftKey(userId, lessonId),
      JSON.stringify(draft),
    );
  } catch {
    // quota / private mode — молча пропускаем
  }
}

export function clearLessonEditDraft(userId: number, lessonId: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(lessonEditDraftKey(userId, lessonId));
  } catch {
    // ignore
  }
}
