"use client";

import { useEffect, useRef, useState } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { FormProvider, useForm, useWatch, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type CourseFormValues, courseFormSchema, toCourseFormValues } from "./courseForm";
import { loadCourseEditDraft, saveCourseEditDraft } from "./courseEditDraft";

import type { CourseFullDto } from "@/app/lib/courses";
import type { CoursePartEditData } from "@/app/lib/courseParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ForwardRefEditor } from "../base/ForwardRefEditor";
import { FileIcon, XIcon } from "lucide-react";
import FileUploader from "@/components/base/FileUploader";
import type { File as FileModel } from "@/app/lib/models";
import { Checkbox } from "@/components/ui/checkbox";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { CourseLevel } from "@/app/lib/models";
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/input-multiselect";
import { InputSelect, InputSelectTrigger } from "@/components/ui/input-select";
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
let filtersRequest: Promise<{ tags: TagOption[], categories: { name: string, slug: string }[] }> | null = null;

function loadFilterTags(signal: AbortSignal): Promise<{ tags: TagOption[], categories: { name: string, slug: string }[] }> {
  if (!filtersRequest) {
    filtersRequest = fetch("/api/filters")
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить фильтры");
        return res.json() as Promise<{ tags: TagOption[], categories: { name: string, id: number, slug: string }[] }>;
      })
      .then((data) =>{
        const tags = [...data.tags].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
        const categories = [...data.categories].sort((a, b) => a.name.localeCompare(b.name));
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
    const openedCourseId = useRef<number>(course.id);
    const cover = useWatch({ control, name: "cover" });

    const draftCourseIdRef = useRef<number>(course.id);
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
    useEffect(() => {
        if (openedCourseId.current === course.id) return;
        openedCourseId.current = course.id;
        draftCourseIdRef.current = course.id;
    
        const draft = loadCourseEditDraft(userId, course.id);
        if (draft) {
          reset(draft.values);
          editorRef.current?.setMarkdown(draft.values.description ?? "");
          setPublishedAt(
            draft.publishedAt ? new Date(draft.publishedAt) : draft.values.publishedAt,
          );
          setCourseParts(draft.courseParts ?? []);
          setCoursePartsChanged(true);
          setDraftRestoredAt(new Date(draft.updatedAt));
          setSavedAt(null);
          setError(null);
          return;
        }
    
        const values = toCourseFormValues(course);
        reset(values);
        editorRef.current?.setMarkdown(values.description ?? "");
        setPublishedAt(values.publishedAt);
        setCourseParts(course.courseParts);
        setCoursePartsChanged(false);
        setDraftRestoredAt(null);
        setSavedAt(null);
        setError(null);
      }, [course, reset, userId]);
    
    useEffect(() => {
        if (!isDirty && !coursePartsChanged && !draftRestoredAt) return;
    
        const persist = () => {
          saveCourseEditDraft(userId, draftCourseIdRef.current, {
            values: {
              ...getValues(),
              description: editorRef.current?.getMarkdown() ?? getValues("description"),
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

    const onSubmit: SubmitHandler<CourseFormValues> = async (values) => {
      setSaving(true);
      setError(null);
      try {
        const markdown = syncMarkdown(false);
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
      htmlFor="name">Название курса</FieldLabel>
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
              <FieldLabel>Описание курса</FieldLabel>
              <ForwardRefEditor
                key={course.id < 1 ? "new" : course.id}
                className="w-full"
                ref={editorRef}
                markdown={getValues("description") as string}
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
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <img src={cover.url} alt={cover.originalName} className="size-16 object-cover" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
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
        checked={getValues("needEnrollment")}
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
        <FieldLabel htmlFor="level">Уровень курса</FieldLabel>
        <Select
        id="level"
        items={[{ value: "beginner", label: "Начальный" }, { value: "intermediate", label: "Средний" }, { value: "advanced", label: "Продвинутый" }]}
        value={getValues("level")}
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
        <FieldLabel htmlFor="category">Категория курса</FieldLabel>
        <InputSelect
        value={getValues("categoryId")?.toString() ?? ""}
        options={categories.map((category) => ({
          value: category.id.toString(),
          label: category.name,
        }))}
        creatable
        onCreateOption={(input) => {
          const newCategory = {
            id: categories.length + 1,
            name: input,
            slug: input.toLowerCase().replace(/ /g, "-"),
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
        value={getValues("tags") ?? []}
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
        <FieldLabel htmlFor="language">Язык курса</FieldLabel>
        <InputSelect
        value={getValues("language")}
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
        
      </form>
    </FormProvider>
  );
}