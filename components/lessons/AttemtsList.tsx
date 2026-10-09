"use client";

import { useCallback, useEffect, useState } from "react";
import type { LessonFullDto, StudentAttemptListItem } from "@/app/lib/lessons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, ClipboardCheckIcon, RefreshCwIcon } from "lucide-react";
import TestViewForTeacher from "./TestViewForTeacher";

type ListResponse = {
  items: StudentAttemptListItem[];
  total: number;
  limit: number;
  offset: number;
};

function studentName(user: StudentAttemptListItem["user"]) {
  return [user.surname, user.name, user.patronymic].filter(Boolean).join(" ");
}

function statusLabel(item: StudentAttemptListItem) {
  if (item.passed === true) return "Зачёт";
  if (item.passed === false) return "Не зачёт";
  if (item.pendingReview) return "Ожидает проверки";
  return "Сдана";
}

export default function AttemptsList({ lesson }: { lesson: LessonFullDto }) {
  const [items, setItems] = useState<StudentAttemptListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeUserId, setGradeUserId] = useState<number | null>(null);
  const limit = 20;

  const load = useCallback(
    async (nextOffset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/test/${lesson.id}?teacher=1&limit=${limit}&offset=${nextOffset}`,
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Не удалось загрузить попытки");
        }
        const data = (await response.json()) as ListResponse;
        setItems(data.items);
        setTotal(data.total);
        setOffset(data.offset);
      } catch (err) {
        setItems([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    },
    [lesson.id],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  if (gradeUserId != null) {
    const student = items.find((item) => item.userId === gradeUserId);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setGradeUserId(null);
              void load(offset);
            }}
          >
            <ArrowLeftIcon className="size-4" />
            К списку попыток
          </Button>
          {student && (
            <p className="text-sm text-muted-foreground">
              Проверка: {studentName(student.user)}
            </p>
          )}
        </div>
        <TestViewForTeacher lesson={lesson} userId={gradeUserId} />
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Попытки студентов
          </h2>
          <p className="text-muted-foreground text-sm">
            Последняя сданная попытка каждого студента. Всего: {total}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void load(offset)}
        >
          <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
          Обновить
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          Пока нет сданных попыток по этому тесту.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.userId}
              className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm"
            >
              <div className="font-medium">{studentName(item.user)}</div>
              <div className="text-muted-foreground text-xs">{item.user.email}</div>
              <div className="mt-2 text-muted-foreground">
                Попытка {item.attemptNumber}
                {item.attemptsCount > 1 ? ` · всего ${item.attemptsCount}` : ""}
              </div>
              <div className="text-muted-foreground">
                Результат: {item.score ?? "—"} / {item.maxScore ?? "—"}
              </div>
              <div className="text-muted-foreground">
                Сдана:{" "}
                {new Date(item.submittedAt).toLocaleString("ru-RU")}
              </div>
              <div className="mb-3 mt-1">
                Статус:{" "}
                <span
                  className={cn(
                    item.passed === true
                      ? "text-green-600 dark:text-green-400"
                      : item.passed === false
                        ? "text-red-600 dark:text-red-400"
                        : "text-amber-600 dark:text-amber-400",
                  )}
                >
                  {statusLabel(item)}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGradeUserId(item.userId)}
              >
                <ClipboardCheckIcon className="size-4" />
                {item.pendingReview ? "Проверить" : "Открыть"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {total > limit && (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || offset <= 0}
            onClick={() => void load(Math.max(0, offset - limit))}
          >
            Назад
          </Button>
          <span className="text-muted-foreground text-xs">
            {offset + 1}–{Math.min(offset + limit, total)} из {total}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || offset + limit >= total}
            onClick={() => void load(offset + limit)}
          >
            Далее
          </Button>
        </div>
      )}
    </div>
  );
}
