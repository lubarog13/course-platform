"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { FormProvider, useForm, useWatch, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type CourseFormValues, courseFormSchema, toCourseFormValues } from "./courseForm";
import {
  clearCourseEditDraft,
  loadCourseEditDraft,
  saveCourseEditDraft,
} from "./courseEditDraft";

import type { CourseFullDto } from "@/app/lib/courses";
import type { CoursePartEditData } from "@/app/lib/courseParts";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ForwardRefEditor } from "../base/ForwardRefEditor";
import { PlusIcon, XIcon } from "lucide-react";
import FileUploader from "@/components/base/FileUploader";
import type { File as FileModel } from "@/app/lib/models";
import { Checkbox } from "@/components/ui/checkbox";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { CourseLevel } from "@/app/lib/models";
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/input-multiselect";
import { InputSelect, InputSelectTrigger } from "@/components/ui/input-select";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { useHotkeys } from "react-hotkeys-hook";
import CoursePartEdit from "./CoursePartEdit";
type CourseEditProps = {
  course: CourseFullDto;
  isNew: boolean;
  onSaved: (course: CourseFullDto) => void;
  userId: number;
};
type TagOption = {
  tag: string;
  count: number;
};
let filtersRequest: Promise<{ tags: TagOption[], categories: { name: string, id: number, slug: string }[] }> | null = null;

function loadFilterTags(signal: AbortSignal): Promise<{ tags: TagOption[], categories: { name: string, id: number, slug: string }[] }> {
  if (!filtersRequest) {
    filtersRequest = fetch("/api/filters")
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить фильтры");
        return res.json() as Promise<{ tags: TagOption[], categories: { name: string, id: number, slug: string }[] }>;
      })
      .then((data) =>{
        const tags = [...data.tags].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
        const categories = [...data.categories]
          .map((category) => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        return { tags, categories };
      })
      .catch((error) => {
        filtersRequest = null;
        throw error;
      });
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    filtersRequest!.then(
      (data) => {
        signal.removeEventListener("abort", onAbort);
        resolve(data);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

export default function CourseEdit({ course, isNew, onSaved, userId }: CourseEditProps) {
    const editorRef = useRef<MDXEditorMethods>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [draftRestoredAt, setDraftRestoredAt] = useState<Date | null>(null);
    const [publishedAt, setPublishedAt] = useState<Date | null>(
      course.publishedAt ? new Date(course.publishedAt as string | Date) : null,
    );
    const [courseParts, setCourseParts] = useState<CoursePartEditData[]>(course.courseParts);
    const [coursePartsChanged, setCoursePartsChanged] = useState(false);
    const [tags, setTags] = useState<TagOption[]>([]);
    const [categories, setCategories] = useState<{ name: string, id: number, slug: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);

    const form = useForm<CourseFormValues>({
        resolver: zodResolver(courseFormSchema) as Resolver<CourseFormValues>,
        mode: "onSubmit",
        reValidateMode: "onChange",
        defaultValues: toCourseFormValues(course),
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
    const openedCourseId = useRef<number | null>(null);
    const cover = useWatch({ control, name: "cover" });
    const needEnrollment = useWatch({ control, name: "needEnrollment" });
    const level = useWatch({ control, name: "level" });
    const categoryId = useWatch({ control, name: "categoryId" });
    const tagsValue = useWatch({ control, name: "tags" });
    const language = useWatch({ control, name: "language" });
    const description = useWatch({ control, name: "description" });

    const draftCourseIdRef = useRef<number>(course.id < 1 ? -1 : course.id);
    const draftTimerRef = useRef<number | null>(null);
    useEffect(() => {
      const controller = new AbortController();
  
      loadFilterTags(controller.signal)
        .then((data) => {
          setTags(data.tags);
          setCategories(data.categories);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          console.error(err);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
  
      return () => controller.abort();
    }, []);
    // useLayoutEffect — чтобы черновик применился до отрисовки (важно для id=-1 / type=course)
    useLayoutEffect(() => {
        if (openedCourseId.current === course.id) return;
        openedCourseId.current = course.id;
        draftCourseIdRef.current = course.id < 1 ? -1 : course.id;

        const draftId = course.id < 1 ? -1 : course.id;
        const draft = loadCourseEditDraft(userId, draftId);
        if (draft) {
          reset(draft.values);
          const markdown = draft.values.description ?? "";
          // Редактор грузится динамически — повторяем setMarkdown, когда ref появится
          editorRef.current?.setMarkdown(markdown);
          const retry = window.setTimeout(() => {
            editorRef.current?.setMarkdown(markdown);
          }, 0);
          setPublishedAt(
            draft.publishedAt
              ? new Date(draft.publishedAt)
              : draft.values.publishedAt,
          );
          setCourseParts(draft.courseParts ?? []);
          setCoursePartsChanged(true);
          setDraftRestoredAt(new Date(draft.updatedAt));
          setSavedAt(null);
          setError(null);
          return () => window.clearTimeout(retry);
        }

        const values = toCourseFormValues(course);
        reset(values);
        editorRef.current?.setMarkdown(values.description ?? "");
        setPublishedAt(values.publishedAt);
        setCourseParts(course.courseParts ?? []);
        setCoursePartsChanged(false);
        setDraftRestoredAt(null);
        setSavedAt(null);
        setError(null);
      }, [course, reset, userId]);
    useEffect(() => {
        if (!cover) return;
        const filename =
      typeof cover?.url === "string"
        ? cover.url.split(/[/\\]/).pop()
        : undefined;
    if (!filename) return;
    setCoverUrl(`/api/uploads/${encodeURIComponent(filename)}`);
      }, [cover?.url]);
    useEffect(() => {
        if (!isDirty && !coursePartsChanged && !draftRestoredAt) return;
    
        const persist = () => {
          const draftId =
            openedCourseId.current != null && openedCourseId.current > 0
              ? openedCourseId.current
              : -1;
          draftCourseIdRef.current = draftId;
          saveCourseEditDraft(userId, draftId, {
            values: {
              ...getValues(),
              description:
                editorRef.current?.getMarkdown() ??
                getValues("description") ??
                "",
            },
            courseParts,
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
        courseParts,
        publishedAt,
        isDirty,
        coursePartsChanged,
        draftRestoredAt,
      ]);

      const syncMarkdown = (markDirty = false) => {
        const markdown = editorRef.current?.getMarkdown() ?? getValues("description");
        setValue("description", markdown as string, { shouldDirty: markDirty });
        return markdown;
      };

    const ensureCategoryId = async (
      categoryId: number | null | undefined,
    ): Promise<number | null> => {
      if (categoryId == null) return null;
      if (categoryId > 0) return categoryId;

      const category = categories.find((item) => item.id === categoryId);
      if (!category?.name) {
        throw new Error("Выберите категорию курса");
      }

      const response = await fetch("/api/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: category.name,
          slug: category.slug,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Не удалось создать категорию");
      }

      const saved = body as { id: number; name: string; slug: string };
      setCategories((current) =>
        current.map((item) =>
          item.id === categoryId
            ? { id: saved.id, name: saved.name, slug: saved.slug }
            : item,
        ),
      );
      return saved.id;
    };

    const onSubmit: SubmitHandler<CourseFormValues> = async (values) => {
      setSaving(true);
      setError(null);
      try {
        const markdown = syncMarkdown(false);
        const resolvedCategoryId = await ensureCategoryId(values.categoryId);
        const currentId = openedCourseId.current ?? course.id;
        const creating = currentId < 1;

        const namedParts = courseParts.filter((part) => part.name?.trim());
        for (const [index, part] of namedParts.entries()) {
          if (!part.name?.trim()) {
            throw new Error(`Укажите название для части курса №${index + 1}`);
          }
        }

        const response = await fetch(
          creating ? "/api/course" : `/api/course/${currentId}`,
          {
            method: creating ? "POST" : "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: values.name.trim(),
              description: markdown?.trim() || null,
              language: values.language ?? "ru",
              level: values.level ?? null,
              needEnrollment: values.needEnrollment ?? false,
              coverFileId: values.cover?.id ?? null,
              categoryId: resolvedCategoryId,
              tags: values.tags ?? [],
              deadlineDays: values.deadlineDays,
              publishedAt,
              parts: namedParts.map((part, index) => ({
                ...(part.id != null && part.id > 0 ? { id: part.id } : {}),
                name: part.name!.trim(),
                description: part.description?.trim() || null,
                sortOrder: part.sortOrder ?? index + 1,
                deadlineDays: part.deadlineDays ?? null,
              })),
            }),
          },
        );

        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error ?? "Не удалось сохранить курс");
        }

        const saved = body as CourseFullDto;
        clearCourseEditDraft(userId, -1);
        clearCourseEditDraft(userId, draftCourseIdRef.current);
        openedCourseId.current = saved.id;
        draftCourseIdRef.current = saved.id;
        clearCourseEditDraft(userId, saved.id);

        const formValues = toCourseFormValues(saved);
        reset(formValues);
        editorRef.current?.setMarkdown(formValues.description ?? "");
        setPublishedAt(formValues.publishedAt);
        setCourseParts(saved.courseParts ?? []);
        setCoursePartsChanged(false);
        setDraftRestoredAt(null);
        setSavedAt(new Date());
        onSaved(saved);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка сохранения");
      } finally {
        setSaving(false);
      }
    };

    const publishCourse = async () => {
      const nextPublishedAt = new Date();
      setPublishedAt(nextPublishedAt);
      setValue("publishedAt", nextPublishedAt, { shouldDirty: true });
      await form.handleSubmit(onSubmit)();
    };

    useHotkeys("ctrl+s", (event) => {
      event.preventDefault();
      syncMarkdown(false);
      void form.handleSubmit(onSubmit)();
    });

    const reorderCourseParts = (parts: CoursePartEditData[], from: number, to: number) => {
      if (from === to || from < 0 || to < 0) return parts;
      const next = [...parts];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((part, index) => ({ ...part, sortOrder: index + 1 }));
    };

    const onCoursePartSaved = (part: CoursePartEditData) => {
      setCourseParts((current) =>
        current.map((item) => (item.id === part.id ? part : item)),
      );
      setCoursePartsChanged(true);
    };
  
    const onCoursePartDeleted = (part: CoursePartEditData) => {
      setCourseParts((current) => current.filter((item) => item.id !== part.id));
      setCoursePartsChanged(true);
    };

    const onCoursePartAdd = () => {
      const newPart = {
        id: -Date.now(),
        name: "",
        description: "",
        sortOrder: courseParts.length + 1,
        deadlineDays: null,
        publishedAt: null,
      } as CoursePartEditData;
      setCourseParts([...courseParts, newPart]);
      setCoursePartsChanged(true);
    };
  
  
  
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
                Редактор курса
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              {isDirty || coursePartsChanged
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
          </div>
          <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={
              saving ||
              (!isDirty && !coursePartsChanged && !draftRestoredAt)
            }
          >            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
          {savedAt && !isDirty && (
            <Button
              variant="secondary"
              type="button"
              disabled={saving || !!publishedAt}
              onClick={() => void publishCourse()}
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
  <div className="grid gap-4">
    <Field>
      <FieldLabel
      htmlFor="name">Название курса <span className="text-destructive text-sm">*</span></FieldLabel>
      <Input
      id="name"
      {...register("name")}
      aria-invalid={!!errors.name}
      placeholder="Введите название курса"
      />
      <FieldError errors={[errors.name]} />
    </Field>
    <Field
              className="w-full grid-cols-[100%] overflow-hidden"
              data-invalid={!!errors.description || undefined}
            >
              <FieldLabel>Описание курса <span className="text-destructive text-sm">*</span></FieldLabel>
              <ForwardRefEditor
                key={course.id < 1 ? "new" : course.id}
                className="w-full"
                ref={editorRef}
                markdown={description ?? ""}
                onChange={(value) => {
                  const prev = getValues("description");
                  if (value === prev) return;
                  setValue("description", value as string, {
                    shouldDirty: true,
                    shouldValidate: !!errors.description,
                  });
                }}
                placeholder="Начните писать описание курса…"
              />
              <FieldError errors={[errors.description]} />
            </Field>
    <div className="grid gap-4">
    <Field data-invalid={!!errors.cover || undefined}>
              <FieldLabel>Обложка курса (необязательно)</FieldLabel>
              {cover ? (
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm relative">
                  <img src={coverUrl ?? ""} alt={cover?.originalName ?? "Обложка курса"} className="size-16 object-cover w-full h-auto aspect-video object-center object-cover" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 absolute top-0 right-0"
                    onClick={() =>
                      setValue("cover", null, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    <XIcon className="size-4" />
                    <span className="sr-only">Удалить обложку</span>
                  </Button>
                </div>
              ) : (
                <FileUploader
                  onUploaded={(files: FileModel[]) => {
                    const file = files[0];
                    if (!file) return;
                    setValue(
                      "cover",
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
              <FieldError errors={[errors.cover]} />
            </Field>
    
    </div>

    </div>
 <div className="sm:grid-cols-2 grid gap-4">
      <div className="flex gap-2 items-center">
        <Checkbox
        id="needEnrollment"
        aria-invalid={!!errors.needEnrollment}
        checked={needEnrollment === true}
        onCheckedChange={(checked) => {
          setValue("needEnrollment", checked === true, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
        />
        <Label htmlFor="needEnrollment">Требуется регистрация</Label>
      </div>
      <Field data-invalid={!!errors.level || undefined}>
        <FieldLabel htmlFor="level">Уровень курса <span className="text-destructive text-sm">*</span></FieldLabel>
        <Select
        id="level"
        items={[{ value: "beginner", label: "Начальный" }, { value: "intermediate", label: "Средний" }, { value: "advanced", label: "Продвинутый" }]}
        value={level}
        onValueChange={(value) => {
          setValue("level", value as CourseLevel, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
        >
          <SelectTrigger className="min-h-11">
            <SelectValue placeholder="Выберите уровень курса" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Начальный</SelectItem>
            <SelectItem value="intermediate">Средний</SelectItem>
            <SelectItem value="advanced">Продвинутый</SelectItem>
          </SelectContent>
        </Select>
        <FieldError errors={[errors.level]} />
      </Field>
      <Field data-invalid={!!errors.categoryId || undefined}>
        <FieldLabel htmlFor="category">Категория курса <span className="text-destructive text-sm">*</span></FieldLabel>
        <InputSelect
        value={categoryId != null ? categoryId.toString() : ""}
        options={categories.map((category) => ({
          value: category.id.toString(),
          label: category.name,
        }))}
        creatable
        onCreateOption={(input) => {
          const newCategory = {
            id: -Date.now(),
            name: input.trim(),
            slug: input
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9а-яё]+/gi, "-")
              .replace(/^-+|-+$/g, ""),
          };
          setCategories([...categories, newCategory]);
          return {
            value: newCategory.id.toString(),
            label: newCategory.name,
          };
        }}
        onValueChange={(value) => {
          setValue("categoryId", Number(value), {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
        >
          {(provided) => <InputSelectTrigger {...provided} />}
        </InputSelect>
        <FieldError errors={[errors.categoryId]} />
      </Field>
      <Field data-invalid={!!errors.tags || undefined}>
        <FieldLabel htmlFor="tags">Теги курса</FieldLabel>
        <InputMultiSelect
        creatable
        value={tagsValue ?? []}
        options={tags.map((tag) => ({
          value: tag.tag,
          label: tag.tag,
        }))}
        onValueChange={(value) => {
          setValue("tags", value, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
        >
          {(provided) => <InputMultiSelectTrigger {...provided} />}
        </InputMultiSelect>
        <FieldError errors={[errors.tags]} />
      </Field>
      <Field data-invalid={!!errors.deadlineDays || undefined}>
        <FieldLabel htmlFor="deadlineDays">Срок выполнения курса (необязательно)</FieldLabel>
        <Input
        id="deadlineDays"
        type="number"
        min={0}
        className="h-11"
        placeholder="Значение в днях"
        {...register("deadlineDays", {
          setValueAs: (value) => {
            if (value === "" || value == null) return null;
            const parsed = Number(value);
            return Number.isNaN(parsed) ? Number.NaN : parsed;
          },
        })}
        aria-invalid={!!errors.deadlineDays}
      />
      <FieldError errors={[errors.deadlineDays]} />
      </Field>
      <Field data-invalid={!!errors.language || undefined}>
        <FieldLabel htmlFor="language">Язык курса <span className="text-destructive text-sm">*</span></FieldLabel>
        <InputSelect
        value={language ?? "ru"}
        options={[
          { value: "ru", label: "Русский" },
          { value: "en", label: "Английский" },
          { value: "es", label: "Испанский" },
          { value: "fr", label: "Французский" },
          { value: "de", label: "Немецкий" },
          { value: "it", label: "Итальянский" },
          { value: "pt", label: "Португальский" },
          { value: "ja", label: "Японский" },
          { value: "zh", label: "Китайский" },
        ]}
        creatable
        onCreateOption={(input) => {
          return {
            value: input,
            label: input,
          };
        }}
        onValueChange={(value) => {
          setValue("language", value as string, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
        >
          {(provided) => <InputSelectTrigger {...provided} />}
        </InputSelect>
        <FieldError errors={[errors.language]} />
      </Field>
 </div>
 <DragDropProvider
                onDragEnd={(event) => {
                  if (event.canceled) return;
                  const { source } = event.operation;
                  if (!isSortable(source)) return;
                  setCourseParts((current) =>
                    reorderCourseParts(current, source.initialIndex, source.index),
                  );
                  setCoursePartsChanged(true);
                }}
              >
            <div className="flex flex-col gap-4">
              {courseParts.map((part, index) => (
                <CoursePartEdit
                  key={part.id}
                  index={index}
                  part={part}
                  onSaved={onCoursePartSaved}
                  onDeleted={onCoursePartDeleted}
                />
              ))}
              <Button type="button" onClick={onCoursePartAdd} className="min-h-11">Добавить часть курса <PlusIcon className="size-4" /></Button>
            </div>
            </DragDropProvider>
    </form>
    </FormProvider>
  );
}