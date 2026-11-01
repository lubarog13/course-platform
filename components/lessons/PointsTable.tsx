"use client";

import type { LessonType } from "@prisma/client";
import type { CoursePartDto, LessonDto } from "@/app/lib/courseParts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type PointsRow = {
  id: number;
  name: string;
  type: LessonType;
  completed: boolean;
  earnedPoints: number | null;
  maxPoints: number;
  deadline: Date | string | null;
};

function typeLabel(type: LessonType) {
  if (type === "text") return "Текст";
  if (type === "video") return "Видео";
  return "Тест";
}

function formatDeadline(deadline: Date | string | null) {
  if (!deadline) return "—";
  const date = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU");
}

function isDeadlinePassed(deadline: Date | string | null) {
  if (!deadline) return false;
  const date = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function buildRows(courseParts: CoursePartDto[]): PointsRow[] {
  return courseParts.flatMap((part) =>
    part.lessons.map((lesson: LessonDto) => ({
      id: lesson.id,
      name: lesson.name,
      type: lesson.type,
      completed: Boolean(lesson.userProgress?.completed),
      earnedPoints:
        lesson.userProgress?.points != null ? lesson.userProgress.points : null,
      maxPoints: lesson.points ?? 0,
      deadline: part.userProgress?.deadline ?? null,
    })),
  );
}

function StatusCell({ row }: { row: PointsRow }) {
  const pointsText =
    row.earnedPoints != null
      ? `${row.earnedPoints}/${row.maxPoints}`
      : `0/${row.maxPoints}`;

  if (row.completed) {
    return (
      <span className="text-green-600 dark:text-green-500">
        Пройден · {pointsText}
      </span>
    );
  }

  return (
    <span className="text-muted-foreground">
      Не пройден · {pointsText}
    </span>
  );
}

export default function PointsTable({
  courseParts,
  className,
  onSelectLesson,
}: {
  courseParts: CoursePartDto[];
  className?: string;
  onSelectLesson?: (lessonId: number) => void;
}) {
  const rows = buildRows(courseParts);

  if (rows.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Нет уроков для отображения баллов
      </p>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Урок</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Дедлайн</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} onClick={() => onSelectLesson?.(row.id)} className="cursor-pointer hover:bg-muted">
              <TableCell className="max-w-[220px] truncate whitespace-normal font-medium">
                {row.name}
              </TableCell>
              <TableCell>{typeLabel(row.type)}</TableCell>
              <TableCell>
                <StatusCell row={row} />
              </TableCell>
              <TableCell
                className={cn(
                  isDeadlinePassed(row.deadline) && "text-muted-foreground",
                )}
              >
                {formatDeadline(row.deadline)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
