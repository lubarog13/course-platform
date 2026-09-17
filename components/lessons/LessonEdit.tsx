"use client";

import { useEffect, useRef, useState } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";

import type { LessonFullDto } from "@/app/lib/lessons";
import { ForwardRefEditor } from "@/components/base/ForwardRefEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Video } from "@/app/lib/models";
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@/components/ui/button-group"
import VideoEdit from "../editor/VideoEdit";

type LessonEditProps = {
  lesson: LessonFullDto;
  onSaved?: (lesson: LessonFullDto) => void;
};

export default function LessonEdit({ lesson, onSaved }: LessonEditProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const [type, setType] = useState(lesson.type);
  const [name, setName] = useState(lesson.name);
  const [description, setDescription] = useState(lesson.description ?? "");
  const [textContent, setTextContent] = useState(lesson.textContent ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const defaultVideo: Video = { id: -1, url: "", platform: "youtube", title: null,  durationSeconds: null, thumbnailUrl: null };

  useEffect(() => {
    setType(lesson.type);
    setName(lesson.name);
    setDescription(lesson.description ?? "");
    setTextContent(lesson.textContent ?? "");
    editorRef.current?.setMarkdown(lesson.textContent ?? "");
    setSavedAt(null);
    setError(null);
  }, [lesson.id, lesson.name, lesson.description, lesson.textContent, lesson.type]);

  const dirty =
    type !== lesson.type ||
    name !== lesson.name ||
    description !== (lesson.description ?? "") ||
    textContent !== (lesson.textContent ?? "");

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const markdown = editorRef.current?.getMarkdown() ?? textContent;
      const response = await fetch(`/api/lesson/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: type,
          name: name.trim(),
          description: description.trim() || null,
          textContent: markdown,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Не удалось сохранить урок");
      }
      setTextContent(markdown);
      setSavedAt(new Date());
      onSaved?.(body as LessonFullDto);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Редактор урока
            </h1>
            <Badge variant="secondary">{lesson.type}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {dirty
              ? "Есть несохранённые изменения"
              : savedAt
                ? `Сохранено в ${savedAt.toLocaleTimeString("ru-RU")}`
                : "Изменения ещё не сохранялись"}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty || !name.trim()}>
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>

      {error && (
        <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {error}
        </p>
      )}
  
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="lesson-name">Название</Label>
          <Input
            id="lesson-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Название урока"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="lesson-description">Краткое описание</Label>
          <Textarea
            id="lesson-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Коротко, что будет в уроке"
            rows={3}
          />
        </div>

        <ButtonGroup className="mb-4">
          <Button className={type === "text" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"} onClick={() => setType("text")}>Текстовый урок</Button>
          <Button className={type === "video" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"} onClick={() => setType("video")}>Видео урок</Button>
          <Button className={type === "test" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"} onClick={() => setType("test")}>Тест</Button>
        </ButtonGroup>

        {(type !== "test") && (
          <div className="grid gap-2 w-full grid-cols-[100%] overflow-hidden">
            <Label>Текст урока</Label>
            <ForwardRefEditor
            className="w-full"
              ref={editorRef}
              markdown={textContent}
              onChange={setTextContent}
              placeholder="Начните писать урок…"
            />
          </div>
        )}

        {(type === "test") && (
          <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
            Для уроков типа «{lesson.type}» markdown-редактор не используется.
            Здесь можно править название и описание.
          </p>
        )}
        {(type === "video") && (
          <VideoEdit video={lesson.video ?? defaultVideo as Video} onSaved={(video) => onSaved?.({ ...lesson, video })} />
        )}
      </div>
    </div>
  );
}
