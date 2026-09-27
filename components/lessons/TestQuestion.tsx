"use client";

import {
  TestAnswerReturnData,
  TestAnswerWrite,
  TestQuestionDto,
} from "@/app/lib/lessons";
import { Label } from "@/components/ui/label";
import FileUploader from "@/components/base/FileUploader";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "../ui/textarea";
import { cn, declOfNum } from "@/lib/utils";
import { File as FileModel } from "@/app/lib/models";

type Props = {
  question: TestQuestionDto;
  isSubmitted: boolean;
  answerResult?: TestAnswerReturnData;
  value?: TestAnswerWrite;
  onChange: (answer: TestAnswerWrite) => void;
};

export default function TestQuestion({
  question,
  isSubmitted,
  answerResult,
  value,
  onChange,
}: Props) {
  const selectedOptions = value?.optionIds ?? [];
  const answer = value?.answerText ?? "";

  const emit = (patch: Partial<TestAnswerWrite>) => {
    onChange({
      questionId: question.id,
      optionIds: value?.optionIds,
      answerText: value?.answerText,
      answerFileId: value?.answerFileId,
      ...patch,
    });
  };

  const handleOptionChange = (optionId: number, checked: boolean) => {
    if (isSubmitted) return;
    if (question.type === "single_choice") {
      emit({ optionIds: checked ? [optionId] : [] });
      return;
    }
    emit({
      optionIds: checked
        ? [...selectedOptions, optionId]
        : selectedOptions.filter((id) => id !== optionId),
    });
  };

  const optionFlag = (optionId: number): boolean | null | undefined => {
    if (!isSubmitted || !answerResult?.optionIds) return undefined;
    const correct = answerResult.optionIds.find((item) => item.optionId === optionId)
      ?.isCorrect;
    return correct === false ? false : correct === true ? true : null;
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="text">
        {question.sortOrder}. {question.question}{" "}
        {question.required ? (
          <span className="text-red-500 dark:text-red-400">*</span>
        ) : (
          ""
        )}
        <br />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {question.type === "single_choice"
            ? "Выберите один вариант ответа "
            : question.type === "multiple_choice"
              ? "Выберите несколько вариантов ответа "
              : ""}
          ({question.score} {declOfNum(question.score, ["балл", "балла", "баллов"])})
        </span>
      </div>
      {question.attachmentNeeded && (
        <div className="grid gap-2 w-full grid-cols-[100%] overflow-hidden">
          <Label>Прикрепите файл с ответом</Label>
          <FileUploader
            onUploaded={(files: FileModel[]) => {
              if (isSubmitted) return;
              emit({ answerFileId: files[0]?.id ?? null });
            }}
          />
        </div>
      )}
      {question.type !== "text" && (
        <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {question.options.map((option) => {
            const flag = optionFlag(option.id);
            return (
              <Field
                key={option.id}
                orientation="horizontal"
                className="flex items-center gap-2"
              >
                <Checkbox
                  disabled={isSubmitted}
                  id={`${question.id}-${option.id}`}
                  checked={selectedOptions.includes(option.id)}
                  onCheckedChange={(checked) =>
                    handleOptionChange(option.id, checked === true)
                  }
                />
                <FieldLabel
                  className={cn(
                    (flag === true || (flag === null && answerResult?.isCorrect === true && selectedOptions.includes(option.id))) && "text-green-500 dark:text-green-400",
                    flag === false && "text-red-500 dark:text-red-400",
                  )}
                  htmlFor={`${question.id}-${option.id}`}
                >
                  {option.text}
                </FieldLabel>
              </Field>
            );
          })}
        </FieldGroup>
      )}
      {question.type === "text" && !question.attachmentNeeded && (
        <Field>
          <FieldLabel>Введите ответ</FieldLabel>
          <Textarea
            disabled={isSubmitted}
            value={answer}
            onChange={(e) => emit({ answerText: e.target.value })}
            className={cn(
              "resize-none",
              isSubmitted &&
                (answerResult?.isCorrect === true || answerResult?.isCorrect === null) &&
                "border-green-500 dark:border-green-400",
              isSubmitted &&
                answerResult?.isCorrect === false &&
                "border-red-500 dark:border-red-400",
            )}
            rows={4}
          />
        </Field>
      )}
    </div>
  );
}
