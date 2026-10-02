"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LessonFullDto } from "@/app/lib/lessons";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { SaveIcon } from "lucide-react";
import { Button } from "../ui/button";

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
    score?: number | null;
    selectedOptions?: Array<{ optionId: number }>;
    optionIds?: Array<{ optionId: number; isCorrect: boolean | null }>;
    isCorrect?: boolean | null;
  }>;
};

function optionTexts(
  question: LessonFullDto["testQuestions"][number],
  optionIds: number[],
): string {
  if (optionIds.length === 0) return "—";
  return optionIds
    .map((id) => question.options.find((option) => option.id === id)?.text ?? `#${id}`)
    .join(", ");
}

export default function TestViewForTeacher({
  lesson,
  userId,
}: {
  lesson: LessonFullDto;
  userId: number;
}) {
  const [testAttempt, setTestAttempt] = useState<AttemptWithAnswers | null>(null);
  const [questionScores, setQuestionScores] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const loadLatestAttempt = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSavedMessage(null);
    try {
      const response = await fetch(
        `/api/test/${lesson.id}?userId=${userId}&latest=1`,
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Не удалось загрузить попытку");
      }
      const data = (await response.json()) as AttemptWithAnswers;
      setTestAttempt(data);

      const scores: Record<number, number> = {};
      for (const question of lesson.testQuestions) {
        const answer = data.answers?.find((item) => item.questionId === question.id);
        scores[question.id] = answer?.score ?? 0;
      }
      setQuestionScores(scores);
    } catch (err) {
      setTestAttempt(null);
      setQuestionScores({});
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setIsLoading(false);
    }
  }, [lesson.id, lesson.testQuestions, userId]);

  useEffect(() => {
    void loadLatestAttempt();
  }, [loadLatestAttempt]);

  const setQuestionScore = (questionId: number, raw: string) => {
    const question = lesson.testQuestions.find((item) => item.id === questionId);
    const max = question?.score ?? 0;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    const next = Math.max(0, Math.min(max, Math.floor(parsed)));
    setQuestionScores((current) => ({ ...current, [questionId]: next }));
    setSavedMessage(null);
  };

  const totalScore = useMemo(
    () =>
      lesson.testQuestions.reduce(
        (sum, question) => sum + (questionScores[question.id] ?? 0),
        0,
      ),
    [lesson.testQuestions, questionScores],
  );

  const maxScore = useMemo(
    () => lesson.testQuestions.reduce((sum, question) => sum + question.score, 0),
    [lesson.testQuestions],
  );

  const handleSave = async () => {
    if (!testAttempt) return;
    setIsSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const response = await fetch(`/api/test-attempt/${testAttempt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores: lesson.testQuestions.map((question) => ({
            questionId: question.id,
            score: questionScores[question.id] ?? 0,
          })),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Не удалось сохранить оценку");
      }
      const data = (await response.json()) as AttemptWithAnswers;
      setTestAttempt(data);
      const scores: Record<number, number> = {};
      for (const question of lesson.testQuestions) {
        const answer = data.answers?.find((item) => item.questionId === question.id);
        scores[question.id] =
          answer?.score ?? questionScores[question.id] ?? 0;
      }
      setQuestionScores(scores);
      setSavedMessage("Оценка сохранена");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка попытки…</p>;
  }

  if (error && !testAttempt) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!testAttempt) {
    return (
      <p className="text-sm text-muted-foreground">
        У студента нет завершённых попыток по этому тесту.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
        Попытка {testAttempt.attemptNumber ?? "—"}
        {testAttempt.submittedAt
          ? ` · сдана ${new Date(testAttempt.submittedAt).toLocaleString("ru-RU")}`
          : ""}
        {" · "}
        статус:{" "}
        {testAttempt.passed === true
          ? "зачёт"
          : testAttempt.passed === false
            ? "не зачёт"
            : "ожидает проверки"}
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {savedMessage && (
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {savedMessage}
        </p>
      )}

      {lesson.testQuestions.map((question) => {
        const answer = testAttempt.answers?.find(
          (item) => item.questionId === question.id,
        );
        const selectedIds =
          answer?.selectedOptions?.map((option) => option.optionId) ??
          answer?.optionIds?.map((option) => option.optionId) ??
          [];
        const earned = questionScores[question.id] ?? 0;
        const isCorrect =
          answer?.isCorrect ??
          (question.score > 0 ? earned >= question.score : earned > 0);

        return (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-4" key={question.id}>
            <h2 className="font-medium">
              {question.sortOrder}. {question.question}
            </h2>

            {question.type === "single_choice" && (
              <>
                <div className="text-sm text-muted-foreground">
                  <span className="text-foreground">Правильный ответ: </span>
                  {question.options.find((option) => option.isCorrect)?.text ?? "—"}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="text-foreground">Ответ студента: </span>
                  {optionTexts(question, selectedIds)}
                </div>
              </>
            )}

            {question.type === "multiple_choice" && (
              <>
                <div className="text-sm text-muted-foreground">
                  <span className="text-foreground">Правильные ответы: </span>
                  {question.options
                    .filter((option) => option.isCorrect)
                    .map((option) => option.text)
                    .join(", ") || "—"}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="text-foreground">Ответ студента: </span>
                  {optionTexts(question, selectedIds)}
                </div>
              </>
            )}

            {question.type === "text" && (
              <>
                {question.textAnswer && (
                  <div className="text-sm text-muted-foreground">
                    <span className="text-foreground">Правильный ответ: </span>
                    {question.textAnswer}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  <span className="text-foreground">Ответ студента: </span>
                  {answer?.answerText ?? "—"}
                </div>
              </>
            )}

            {question.attachmentNeeded && (
              <div className="text-sm text-muted-foreground">
                <span className="text-foreground">Файл: </span>
                {answer?.answerFileId ? (
                  <a
                    href={`/api/files/${answer.answerFileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Открыть файл #{answer.answerFileId}
                  </a>
                ) : (
                  "не прикреплён"
                )}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Максимум баллов: {question.score}
            </div>
            <div className="text-sm text-muted-foreground">
              Результат: {isCorrect ? "Правильно" : "Неправильно / частично"}
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor={`score-${question.id}`}>Баллы за задание:</Label>
              <Input
                id={`score-${question.id}`}
                type="number"
                min={0}
                max={question.score}
                className="w-24"
                value={earned}
                onChange={(e) => setQuestionScore(question.id, e.target.value)}
              />
            </div>
          </div>
        );
      })}

      <div className="flex gap-2 justify-between items-center">
        <div className="text-sm">
          <span className="font-medium">Итого: </span>
          {totalScore} / {maxScore}
          {lesson.passingScore != null && (
            <span className="text-muted-foreground">
              {" "}
              (проходной: {lesson.passingScore})
            </span>
          )}
        </div>
        <Button
          variant="outline"
          disabled={isSaving || !testAttempt}
          onClick={() => void handleSave()}
        >
          <SaveIcon className="w-4 h-4" />
          {isSaving ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}
