"use client";

import { useCallback, useEffect, useState } from "react";
import type { CourseStudentProgressItem } from "@/app/lib/enrollment";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ListResponse = {
  items: CourseStudentProgressItem[];
  total: number;
  limit: number;
  offset: number;
  totalLessons: number;
  maxPoints: number;
};

function studentName(user: CourseStudentProgressItem["user"]) {
  return [user.surname, user.name, user.patronymic].filter(Boolean).join(" ");
}

function formatDeadline(deadline: Date | string | null) {
  if (!deadline) return "—";
  const date = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU");
}

function isDeadlinePassed(row: CourseStudentProgressItem): string {
  if (!row.deadline) return "";
  const date = row.deadline instanceof Date ? row.deadline : new Date(row.deadline);
  if (Number.isNaN(date.getTime())) return "";
  if (row.progress >= 100) return "text-muted-foreground";
  return date.getTime() < Date.now() ? "text-red-600" : "";
}

function ProgressCell({ row }: { row: CourseStudentProgressItem }) {
  const pointsText = `${row.earnedPoints}/${row.maxPoints}`;
  const lessonsText = `${row.completedLessons}/${row.totalLessons}`;

  if (row.status === "completed" || row.progress >= 100) {
    return (
      <span className="text-green-600 dark:text-green-500">
        Пройден · {pointsText}
      </span>
    );
  }

  return (
    <span className="text-muted-foreground">
      {row.progress}% · {lessonsText} · {pointsText}
    </span>
  );
}

export default function StudentPointsTable({
  courseSlug,
  className,
}: {
  courseSlug: string;
  className?: string;
}) {
  const [items, setItems] = useState<CourseStudentProgressItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(
    async (nextOffset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/course/${encodeURIComponent(courseSlug)}/students?limit=${limit}&offset=${nextOffset}`,
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Не удалось загрузить студентов");
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
    [courseSlug],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  if (loading && items.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Загрузка студентов…
      </p>
    );
  }

  if (error) {
    return (
      <p
        className={cn(
          "rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive",
          className,
        )}
      >
        {error}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        На курс пока никто не записан
      </p>
    );
  }

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Студент</TableHead>
            <TableHead>Прогресс</TableHead>
            <TableHead>Дедлайн</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row.enrollmentId}>
              <TableCell className="max-w-[240px] whitespace-normal font-medium">
                <div>{studentName(row.user)}</div>
                <div className="text-muted-foreground text-xs font-normal">
                  {row.user.email}
                </div>
              </TableCell>
              <TableCell>
                <ProgressCell row={row} />
              </TableCell>
              <TableCell
                className={isDeadlinePassed(row)}
              >
                {formatDeadline(row.deadline)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
