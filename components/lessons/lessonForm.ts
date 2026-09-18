import { z } from "zod";

import type { LessonFullDto } from "@/app/lib/lessons";
import type { VideoPlatform } from "@/app/lib/models";

const videoPlatforms = ["youtube", "rutube", "self_hosted", "other"] as const;

export const defaultVideo = {
  id: -1,
  url: "",
  platform: "youtube" as VideoPlatform,
  title: "",
  durationSeconds: null as number | null,
  thumbnailUrl: "",
};

export const lessonFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Введите название урока")
      .max(200, "Название не длиннее 200 символов"),
    description: z.string().max(2000, "Описание не длиннее 2000 символов"),
    textContent: z.string(),
    type: z.enum(["text", "video", "test"]),
    coursePartId: z.number().int().positive("Выберите часть курса"),
    durationSeconds: z.number().nullable(),
    sortOrder: z
      .number({ error: "Урок должен быть числом" })
      .int("Урок должен быть целым числом")
      .min(1, "Номер урока должен быть больше 0"),
    publishedAt: z.date().nullable(),
    attachment: z
      .object({
        id: z.number(),
        url: z.string(),
        originalName: z.string(),
      })
      .nullable(),
    video: z.object({
      id: z.number(),
      url: z.string(),
      platform: z.enum(videoPlatforms),
      title: z.string(),
      durationSeconds: z.number().nullable(),
      thumbnailUrl: z.string(),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.type === "text" && !data.textContent.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["textContent"],
        message: "Добавьте текст урока",
      });
    }

    if (
      data.durationSeconds != null &&
      (Number.isNaN(data.durationSeconds) || data.durationSeconds < 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["durationSeconds"],
        message: "Длительность не может быть отрицательной",
      });
    }

    if (data.type !== "video") return;

    const url = data.video.url.trim();
    if (!url) {
      ctx.addIssue({
        code: "custom",
        path: ["video", "url"],
        message:
          data.video.platform === "self_hosted"
            ? "Загрузите видеофайл"
            : "Укажите ссылку на видео",
      });
    } else if (data.video.platform !== "self_hosted") {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("bad protocol");
        }
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["video", "url"],
          message: "Введите корректный URL (https://…)",
        });
      }
    }

    if (
      data.video.durationSeconds != null &&
      (Number.isNaN(data.video.durationSeconds) || data.video.durationSeconds < 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["video", "durationSeconds"],
        message: "Длительность не может быть отрицательной",
      });
    }
  });

export type LessonFormValues = z.infer<typeof lessonFormSchema>;

export function toLessonFormValues(lesson: LessonFullDto): LessonFormValues {
  const publishedAt = lesson.publishedAt
    ? lesson.publishedAt instanceof Date
      ? lesson.publishedAt
      : new Date(lesson.publishedAt)
    : null;

  return {
    name: lesson.name ?? "",
    description: lesson.description ?? "",
    textContent: lesson.textContent ?? "",
    type: lesson.type,
    coursePartId: lesson.coursePartId ?? 0,
    durationSeconds: lesson.durationSeconds ?? null,
    attachment: lesson.attachment
      ? {
          id: lesson.attachment.id,
          url: lesson.attachment.url,
          originalName: lesson.attachment.originalName,
        }
      : null,
    video: {
      id: lesson.video?.id ?? defaultVideo.id,
      url: lesson.video?.url ?? "",
      platform: lesson.video?.platform ?? defaultVideo.platform,
      title: lesson.video?.title ?? "",
      durationSeconds: lesson.video?.durationSeconds ?? null,
      thumbnailUrl: lesson.video?.thumbnailUrl ?? "",
    },
    sortOrder: lesson.sortOrder ?? 1,
    publishedAt:
      publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
  };
}
