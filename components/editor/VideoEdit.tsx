"use client";

import { useFormContext, useWatch } from "react-hook-form";

import type { VideoPlatform } from "@/app/lib/models";
import type { File as FileModel } from "@/app/lib/models";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import FileUploader from "../base/FileUploader";
import type { LessonFormValues } from "../lessons/lessonForm";

const platforms: { value: VideoPlatform; label: string }[] = [
  { value: "youtube", label: "YouTube" },
  { value: "rutube", label: "Rutube" },
  { value: "self_hosted", label: "Загрузить файл" },
  { value: "other", label: "Другое" },
];

export default function VideoEdit({ onDurationChanged }: { onDurationChanged: () => void }) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<LessonFormValues>();

  const platform = useWatch({ control, name: "video.platform" });
  const videoErrors = errors.video;

  const handleUploaded = (files: FileModel[]) => {
    const file = files[0];
    if (!file) return;
    setValue("video.url", file.url ?? "", { shouldDirty: true, shouldValidate: true });
    if (file.originalName) {
      setValue("video.title", file.originalName, { shouldDirty: true });
    }
    onDurationChanged();
  };

  return (
    <div>
      <FieldLabel>Платформа</FieldLabel>
      <ButtonGroup className="my-4">
        {platforms.map((item) => (
          <Button
            key={item.value}
            type="button"
            className={
              platform === item.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }
            onClick={() =>
              setValue("video.platform", item.value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            {item.label}
          </Button>
        ))}
      </ButtonGroup>

      {platform !== "self_hosted" && (
        <Field className="my-4" data-invalid={!!videoErrors?.url || undefined}>
          <FieldLabel htmlFor="video-url">URL</FieldLabel>
          <Input
            id="video-url"
            type="text"
            aria-invalid={!!videoErrors?.url}
            placeholder="https://…"
            {...register("video.url")}
          />
          <FieldError errors={[videoErrors?.url]} />
        </Field>
      )}

      {platform === "self_hosted" && (
        <>
          <Field className="my-4">
            <FieldLabel>Файл видео (форматы: mp4, mov, avi, mkv, webm)</FieldLabel>
            <FileUploader onUploaded={handleUploaded} />
          </Field>
          <Field className="my-4" data-invalid={!!videoErrors?.url || undefined}>
            <FieldLabel htmlFor="video-file-url">URL</FieldLabel>
            <Input
              id="video-file-url"
              type="text"
              disabled
              aria-invalid={!!videoErrors?.url}
              {...register("video.url")}
            />
            <FieldError errors={[videoErrors?.url]} />
          </Field>
        </>
      )}

      <Field className="my-4" data-invalid={!!videoErrors?.title || undefined}>
        <FieldLabel htmlFor="video-title">Название видео</FieldLabel>
        <Input id="video-title" type="text" {...register("video.title")} />
        <FieldError errors={[videoErrors?.title]} />
      </Field>

      <Field className="my-4" data-invalid={!!videoErrors?.durationSeconds || undefined}>
        <FieldLabel htmlFor="video-duration">Длительность (секунды)</FieldLabel>
        <Input
          id="video-duration"
          type="number"
          min={0}
          aria-invalid={!!videoErrors?.durationSeconds}
          {...register("video.durationSeconds", {
            setValueAs: (value) => {
              if (value === "" || value == null) return null;
              const parsed = Number(value);
              return Number.isNaN(parsed) ? Number.NaN : parsed;
            },
          })}
        />
        <FieldError errors={[videoErrors?.durationSeconds]} />
      </Field>

      {platform === "self_hosted" && (
        <Field className="my-4" data-invalid={!!videoErrors?.thumbnailUrl || undefined}>
          <div className="font-bold text-lg mb-2">Картинка превью</div>
          <FieldLabel htmlFor="video-thumbnail">Ссылка на миниатюру</FieldLabel>
          <Input
            id="video-thumbnail"
            type="text"
            {...register("video.thumbnailUrl")}
          />
          <div className="mt-3">
            <FieldLabel>Или загрузите миниатюру</FieldLabel>
            <FileUploader
              onUploaded={(files) => {
                if (!files[0]?.url) return;
                setValue("video.thumbnailUrl", files[0].url, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
          </div>
          <FieldError errors={[videoErrors?.thumbnailUrl]} />
        </Field>
      )}
    </div>
  );
}
