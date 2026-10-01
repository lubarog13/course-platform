"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LessonFullDto } from "@/app/lib/lessons";
import { LessonDto } from "@/app/lib/courseParts";
import { Button } from "../ui/button";
import { ArrowLeftIcon, ArrowRightIcon, EditIcon, FileIcon } from "lucide-react";
import MarkdownContent from "../base/MarkdownContent";
import TestView from "./TestView";
import VideoView from "./VideoView";
import NotFound from "../layout/not-found";
import Loading from "../layout/loading";
import { useRouter } from "next/navigation";
import type { UserLesson } from "@prisma/client";

type LessonViewProps = {
  canEdit: boolean;
  lessonId: number;
  prevLesson?: LessonDto;
  nextLesson?: LessonDto;
  onArrowClick: (lessonId: number) => void;
};

type UpdateLessonProgressProps = {
  completed?: boolean;
  timeSpentSeconds?: number | null;
  videoProgressSeconds?: number | null;
  completedAt?: string | null;
  lastAccessedAt?: string | null;
  keepalive?: boolean;
};

function normalizeUserProgress(raw: unknown): UserLesson | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as UserLesson | undefined) ?? null;
  return raw as UserLesson;
}

export default function LessonView({
  lessonId,
  prevLesson,
  nextLesson,
  canEdit,
  onArrowClick,
}: LessonViewProps) {
  const [lesson, setLesson] = useState<LessonFullDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const progressIdRef = useRef<number | null>(null);
  const enteredAtRef = useRef<number>(Date.now());
  const baseTimeSpentRef = useRef(0);
  const completedRef = useRef(false);
  const flushedRef = useRef(false);
  const lessonTypeRef = useRef<string | null>(null);
  const videoProgressRef = useRef(0);

  const updateLessonProgress = useCallback(
    async ({
      completed,
      timeSpentSeconds,
      videoProgressSeconds,
      completedAt,
      lastAccessedAt,
      keepalive = false,
    }: UpdateLessonProgressProps) => {
      const progressId = progressIdRef.current;
      if (!progressId) return null;

      const body: Record<string, unknown> = {
        lastAccessedAt: lastAccessedAt ?? new Date().toISOString(),
      };

      if (completed !== undefined) {
        body.completed = completed;
        if (completed) {
          body.completedAt = completedAt ?? new Date().toISOString();
          completedRef.current = true;
        }
      }
      if (timeSpentSeconds != null) {
        body.timeSpentSeconds = timeSpentSeconds;
      }
      if (videoProgressSeconds != null) {
        body.videoProgressSeconds = videoProgressSeconds;
      }
      // points студенту через этот endpoint не отправляем — только staff / сервер при сдаче теста

      try {
        const response = await fetch(`/api/user-lesson/${progressId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          keepalive,
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Не удалось обновить прогресс");
        }
        const data = (await response.json()) as UserLesson;
        setLesson((current) =>
          current
            ? {
                ...current,
                userProgress: {
                  ...(current.userProgress ?? {}),
                  ...data,
                } as UserLesson,
              }
            : current,
        );
        if (typeof data.timeSpentSeconds === "number") {
          baseTimeSpentRef.current = data.timeSpentSeconds;
          enteredAtRef.current = Date.now();
        }
        if (data.completed) {
          completedRef.current = true;
        }
        return data;
      } catch (err) {
        if (!keepalive) {
          setError(err instanceof Error ? err.message : "Ошибка прогресса");
        }
        return null;
      }
    },
    [],
  );

  const flushSessionProgress = useCallback(
    (opts?: { completed?: boolean; keepalive?: boolean }) => {
      if (!progressIdRef.current) return;
      const elapsed = Math.max(
        0,
        Math.floor((Date.now() - enteredAtRef.current) / 1000),
      );
      const timeSpentSeconds = baseTimeSpentRef.current + elapsed;
      const autoCompleteText =
        lessonTypeRef.current === "text" && !completedRef.current;
      void updateLessonProgress({
        completed: opts?.completed ?? (autoCompleteText || completedRef.current),
        timeSpentSeconds,
        videoProgressSeconds:
          lessonTypeRef.current === "video" ? videoProgressRef.current : undefined,
        keepalive: opts?.keepalive,
      });
    },
    [updateLessonProgress],
  );

  const fetchLesson = async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lesson/${lessonId}`, { signal });
      if (!res.ok) {
        throw new Error("Урок не найден");
      }
      const data = (await res.json()) as LessonFullDto;
      const userProgress = normalizeUserProgress(data.userProgress);
      const normalized = { ...data, userProgress };
      setLesson(normalized);

      progressIdRef.current = userProgress?.id ?? null;
      baseTimeSpentRef.current = userProgress?.timeSpentSeconds ?? 0;
      completedRef.current = userProgress?.completed ?? false;
      lessonTypeRef.current = normalized.type;
      videoProgressRef.current = userProgress?.videoProgressSeconds ?? 0;
      enteredAtRef.current = Date.now();
      flushedRef.current = false;

      if (userProgress?.id) {
        void updateLessonProgress({
          completed: userProgress.completed,
          lastAccessedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      if (!signal.aborted) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
        setLesson(null);
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchLesson(controller.signal);
    return () => {
      controller.abort();
      if (!flushedRef.current) {
        flushedRef.current = true;
        flushSessionProgress({ keepalive: true });
      }
    };
    // lessonId change / unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useEffect(() => {
    const onLeave = () => {
      if (flushedRef.current) return;
      flushedRef.current = true;
      flushSessionProgress({ keepalive: true });
    };
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [flushSessionProgress]);

  const handleNavigate = (targetLessonId: number) => {
    flushedRef.current = true;
    flushSessionProgress({ keepalive: true });
    onArrowClick(targetLessonId);
  };

  const handleTestSubmitted = (result: {
    score: number | null;
    maxScore: number | null;
    passed: boolean | null;
  }) => {
    const shouldComplete = result.passed === true || result.passed === null;
    // баллы пишет сервер при submit попытки; клиент только completed/timeSpent
    flushSessionProgress({
      completed: shouldComplete || completedRef.current,
    });
  };

  if (!lesson && !loading) {
    return <NotFound text="Урок не найден" showHomeButton={false} />;
  }
  if (loading || !lesson) {
    return <Loading text="Загрузка урока..." />;
  }
  if (error && !loading) {
    return <div>Ошибка: {error}</div>;
  }

  const handleEdit = () => {
    flushedRef.current = true;
    flushSessionProgress({ keepalive: true });
    router.push(`/editor?lessonId=${lessonId}`);
  };

  return (
    <div className="flex flex-col gap-4 container mx-auto sm:px-4 pt-8 min-h-screen relative">
      <div className="flex lg:flex-nowrap flex-wrap justify-between gap-4  border-b border-gray-200 dark:border-gray-800 pb-4">
        {prevLesson ? (
          <div className="flex items-center gap-2 h-10">
            <Button
              variant="outline"
              onClick={() => handleNavigate(prevLesson.id)}
              className="rounded-full h-10 w-10 cursor-pointer"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </Button>
            <div className="hidden sm:block max-w-48 text-left overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
              {prevLesson.name}
            </div>
          </div>
        ) : (
          <div className="flex items-center h-10">
            <Button variant="outline" disabled className="rounded-full h-10 w-10">
              <ArrowLeftIcon className="w-4 h-4" />
            </Button>
          </div>
        )}
        {nextLesson ? (
          <div className="flex items-center gap-2 h-10 lg:order-last  ml-auto">
            <div className="hidden sm:block max-w-48 text-left overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
              {nextLesson.name}
            </div>
            <Button
              variant="outline"
              onClick={() => handleNavigate(nextLesson.id)}
              className="rounded-full h-10 w-10 cursor-pointer"
            >
              <ArrowRightIcon className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="h-10">
            <Button variant="outline" disabled className="rounded-full h-10 w-10">
              <ArrowRightIcon className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div className="text-2xl font-bold lg:flex-1 text-center w-full lg:w-auto flex-shrink-0  order-first lg:order-none">
          {lesson.name}
        </div>
      </div>
      <div className="flex-1 p-6 relative">
        <div className="text-gray-700 dark:text-gray-300 mb-4">{lesson.description}</div>
        {lesson.attachment && (
          <div className="flex items-center gap-2">
            <FileIcon className="w-4 h-4" />
            <a
              href={lesson.attachment.url}
              target="_blank"
              className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-500"
            >
              {lesson.attachment.originalName}
            </a>
          </div>
        )}
        {lesson.type === "text" && (
          <MarkdownContent nodes={lesson.textContent || ""} />
        )}
        {lesson.type === "test" && (
          <TestView lesson={lesson} onAttemptSubmitted={handleTestSubmitted} />
        )}
        {lesson.type === "video" && (
          <VideoView
            lesson={lesson}
            startTimeSeconds={lesson.userProgress?.videoProgressSeconds ?? 0}
            onTimeUpdate={(seconds) => {
              videoProgressRef.current = seconds;
            }}
          />
        )}

        {canEdit && (
          <Button
            variant="secondary"
            size="icon-lg"
            className="absolute right-4 top-4 cursor-pointer rounded-full"
            onClick={handleEdit}
          >
            <EditIcon className="w-10 h-10" />
          </Button>
        )}
      </div>
    </div>
  );
}
