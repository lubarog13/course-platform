"use client";

import { useEffect, useRef, useState } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { FormProvider, useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { LessonFullDto } from "@/app/lib/lessons";
import type { Video } from "@/app/lib/models";
import { Kbd } from "@/components/ui/kbd";
import { ForwardRefEditor } from "@/components/base/ForwardRefEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import VideoEdit from "../editor/VideoEdit";
import {
  lessonFormSchema,
  toLessonFormValues,
  type LessonFormValues,
} from "./lessonForm";
import { useHotkeys } from "react-hotkeys-hook";

type LessonEditProps = {
  lesson: LessonFullDto;
  onSaved?: (lesson: LessonFullDto) => void;
  isNew: boolean;
};

function typeLabel(type: LessonFormValues["type"]) {
  if (type === "text") return "Текстовый урок";
  if (type === "video") return "Видео урок";
  return "Тест";
}

export default function LessonEdit({ lesson, isNew, onSaved }: LessonEditProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: toLessonFormValues(lesson),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    control,
    formState: { errors, isDirty },
  } = form;

  const type = useWatch({ control, name: "type" });
  const openedLessonId = useRef<number | null>(null);

  useEffect(() => {
    if (openedLessonId.current === lesson.id) return;
    openedLessonId.current = lesson.id;
    reset(toLessonFormValues(lesson));
    editorRef.current?.setMarkdown(lesson.textContent ?? "");
    setSavedAt(null);
    setError(null);
  }, [lesson, reset]);

  const syncMarkdown = (markDirty = false) => {
    const markdown = editorRef.current?.getMarkdown() ?? getValues("textContent");
    setValue("textContent", markdown, { shouldDirty: markDirty });
    return markdown;
  };

  const saveVideo = async (values: LessonFormValues): Promise<Video | null> => {
    const payload = {
      url: values.video.url.trim(),
      platform: values.video.platform,
      title: values.video.title.trim() || null,
      durationSeconds: values.video.durationSeconds,
      thumbnailUrl: values.video.thumbnailUrl.trim() || null,
    };

    const isNew = values.video.id < 1;
    const response = await fetch(isNew ? "/api/video" : `/api/video/${values.video.id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.error ?? "Не удалось сохранить видео");
    }
    return body as Video;
  };

  const onSubmit: SubmitHandler<LessonFormValues> = async (values) => {
    setSaving(true);
    setError(null);
    try {
      const markdown = syncMarkdown();
      let videoId = lesson.videoId ?? (values.video.id > 0 ? values.video.id : null);

      if (values.type === "video") {
        const savedVideo = await saveVideo({ ...values, textContent: markdown });
        videoId = savedVideo?.id ?? videoId;
      }

      const response = await fetch(isNew ? "/api/lesson" : `/api/lesson/${lesson.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: values.type,
          name: values.name.trim(),
          description: values.description.trim() || null,
          textContent: values.type === "test" ? null : markdown,
          ...(values.type === "video" ? { videoId } : {}),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Не удалось сохранить урок");
      }

      const saved = body as LessonFullDto;
      reset(toLessonFormValues(saved));
      setSavedAt(new Date());
      onSaved?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  useHotkeys('ctrl+s', (e) => {
    e.preventDefault();
    void form.handleSubmit(onSubmit)();
  });

  return (
    <FormProvider {...form}>
      <form
        noValidate
        className="mx-auto flex w-full max-w-4xl flex-col gap-6"
        onSubmit={(event) => {
          syncMarkdown(false);
          void handleSubmit(onSubmit)(event);
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Редактор урока
              </h1>
              <Badge variant="secondary">{typeLabel(type)}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {isDirty
                ? <>Есть несохранённые изменения<Kbd>Ctrl+S</Kbd></>
                : savedAt
                  ? `Сохранено в ${savedAt.toLocaleTimeString("ru-RU")}`
                  : "Изменения ещё не сохранялись"}
            </p>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>

        {error && (
          <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <div className="grid gap-4">
          <Field data-invalid={!!errors.name || undefined}>
            <FieldLabel htmlFor="lesson-name">Название</FieldLabel>
            <Input
              id="lesson-name"
              aria-invalid={!!errors.name}
              placeholder="Название урока"
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.description || undefined}>
            <FieldLabel htmlFor="lesson-description">Краткое описание</FieldLabel>
            <Textarea
              id="lesson-description"
              aria-invalid={!!errors.description}
              placeholder="Коротко, что будет в уроке"
              rows={3}
              {...register("description")}
            />
            <FieldError errors={[errors.description]} />
          </Field>

          <ButtonGroup className="mb-4">
            <Button
              type="button"
              className={type === "text" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}
              onClick={() => setValue("type", "text", { shouldDirty: true, shouldValidate: true })}
            >
              Текстовый урок
            </Button>
            <Button
              type="button"
              className={type === "video" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}
              onClick={() => setValue("type", "video", { shouldDirty: true, shouldValidate: true })}
            >
              Видео урок
            </Button>
            <Button
              type="button"
              className={type === "test" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}
              onClick={() => setValue("type", "test", { shouldDirty: true, shouldValidate: true })}
            >
              Тест
            </Button>
          </ButtonGroup>

          {type !== "test" && (
            <Field
              className="w-full grid-cols-[100%] overflow-hidden"
              data-invalid={!!errors.textContent || undefined}
            >
              <FieldLabel>Текст урока</FieldLabel>
              <ForwardRefEditor
                key={lesson.id}
                className="w-full"
                ref={editorRef}
                markdown={lesson.textContent ?? ""}
                onChange={(value) =>
                  setValue("textContent", value, {
                    shouldDirty: true,
                    shouldValidate: !!errors.textContent,
                  })
                }
                placeholder="Начните писать урок…"
              />
              <FieldError errors={[errors.textContent]} />
            </Field>
          )}

          {type === "test" && (
            <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
              Для уроков типа «{typeLabel(type)}» markdown-редактор не используется.
              Здесь можно править название и описание.
            </p>
          )}

          {type === "video" && <VideoEdit />}
        </div>
      </form>
    </FormProvider>
  );
}
