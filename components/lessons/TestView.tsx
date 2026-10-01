"use client";

import { LessonFullDto, TestAnswerReturnData, TestAnswerWrite } from "@/app/lib/lessons";
import { Timer, CircleDashedCheck, PlayCircle, PauseCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import TestQuestion from "./TestQuestion";
import { cn } from "@/lib/utils";

type AttemptWithAnswers = {
  id: number;
  attemptNumber?: number;
  startedAt?: string | Date;
  submittedAt: string | Date | null;
  score: number | null;
  maxScore: number | null;
  passed: boolean | null;
  answers?: Array<{
    questionId: number;
    answerText: string | null;
    answerFileId: number | null;
    selectedOptions?: Array<{ optionId: number }>;
    optionIds?: Array<{ optionId: number; isCorrect: boolean | null }>;
    isCorrect?: boolean | null;
  }>;
  selectedAnswers?: Array<{
    questionId: number;
    answerText: string | null;
    answerFileId: number | null;
    selectedOptions: Array<{ optionId: number }>;
  }>;
};

function answersFromAttempt(attempt: AttemptWithAnswers): TestAnswerWrite[] {
  if (attempt.selectedAnswers?.length) {
    return attempt.selectedAnswers.map((answer) => ({
      questionId: answer.questionId,
      answerText: answer.answerText,
      answerFileId: answer.answerFileId,
      optionIds: answer.selectedOptions.map((option) => option.optionId),
    }));
  }

  return (attempt.answers ?? []).map((answer) => ({
    questionId: answer.questionId,
    answerText: answer.answerText,
    answerFileId: answer.answerFileId,
    optionIds:
      answer.selectedOptions?.map((option) => option.optionId) ??
      answer.optionIds?.map((option) => option.optionId) ??
      [],
  }));
}

/** Оставшиеся секунды: timeLimit − (сейчас − startedAt). */
function remainingSecondsFromStart(
  startedAt: string | Date | undefined,
  timeLimitSeconds: number | null | undefined,
): number | null {
  if (timeLimitSeconds == null) return null;
  if (!startedAt) return timeLimitSeconds;
  const startedMs = new Date(startedAt).getTime();
  if (Number.isNaN(startedMs)) return timeLimitSeconds;
  const elapsedSec = Math.floor((Date.now() - startedMs) / 1000);
  return Math.max(0, timeLimitSeconds - elapsedSec);
}

export default function TestView({
  lesson,
  onAttemptSubmitted,
}: {
  lesson: LessonFullDto;
  onAttemptSubmitted?: (result: {
    score: number | null;
    maxScore: number | null;
    passed: boolean | null;
  }) => void;
}) {
  const timeLimit = lesson.timeLimitSeconds;
  const [isStarted, setIsStarted] = useState(false);
  const [remainingTime, setRemainingTime] = useState(timeLimit ?? 0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testAttempt, setTestAttempt] = useState<AttemptWithAnswers | null>(null);
  const [reviewAnswers, setReviewAnswers] = useState<TestAnswerReturnData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attemts, setAttemts] = useState<AttemptWithAnswers[]>([]);
  const [answers, setAnswers] = useState<TestAnswerWrite[]>([]);
  const [isViewing, setIsViewing] = useState(false);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const answersRef = useRef(answers);
  const submittingRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const saveAnswers = useCallback(
    async (submit: boolean) => {
      if (!testAttempt || submittingRef.current) return null;
      if (submit) submittingRef.current = true;

      setIsSaving(true);
      setError(null);
      try {
        const response = await fetch(`/api/test-attempt/${testAttempt.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: answersRef.current,
            submit,
          }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Не удалось сохранить ответы");
        }
        const data = (await response.json()) as AttemptWithAnswers & {
          answers?: TestAnswerReturnData[];
        };
        if (submit) {
          setTestAttempt(data);
          setIsSubmitted(true);
          setIsStarted(false);
          if (Array.isArray(data.answers) && data.answers[0] && "isCorrect" in data.answers[0]) {
            setReviewAnswers(data.answers as TestAnswerReturnData[]);
          }
          onAttemptSubmitted?.({
            score: data.score ?? null,
            maxScore: data.maxScore ?? null,
            passed: data.passed ?? null,
          });
        }
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка сохранения");
        if (submit) submittingRef.current = false;
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [testAttempt, onAttemptSubmitted],
  );

  const handleAnswerChange = (answer: TestAnswerWrite) => {
    if (isSubmitted) return;
    setAnswers((current) => {
      const index = current.findIndex((item) => item.questionId === answer.questionId);
      if (index === -1) return [...current, answer];
      const next = [...current];
      next[index] = answer;
      return next;
    });
  };


  const getTestAttempt = async () => {
    try {
      const response = await fetch(`/api/test/${lesson.id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        if (response.status === 404) return;
        throw new Error("Не удалось получить попытку теста");
      }
      const data = (await response.json()) as AttemptWithAnswers[];
      setAttemts(data);
      const currentAttempt = data.find((attempt) => attempt.submittedAt == null);
      if (currentAttempt) {
        setTestAttempt(currentAttempt);
        setAnswers(answersFromAttempt(currentAttempt));
        const left = remainingSecondsFromStart(currentAttempt.startedAt, timeLimit);
        if (left != null) {
          setRemainingTime(left);
        }
        setIsStarted(true);
        setIsSubmitted(false);
        submittingRef.current = false;
      } else {
        setTestAttempt(null);
        setIsStarted(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setTestAttempt(null);
      setIsStarted(false);
    }
  };

  useEffect(() => {
    getTestAttempt();
  }, [lesson.id]);

  useEffect(() => {
    if (!isStarted || !testAttempt || isSubmitted || isViewing || answers.length === 0) return;
    const timer = setTimeout(() => {
      void saveAnswers(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [answers, isStarted, testAttempt, isSubmitted, isViewing, saveAnswers]);


  useEffect(() => {
    if (!isStarted || isSubmitted || isViewing || !timeLimit) return;
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isStarted, isSubmitted, isViewing, timeLimit]);

  useEffect(() => {
    if (!isStarted || isSubmitted || isViewing || !timeLimit) return;
    if (remainingTime === 0) {
      void saveAnswers(true);
    }
  }, [remainingTime, isStarted, isSubmitted, isViewing, timeLimit, saveAnswers]);

  const createTestAttempt = async () => {
    setError(null);
    try {
      const response = await fetch(`/api/test/${lesson.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Не авторизован");
        }
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Не удалось создать попытку теста");
      }
      const data = (await response.json()) as AttemptWithAnswers;
      setTestAttempt(data);
      setAnswers(answersFromAttempt(data));
      const left = remainingSecondsFromStart(data.startedAt, timeLimit);
      if (left != null) {
        setRemainingTime(left);
      }
      if (data.submittedAt) {
        setIsSubmitted(true);
      } else {
        setIsSubmitted(false);
        submittingRef.current = false;
      }
      setIsStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setTestAttempt(null);
      setIsStarted(false);
    }
  };

  const handleStartTest = () => {
    void createTestAttempt();
  };

  const handleSubmitTest = () => {
    void saveAnswers(true);
  };

  const exitReview = () => {
    setIsViewing(false);
    setIsStarted(false);
    setIsSubmitted(false);
    setTestAttempt(null);
    setReviewAnswers([]);
    setAnswers([]);
    submittingRef.current = false;
    void getTestAttempt();
  };

  const handleViewAttempt = async (attemptId: number) => {
    if (!lesson.reviewEnabled) {
      setError("Просмотр ответов отключён");
      return;
    }
    setIsLoadingReview(true);
    setError(null);
    try {
      const response = await fetch(`/api/test-attempt/${attemptId}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Не удалось загрузить попытку");
      }
      const data = (await response.json()) as AttemptWithAnswers & {
        answers?: TestAnswerReturnData[];
      };
      setIsViewing(true);
      setIsStarted(true);
      setIsSubmitted(true);
      submittingRef.current = true;
      setTestAttempt(data);
      setAnswers(answersFromAttempt(data));
      setReviewAnswers(
        Array.isArray(data.answers) ? (data.answers as TestAnswerReturnData[]) : [],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки попытки");
    } finally {
      setIsLoadingReview(false);
    }
  };

  return (
    <div className="mt-4">
      {error && (
        <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <div className="text-gray-700 dark:text-gray-300 mb-4">
        {lesson.maxAttempts
          ? `Максимальное количество попыток для прохождения теста: ${lesson.maxAttempts}. `
          : "Количество попыток не ограничено. "}
        {lesson.reviewEnabled
          ? "После прохождения теста вы сможете просмотреть ответы на вопросы. "
          : ""}
        {lesson.manualGrading ? "Тест будет отправлен на проверку преподавателю." : ""}
      </div>
      <div className="mt-8">
        <span className="text-lg font-bold">Осталось попыток: {lesson.maxAttempts ? lesson.maxAttempts - attemts.length : "Не ограничено"}</span>
        <span className="block text-sm text-gray-500 dark:text-gray-400">Максимальное количество попыток: {lesson.maxAttempts ?? "Не ограничено"}</span>
      </div>
      {attemts.length > 0 && (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {attemts.map((attempt) => (
            <div
              key={attempt.id}
              className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm"
            >
              <div className="text-lg font-bold">
                Попытка {attempt.attemptNumber ?? "—"}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Результат: {attempt.score ?? "—"} / {attempt.maxScore ?? "—"}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Дата:{" "}
                {attempt.submittedAt
                  ? new Date(attempt.submittedAt).toLocaleDateString()
                  : "Не завершена"}
              </div>
              <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Статус:{" "}
                <span
                  className={cn(
                    attempt.passed === true
                      ? "text-green-500"
                      : attempt.passed === false
                        ? "text-red-500"
                        : lesson.manualGrading
                          ? "text-yellow-500"
                          : "text-gray-500",
                  )}
                >
                  {attempt.passed === true
                    ? "Зачёт"
                    : attempt.passed === false
                      ? "Не зачёт"
                      : lesson.manualGrading
                        ? "Ожидает проверки преподавателя"
                        : attempt.submittedAt
                          ? "Завершена"
                          : "В процессе"}
                </span>
              </div>
              {attempt.submittedAt && lesson.reviewEnabled && (
                <Button
                  variant="outline"
                  disabled={isLoadingReview}
                  onClick={() => void handleViewAttempt(attempt.id)}
                  className="mt-2"
                >
                  Просмотреть попытку
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="flex gap-2">
          <Timer className="w-8 h-8" />
          <div>
            <div>
              <span>Ограничение по времени: </span>
              <span className="text-gray-500 dark:text-gray-400">
                {timeLimit ? formatTime(timeLimit) : "Без ограничения"}
              </span>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              После этого времени тест будет завершен автоматически.
            </div>
          </div>
        </div>
        <div className="flex md:justify-end md:text-right gap-2">
          <CircleDashedCheck className="w-8 h-8 md:order-last" />
          <div>
            <div>
              <span>Проходной балл: </span>
              <span className="text-gray-500 dark:text-gray-400">
                {lesson.passingScore ?? 0}
              </span>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Максимальное количество баллов: {lesson.points ?? 0}.
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-4 justify-between items-center mt-8">
        {!isStarted &&
          (!lesson.maxAttempts || attemts.filter((a) => a.submittedAt).length < (lesson.maxAttempts ?? 0)) && (
          <Button
            variant="outline"
            className="flex-1 text-lg cursor-pointer p-6 sm:flex-none"
            onClick={handleStartTest}
          >
            <PlayCircle className="w-5 h-5 mr-2" />
            Начать тест
          </Button>
        )}
        {isViewing && (
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={exitReview}>
            К списку попыток
          </Button>
        )}
        {timeLimit && isStarted && !isViewing ? (
          <div className="flex flex-col">
            <div className="text-sm text-gray-500 dark:text-gray-400">Осталось:</div>
            <div className="text-2xl font-bold">{formatTime(remainingTime)}</div>
          </div>
        ) : null}
      </div>
      {isStarted && (
        <div className="mt-4 flex flex-col gap-6">
          {lesson.testQuestions.map((question) => (
            <TestQuestion
              key={question.id}
              question={question}
              isSubmitted={isSubmitted}
              answerResult={reviewAnswers.find(
                (answer) => answer.questionId === question.id,
              )}
              value={answers.find((answer) => answer.questionId === question.id)}
              onChange={handleAnswerChange}
            />
          ))}
        </div>
      )}
      {isStarted && !isSubmitted && !isViewing && (
        <div className="mt-8 flex items-center gap-4">
          <Button
            variant="destructive"
            className="flex-1 text-lg cursor-pointer p-6 sm:flex-none"
            disabled={isSaving || !testAttempt}
            onClick={handleSubmitTest}
          >
            <PauseCircle className="w-5 h-5 mr-2" />
            Завершить тест
          </Button>
          {isSaving && (
            <span className="text-sm text-muted-foreground">Сохранение…</span>
          )}
        </div>
      )}
      {isSubmitted && testAttempt && (
        <div className="mt-8 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          Тест завершён.
          {testAttempt.score != null && testAttempt.maxScore != null
            ? ` Результат: ${testAttempt.score} / ${testAttempt.maxScore}.`
            : ""}
          {testAttempt.passed === true
            ? " Зачёт."
            : testAttempt.passed === false
              ? " Не зачёт."
              : lesson.manualGrading
                ? " Ожидает проверки преподавателя."
                : ""}
        </div>
      )}
    </div>
  );
}
