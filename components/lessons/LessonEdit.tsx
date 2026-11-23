"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { FormProvider, useForm, useWatch, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { LessonFullDto, TestQuestionDto } from "@/app/lib/lessons";
import type { File as FileModel, Video } from "@/app/lib/models";
import type { CoursePartExtendedDto } from "@/app/lib/courseParts";
import { Kbd } from "@/components/ui/kbd";
import { ForwardRefEditor } from "@/components/base/ForwardRefEditor";
import { deleteEditorUpload } from "@/components/base/mdxEditorRu";
import FileUploader from "@/components/base/FileUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import VideoEdit from "../editor/VideoEdit";
import { toast } from "../ui/toast";

import { isSortable } from "@dnd-kit/react/sortable";

import {
  lessonFormSchema,
  toLessonFormValues,
  type LessonFormValues,
} from "./lessonForm";
import {
  clearLessonEditDraft,
  loadLessonEditDraft,
  saveLessonEditDraft,
} from "./lessonEditDraft";
import { useHotkeys } from "react-hotkeys-hook";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { CircleQuestionMarkIcon, DownloadIcon, FileIcon, PlusIcon, XIcon } from "lucide-react";
import TestQuestionEdit from "./TestQuestionEdit";
import TestQuestionsFileHelpDialog from "./TestQuestionsFileHelpDialog";
import LessonEditHelpDialog from "./LessonEditHelpDialog";
import { DragDropProvider } from "@dnd-kit/react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DEFAULT_QUESTIONS, fromCsv, fromXlsx, TestQuestionTransfer, toCsv, toTestQuestionTransfer, toXlsx, transferToTestQuestionDto } from "./testForm";


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
  const [draftRestoredAt, setDraftRestoredAt] = useState<Date | null>(null);
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
    watch,
    formState: { errors, isDirty },
  } = form;

  const type = useWatch({ control, name: "type" });
  const attachment = useWatch({ control, name: "attachment" });
  const coursePartId = useWatch({ control, name: "coursePartId" });
  const textContent = useWatch({ control, name: "textContent" });
  const reviewEnabled = useWatch({ control, name: "reviewEnabled" });
  const manualGrading = useWatch({ control, name: "manualGrading" });
  const maxAttempts = useWatch({ control, name: "maxAttempts" });
  const required = useWatch({ control, name: "required" });
  const openedLessonId = useRef<number | null>(null);
  const [courseParts, setCourseParts] = useState<CoursePartExtendedDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileParsing, setFileParsing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsingSuccess, setParsingSuccess] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [fileDownloading, setFileDownloading] = useState(false);
  const [fileType, setFileType] = useState<"csv" | "xlsx">("csv");
  const [testQuestions, setTestQuestions] = useState<TestQuestionDto[]>(lesson.testQuestions || []);

  const [questionsChanged, setQuestionsChanged] = useState(false);
  const [showHowDialog, setShowHowDialog] = useState(false);
  const draftLessonIdRef = useRef<number>(lesson.id < 1 ? -1 : lesson.id);
  const draftTimerRef = useRef<number | null>(null);

  // useLayoutEffect — черновик до отрисовки (важно для id=-1 / type=lesson)
  useLayoutEffect(() => {
    if (openedLessonId.current === lesson.id) return;
    openedLessonId.current = lesson.id;
    draftLessonIdRef.current = lesson.id < 1 ? -1 : lesson.id;

    const draftId = lesson.id < 1 ? -1 : lesson.id;
    const draft = loadLessonEditDraft(userId, draftId);
    if (draft) {
      reset(draft.values);
      const markdown = draft.values.textContent ?? "";
      editorRef.current?.setMarkdown(markdown);
      const retry = window.setTimeout(() => {
        editorRef.current?.setMarkdown(markdown);
      }, 0);
      setPublishedAt(
        draft.publishedAt ? new Date(draft.publishedAt) : draft.values.publishedAt,
      );
      setTestQuestions(draft.testQuestions ?? []);
      setQuestionsChanged(true);
      setDraftRestoredAt(new Date(draft.updatedAt));
      setSavedAt(null);
      setError(null);
      return () => window.clearTimeout(retry);
    }

    const values = toLessonFormValues(lesson);
    reset(values);
    editorRef.current?.setMarkdown(values.textContent ?? "");
    setPublishedAt(values.publishedAt);
    setTestQuestions(lesson.testQuestions ?? []);
    setQuestionsChanged(false);
    setDraftRestoredAt(null);
    // Не сбрасываем savedAt при обновлении того же урока после save —
    // иначе снова показывается «ещё не сохранялись».
    setError(null);
  }, [lesson, reset, userId]);

  // Автосохранение черновика в localStorage
  useEffect(() => {
    if (!isDirty && !questionsChanged && !draftRestoredAt) return;

    const persist = () => {
      const draftId =
        openedLessonId.current != null && openedLessonId.current > 0
          ? openedLessonId.current
          : -1;
      draftLessonIdRef.current = draftId;
      saveLessonEditDraft(userId, draftId, {
        values: {
          ...getValues(),
          textContent:
            editorRef.current?.getMarkdown() ??
            getValues("textContent") ??
            "",
        },
        testQuestions,
        publishedAt,
      });
    };

    const schedule = () => {
      if (draftTimerRef.current != null) {
        window.clearTimeout(draftTimerRef.current);
      }
      draftTimerRef.current = window.setTimeout(persist, 400);
    };

    const subscription = watch(() => schedule());
    schedule();

    return () => {
      subscription.unsubscribe();
      if (draftTimerRef.current != null) {
        window.clearTimeout(draftTimerRef.current);
      }
    };
  }, [
    watch,
    getValues,
    userId,
    testQuestions,
    publishedAt,
    isDirty,
    questionsChanged,
    draftRestoredAt,
  ]);
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
    } else if (
      values.type === "text" &&
      (values.durationSeconds == null ||
        !Number.isFinite(values.durationSeconds))
    ) {
      // Только автоподстановка, если поле пустое — ручное значение не затираем.
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


  const loadFromFile = async (file: File) => {
    setFileParsing(true);
    setParsingError(null);
    setParsingSuccess(false);
    let isSuccess = true;
    try {
    let questions: TestQuestionTransfer[] = [];
    if (fileType === "csv") {
      questions = await fromCsv(file, lesson.id);
    } else {
      questions = await fromXlsx(file, lesson.id);
    }
    setTestQuestions(questions.map((q, i) => transferToTestQuestionDto(q, -(i + 1))));
    } catch (error) {
      isSuccess = false;
      console.error(error);
      setParsingError(error instanceof Error ? error.message : "Ошибка при загрузке вопросов");
    } finally {
      setParsingSuccess(isSuccess);
      setFileParsing(false);
      setLoadingFile(false);
      setFile(null);
    }
  };

  const downloadQuestions = async (fromDefault = false) => {
    setFileDownloading(true);
    const defaultQuestions = DEFAULT_QUESTIONS.map(i => ({...i, lessonId: lesson.id}));
    if (fileType === "csv") {
      const file = await toCsv(fromDefault ? defaultQuestions : testQuestions.map(toTestQuestionTransfer));
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = "questions.csv";
      a.click();
    } else {
      const file = await toXlsx(fromDefault ? defaultQuestions : testQuestions.map(toTestQuestionTransfer));
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = "questions.xlsx";
      a.click();
    }
    setFileDownloading(false);
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
      textAnswer: null,
    } as TestQuestionDto;
    setTestQuestions([...testQuestions, newQuestion]);
  };

  const onSubmit = async (
    values: LessonFormValues,
    options?: { publish?: boolean },
  ) => {
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

      const currentId = openedLessonId.current ?? lesson.id;
      const creating = currentId < 1;
      const publishedAtValue =
        values.publishedAt instanceof Date
          ? values.publishedAt
          : values.publishedAt
            ? new Date(values.publishedAt)
            : publishedAt;
      const shouldPublish = options?.publish === true || !!publishedAtValue;

      const response = await fetch(
        creating ? "/api/lesson" : `/api/lesson/${currentId}`,
        {
          method: creating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: values.type,
            name: values.name.trim(),
            description: values.description.trim() || null,
            textContent: values.type === "test" ? null : markdown,
            // API ожидает boolean published, не publishedAt
            ...(options?.publish || (creating && shouldPublish)
              ? { published: true }
              : !creating && lesson.publishedAt && !publishedAtValue
                ? { published: false }
                : {}),
            coursePartId: values.coursePartId,
            sortOrder: values.sortOrder,
            durationSeconds,
            required: required,
            manualGrading: manualGrading,
            maxAttempts: maxAttempts,
            reviewEnabled: reviewEnabled,
            passingScore: values.passingScore ?? null,
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
      clearLessonEditDraft(userId, -1);
      clearLessonEditDraft(userId, draftLessonIdRef.current);
      openedLessonId.current = saved.id;
      draftLessonIdRef.current = saved.id;
      clearLessonEditDraft(userId, saved.id);
      reset(formValues);
      editorRef.current?.setMarkdown(formValues.textContent);
      setPublishedAt(formValues.publishedAt);
      setTestQuestions(saved.testQuestions);
      setQuestionsChanged(false);
      setDraftRestoredAt(null);
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
    setValue("publishedAt", nextPublishedAt, {
      shouldDirty: true,
      shouldValidate: true,
    });
    // Передаём дату явно: setState ещё не обновил publishedAt в замыкании onSubmit.
    await form.handleSubmit((values) =>
      onSubmit({ ...values, publishedAt: nextPublishedAt }, { publish: true }),
    )();
  };

  const submitForm: SubmitHandler<LessonFormValues> = (values) =>
    onSubmit(values);

  useHotkeys("ctrl+s", (e) => {
    e.preventDefault();
    void form.handleSubmit(submitForm)();
  });

  return (
    <FormProvider {...form}>
      <form
        noValidate
        className="mx-auto flex w-full max-w-4xl flex-col gap-6"
        onSubmit={(event) => {
          syncMarkdown(false);
          void handleSubmit(submitForm)(event);
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
            <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">
              {isDirty || questionsChanged
                ? <>Есть несохранённые изменения <Kbd>Ctrl+S</Kbd>
                  {draftRestoredAt
                    ? ` · черновик (${draftRestoredAt.toLocaleTimeString("ru-RU")})`
                    : " · черновик сохраняется локально"}
                  </>
                : savedAt
                  ? `Сохранено в ${savedAt.toLocaleTimeString("ru-RU")}`
                  : draftRestoredAt
                    ? `Восстановлен черновик от ${draftRestoredAt.toLocaleTimeString("ru-RU")}`
                    : "Изменения ещё не сохранялись"}
            </p>
            <Button variant="ghost" type="button" className="w-fit pl-0" onClick={() => setShowHowDialog(true)}>
              <CircleQuestionMarkIcon className="size-4" /> Как заполнять форму?
            </Button>
            <LessonEditHelpDialog
              open={showHowDialog}
              onOpenChange={setShowHowDialog}
            />
            </div>
          </div>
          <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={
              saving ||
              (!isDirty && !questionsChanged && !draftRestoredAt) ||
              (type === "test" && testQuestions.length === 0)
            }
          >            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
          {(savedAt || lesson.id > 0) && !isDirty && !questionsChanged && (
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
          <Field>
            <FieldLabel htmlFor="lesson-points">Количество баллов за урок</FieldLabel>
            <Input
              id="lesson-points"
              aria-invalid={!!errors.points}
              placeholder="Количество баллов за урок"
              type="number"
              min={0}
              {...register("points", { valueAsNumber: true })}
            />
            <FieldError errors={[errors.points]} />
          </Field>
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
                markdown={textContent ?? ""}
                onImagesRemoved={(urls) => {
                  for (const url of urls) {
                    void deleteEditorUpload(url, {
                      lessonId: lesson.id > 0 ? lesson.id : undefined,
                    });
                  }
                }}
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
            <>
            <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
            <Field data-invalid={!!errors.passingScore || undefined}>
              <FieldLabel htmlFor="lesson-points">Проходной балл</FieldLabel>
              <Input
                id="lesson-passing-score"
                aria-invalid={!!errors.passingScore}
                placeholder="Проходной балл"
                type="number"
                min={0}
                {...register("passingScore", {
                  setValueAs: (value) =>
                    value === "" || value === null || value === undefined
                      ? null
                      : Number(value),
                })}
              />
              <FieldError errors={[errors.passingScore]} />
            </Field>
            <Field data-invalid={!!errors.timeLimit || undefined}>
              <FieldLabel htmlFor="lesson-time-limit">Время на прохождение (секунды)</FieldLabel>
              <Input
                id="lesson-time-limit"
                aria-invalid={!!errors.timeLimit}
                placeholder="Время на прохождение (секунды)"
                type="number"
                min={0}
                {...register("timeLimit", {
                  setValueAs: (value) =>
                    value === "" || value === null || value === undefined
                      ? null
                      : Number(value),
                })}
              />
              <FieldError errors={[errors.timeLimit]} />
            </Field>
              <div className="flex items-center gap-2">
              <Checkbox
                id="lesson-review-enabled"
                aria-invalid={!!errors.reviewEnabled}
                checked={reviewEnabled === true}
                onCheckedChange={(checked) => {
                  setValue("reviewEnabled", checked === true, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
                            <Label htmlFor="lesson-review-enabled">Разрешить просмотр ответов</Label>

              </div>
              <div className="flex items-center gap-2">
              <Checkbox
                id="lesson-manual-grading"
                aria-invalid={!!errors.manualGrading}
                checked={manualGrading === true}
                onCheckedChange={(checked) => {
                  setValue("manualGrading", checked === true, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
                            <Label htmlFor="lesson-manual-grading">Проверка преподавателем</Label>

              </div>
              <div className="flex items-center gap-2">
              <Checkbox
                id="lesson-required"
                aria-invalid={!!errors.required}
                checked={required === true}
                onCheckedChange={(checked) => {
                  setValue("required", checked === true, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
                            <Label htmlFor="lesson-required">Обязательный урок</Label>

              </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="lesson-max-attempts"
                aria-invalid={!!errors.maxAttempts}
                checked={maxAttempts == null}
                onCheckedChange={(checked) => {
                  setValue("maxAttempts", checked === true ? null : 1, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
              <Label htmlFor="lesson-max-attempts">Количество попыток не ограничено</Label>
            </div> 
            {maxAttempts != null && (
            <Field data-invalid={!!errors.maxAttempts || undefined}>
              <FieldLabel htmlFor="lesson-max-attempts">Максимальное количество попыток</FieldLabel>
              <Input
                id="lesson-max-attempts"
                aria-invalid={!!errors.maxAttempts}
                placeholder="Максимальное количество попыток"
                type="number"
                min={1}
                {...register("maxAttempts", {
                  setValueAs: (value) =>
                    value === "" || value === null || value === undefined
                      ? null
                      : Number(value),
                })}
              />
              <FieldError errors={[errors.maxAttempts]} />
            </Field>
            )}
            </div>
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
            <div className="flex gap-4 flex-wrap mt-4 items-end">
            <Button type="button" disabled={fileParsing} onClick={() => {
              setLoadingFile(true);
              setFile(null)
              setFileParsing(false);
              setParsingError(null);
              setParsingSuccess(false);
            }}>
                {fileParsing ? "Загружаем вопросы..." : `Загрузить вопросы из ${fileType === "csv" ? "CSV" : "XLSX"}`}
              </Button>
              <Button type="button" variant="outline" disabled={fileDownloading} onClick={() => downloadQuestions()}>
                {fileDownloading ? "Скачиваем вопросы..." : `Скачать вопросы в ${fileType === "csv" ? "CSV" : "XLSX"}`}
              </Button>
              <Field className="w-full sm:w-auto sm:flex-1">
                <FieldLabel>Тип файла</FieldLabel>
              <Select value={fileType} onValueChange={(value) => setFileType(value as "csv" | "xlsx")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите тип файла" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">XLSX</SelectItem>
                </SelectContent>
              </Select>
              </Field>
              <div className="flex w-full flex-wrap items-center gap-2">
                <Button
                  className="nowrap text-left"
                  type="button"
                  variant="link"
                  onClick={() => downloadQuestions(true)}
                >
                  <DownloadIcon className="size-4" /> Скачать пример файла
                </Button>
                <TestQuestionsFileHelpDialog />
              </div>
              {loadingFile && <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />}
              {file && <Button type="button" onClick={() => loadFromFile(file)}>Загрузить вопросы</Button>}
              {parsingSuccess && <p className="w-full rounded-xl border bg-green-200 p-2 text-green-800 border-green-300">Вопросы успешно загружены</p>}
              {parsingError && <p className="w-full rounded-xl border bg-red-200 p-2 text-red-800 border-red-300">{parsingError}</p>}
              </div>
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
            </>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
