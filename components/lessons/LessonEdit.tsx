"use client";

import { useEffect, useRef, useState } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { FormProvider, useForm, useWatch, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { LessonFullDto, TestQuestionDto } from "@/app/lib/lessons";
import type { File as FileModel, Video } from "@/app/lib/models";
import { CoursePartExtendedDto } from "@/app/lib/courseParts";
import { Kbd } from "@/components/ui/kbd";
import { ForwardRefEditor } from "@/components/base/ForwardRefEditor";
import FileUploader from "@/components/base/FileUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import VideoEdit from "../editor/VideoEdit";
import { isSortable } from "@dnd-kit/react/sortable";

import {
  lessonFormSchema,
  toLessonFormValues,
  type LessonFormValues,
} from "./lessonForm";
import { useHotkeys } from "react-hotkeys-hook";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { FileIcon, PlusIcon, XIcon } from "lucide-react";
import TestQuestionEdit from "./TestQuestionEdit";
import { DragDropProvider } from "@dnd-kit/react";


type LessonEditProps = {
  lesson: LessonFullDto;
  onSaved?: (lesson: LessonFullDto) => void;
  isNew: boolean;
  userId: number;
};

function typeLabel(type: LessonFormValues["type"]) {
  if (type === "text") return "Текстовый урок";
  if (type === "video") return "Видео урок";
  return "Тест";
}

function estimatedTextDuration(text: string) {
  return Math.max(1, Math.floor(text.length / 10));
}

export default function LessonEdit({ lesson, isNew,  onSaved, userId }: LessonEditProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [publishedAt, setPublishedAt] = useState<Date | null>(
    lesson.publishedAt ? new Date(lesson.publishedAt as string | Date) : null,
  );

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema) as Resolver<LessonFormValues>,
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
  const attachment = useWatch({ control, name: "attachment" });
  const coursePartId = useWatch({ control, name: "coursePartId" });
  const openedLessonId = useRef<number | null>(null);
  const [courseParts, setCourseParts] = useState<CoursePartExtendedDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [testQuestions, setTestQuestions] = useState<TestQuestionDto[]>(lesson.testQuestions || []);

  const [questionsChanged, setQuestionsChanged] = useState(false);
  useEffect(() => {
    if (openedLessonId.current === lesson.id) return;
    openedLessonId.current = lesson.id;
    const values = toLessonFormValues(lesson);
    reset(values);
    editorRef.current?.setMarkdown(values.textContent);
    setPublishedAt(values.publishedAt);
    setTestQuestions(lesson.testQuestions);
    setSavedAt(null);
    setError(null);
  }, [lesson, reset]);

  const fetchCourseParts = async (signal: AbortSignal) => {
    await fetch(`/api/course-part?userId=${userId}`)
        .then(res => res.json())
        .then(data => setCourseParts(data))
        .catch(error => {
          console.error(error);
        }).finally(() => {
          if (!signal.aborted) setLoading(false);
        });
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchCourseParts(controller.signal);
    return () => controller.abort();
  }, []);

  const syncMarkdown = (markDirty = false) => {
    const markdown = editorRef.current?.getMarkdown() ?? getValues("textContent");
    setValue("textContent", markdown, { shouldDirty: markDirty });
    return markdown;
  };

  const syncDuration = (values: LessonFormValues, markDirty = false) => {
    let next: number | null = values.durationSeconds;
    if (values.type === "video" && values.video.durationSeconds != null) {
      next = values.video.durationSeconds;
    } else if (values.type === "text") {
      next = estimatedTextDuration(values.textContent ?? "");
    }
    if (next === values.durationSeconds) return;
    setValue("durationSeconds", next, {
      shouldDirty: markDirty,
      shouldValidate: markDirty,
    });
  };

  const saveVideo = async (values: LessonFormValues): Promise<Video | null> => {
    const payload = {
      url: values.video.url.trim(),
      platform: values.video.platform,
      title: values.video.title.trim() || null,
      durationSeconds: values.video.durationSeconds,
      thumbnailUrl: values.video.thumbnailUrl.trim() || null,
    };

    const creatingVideo = values.video.id < 1;
    const response = await fetch(
      creatingVideo ? "/api/video" : `/api/video/${values.video.id}`,
      {
        method: creatingVideo ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.error ?? "Не удалось сохранить видео");
    }
    return body as Video;
  };

  const onTestQuestionSaved = (question: TestQuestionDto) => {
    setTestQuestions(testQuestions.map(q => q.id === question.id ? question : q));
    setQuestionsChanged(true);
  };

  const onTestQuestionDeleted = (question: TestQuestionDto) => {
    setTestQuestions(testQuestions.filter(q => q.id !== question.id));
    if (testQuestions.length === 0) {
      setQuestionsChanged(false);
    } else {
      setQuestionsChanged(true);
    }
  };

  const reorderQuestions = (questions: TestQuestionDto[], from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return questions;
    const next = [...questions];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next.map((question, index) => ({ ...question, sortOrder: index + 1 }));
  };

  const onTestQuestionAdd = () => {
    const newQuestion = {
      id: -Date.now(),
      question: "",
      type: "single_choice",
      score: 1,
      sortOrder: testQuestions.length + 1,
      required: true,
      attachmentNeeded: false,
      lessonId: lesson.id,
      options: [],
    } as TestQuestionDto;
    setTestQuestions([...testQuestions, newQuestion]);
  };

  const onSubmit: SubmitHandler<LessonFormValues> = async (values) => {
    setSaving(true);
    setError(null);
    if (type === "test" && !testQuestions.length) {
      setError("Необходимо добавить хотя бы один вопрос");
      setSaving(false);
      return;
    }
    try {
      const markdown = syncMarkdown(false);
      syncDuration({ ...values, textContent: markdown }, false);
      const durationSeconds = getValues("durationSeconds");
      let videoId = lesson.videoId ?? (values.video.id > 0 ? values.video.id : null);

      if (values.type === "video") {
        const savedVideo = await saveVideo({ ...values, textContent: markdown });
        videoId = savedVideo?.id ?? videoId;
      }

      const creating = isNew && (openedLessonId.current ?? lesson.id) < 1;
      const response = await fetch(
        creating ? "/api/lesson" : `/api/lesson/${openedLessonId.current ?? lesson.id}`,
        {
          method: creating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: values.type,
            name: values.name.trim(),
            description: values.description.trim() || null,
            textContent: values.type === "test" ? null : markdown,
            publishedAt: publishedAt,
            coursePartId: values.coursePartId,
            sortOrder: values.sortOrder,
            durationSeconds,
            attachmentId: values.attachment?.id ?? null,
            ...(values.type === "video" ? { videoId } : {}),
            ...(values.type === "test"
              ? {
                  testQuestions: testQuestions.map((question) => ({
                    ...(question.id > 0 ? { id: question.id } : {}),
                    question: question.question,
                    type: question.type,
                    score: question.score,
                    sortOrder: question.sortOrder,
                    required: question.required,
                    attachmentNeeded: question.attachmentNeeded,
                    options:
                      question.type === "text"
                        ? []
                        : question.options.map((option) => ({
                            text: option.text,
                            isCorrect: option.isCorrect ?? false,
                            sortOrder: option.sortOrder,
                          })),
                  })),
                }
              : {}),
          }),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Не удалось сохранить урок");
      }

      const saved = body as LessonFullDto;
      const formValues = toLessonFormValues(saved);
      // Prevent the lesson-prop effect from treating create→id as a fresh open.
      openedLessonId.current = saved.id;
      reset(formValues);
      editorRef.current?.setMarkdown(formValues.textContent);
      setPublishedAt(formValues.publishedAt);
      setTestQuestions(saved.testQuestions);
      setSavedAt(new Date());
      onSaved?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const publishLesson = async () => {
    const nextPublishedAt = new Date();
    setPublishedAt(nextPublishedAt);
    setValue("publishedAt", nextPublishedAt, { shouldDirty: true });
    await form.handleSubmit(onSubmit)();
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
                ? <>Есть несохранённые изменения <Kbd>Ctrl+S</Kbd></>
                : savedAt
                  ? `Сохранено в ${savedAt.toLocaleTimeString("ru-RU")}`
                  : "Изменения ещё не сохранялись"}
            </p>
          </div>
          <div className="flex items-center gap-2">
          <Button type="submit" disabled={(saving || !isDirty) && (type === "test" && testQuestions.length === 0)}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
          {savedAt && !isDirty && (
            <Button
              variant="secondary"
              type="button"
              disabled={saving || !!publishedAt}
              onClick={() => void publishLesson()}
            >
              {publishedAt ? "Опубликовано" : "Опубликовать"}
            </Button>
          )}
          </div>
        </div>

        {error && (
          <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <div className="sm:grid-cols-2 grid gap-4">
          <Field data-invalid={!!errors.coursePartId || undefined}>
            <FieldLabel htmlFor="course-part-id">Часть курса</FieldLabel>
            <Select
              value={coursePartId || null}
              disabled={loading}
              onValueChange={(value: number | null) =>
                setValue("coursePartId", value ?? 0, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              id="course-part-id"
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите часть курса" />
              </SelectTrigger>
              <SelectContent>
                {courseParts.map((part) => (
                  <SelectItem key={part.id} value={Number(part.id)}>
                    {part.name} ({part.course.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.coursePartId]} />
          </Field>
          <Field data-invalid={!!errors.sortOrder || undefined}>
            <FieldLabel htmlFor="sort-order">Номер урока</FieldLabel>
            <Input
              id="sort-order"
              type="number"
              min={1}
              aria-invalid={!!errors.sortOrder}
              placeholder="Номер урока в части курса"
              {...register("sortOrder", { valueAsNumber: true })}
            />
            <FieldError errors={[errors.sortOrder]} />
          </Field>
        </div>

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
                key={lesson.id < 1 ? "new" : lesson.id}
                className="w-full"
                ref={editorRef}
                markdown={getValues("textContent")}
                onChange={(value) => {
                  const prev = getValues("textContent");
                  if (value === prev) return;
                  setValue("textContent", value, {
                    shouldDirty: true,
                    shouldValidate: !!errors.textContent,
                  });
                  syncDuration({ ...getValues(), textContent: value }, false);
                }}
                placeholder="Начните писать урок…"
              />
              <FieldError errors={[errors.textContent]} />
            </Field>
          )}

          <div className="grid gap-4">
            <Field data-invalid={!!errors.durationSeconds || undefined}>
              <FieldLabel htmlFor="lesson-duration">
                Ожидаемая продолжительность (секунды)
              </FieldLabel>
              <Input
                id="lesson-duration"
                type="number"
                min={0}
                aria-invalid={!!errors.durationSeconds}
                placeholder="Например, 1800"
                {...register("durationSeconds", {
                  setValueAs: (value) => {
                    if (value === "" || value == null) return null;
                    const parsed = Number(value);
                    return Number.isNaN(parsed) ? Number.NaN : parsed;
                  },
                })}
              />
              <FieldError errors={[errors.durationSeconds]} />
            </Field>

            <Field data-invalid={!!errors.attachment || undefined}>
              <FieldLabel>Вложение (необязательно)</FieldLabel>
              {attachment ? (
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <FileIcon className="size-4 shrink-0" />
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-blue-500 hover:underline dark:text-blue-400"
                  >
                    {attachment.originalName}
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() =>
                      setValue("attachment", null, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    <XIcon className="size-4" />
                    <span className="sr-only">Удалить вложение</span>
                  </Button>
                </div>
              ) : (
                <FileUploader
                  onUploaded={(files: FileModel[]) => {
                    const file = files[0];
                    if (!file) return;
                    setValue(
                      "attachment",
                      {
                        id: file.id,
                        url: file.url,
                        originalName: file.originalName,
                      },
                      { shouldDirty: true, shouldValidate: true },
                    );
                  }}
                />
              )}
              <FieldError errors={[errors.attachment]} />
            </Field>
          </div>

          {type === "test" && (
            <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
              Для уроков типа «{typeLabel(type)}» markdown-редактор не используется.
              Здесь можно править название и описание.
            </p>
          )}

          {type === "video" && (
            <VideoEdit
              onDurationChanged={() => syncDuration(getValues(), false)}
            />
          )}
          {type === "test" && (
            <DragDropProvider
                onDragEnd={(event) => {
                  if (event.canceled) return;
                  const { source } = event.operation;
                  if (!isSortable(source)) return;
                  setTestQuestions((current) =>
                    reorderQuestions(current, source.initialIndex, source.index),
                  );
                }}
              >
            <div className="flex flex-col gap-4">
              {testQuestions.map((question, index) => (
                <TestQuestionEdit
                  key={question.id}
                  index={index}
                  question={question}
                  onSaved={onTestQuestionSaved}
                  onDeleted={onTestQuestionDeleted}
                />
              ))}
              <Button type="button" onClick={onTestQuestionAdd}>Добавить вопрос <PlusIcon className="size-4" /></Button>
            </div>
            </DragDropProvider>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
