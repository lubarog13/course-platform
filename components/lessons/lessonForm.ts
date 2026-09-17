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
  return {
    name: lesson.name,
    description: lesson.description ?? "",
    textContent: lesson.textContent ?? "",
    type: lesson.type,
    video: {
      id: lesson.video?.id ?? defaultVideo.id,
      url: lesson.video?.url ?? "",
      platform: lesson.video?.platform ?? defaultVideo.platform,
      title: lesson.video?.title ?? "",
      durationSeconds: lesson.video?.durationSeconds ?? null,
      thumbnailUrl: lesson.video?.thumbnailUrl ?? "",
    },
  };
}
