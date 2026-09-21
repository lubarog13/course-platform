"use client";

import { SubmitHandler, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  testQuestionFormSchema,
  TestQuestionFormValues,
  toTestQuestionFormValues,
  testOptionFormSchema,
  TestOptionFormValues,
  toTestOptionFormValues,
  toTestOption,
  toTestQuestionOptionDto,
  toTestQuestionDto,
} from "./testForm";
import { TestQuestionDto } from "@/app/lib/lessons";
import { TestQuestionOption } from "@/app/lib/models";
import { Item, ItemActions, ItemContent, ItemTitle } from "../ui/item";
import { useEffect, useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { ButtonGroup } from "../ui/button-group";
import { Label } from "../ui/label";

function reorderOptions(options: TestQuestionOption[], from: number, to: number) {
  if (from === to || from < 0 || to < 0) return options;
  const next = [...options];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((option, index) => ({ ...option, sortOrder: index + 1 }));
}

function SortableAnswerOption({
  option,
  index,
  onSaved,
  onDeleted,
  questionId,
}: {
  option: TestQuestionOption;
  id: number;
  index: number;
  onSaved: (option: TestQuestionOption) => void;
  onDeleted: (option: TestQuestionOption) => void;
  questionId: number;
}) {
  const { ref } = useSortable({ id: option.id, index });
  const [isEditing, setIsEditing] = useState(option.text?.length === 0);
  const form = useForm<TestOptionFormValues>({
    resolver: zodResolver(testOptionFormSchema) as Resolver<TestOptionFormValues>,
    defaultValues: toTestOptionFormValues(option),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const { register, handleSubmit, reset, setValue, control } = form;
  const isCorrect = useWatch({ control, name: "isCorrect" });

  const onSubmit: SubmitHandler<TestOptionFormValues> = (data) => {
    onSaved(toTestOption(data, option.id, questionId));
    setIsEditing(false);
    reset(toTestOptionFormValues({ ...option, ...data }));
  };

  const handleCancel = () => {
    setIsEditing(false);
    reset(toTestOptionFormValues(option));
    if (option.text.length === 0) {
      onDeleted(option);
      return;
    }
  };

  return (
    <>
      {isEditing ? (
        <div className="flex flex-col gap-4 bg-background rounded-md border border-border shadow-sm p-4 mt-2">
          <Label>Текст ответа</Label>
          <Input {...register("text")} />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`isCorrect-${option.id}`}
                checked={isCorrect}
                onCheckedChange={(checked) => {
                  setValue("isCorrect", checked === true, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
              <Label htmlFor={`isCorrect-${option.id}`} className="cursor-pointer">Правильный ответ</Label>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button type="button" onClick={() => void handleSubmit(onSubmit)()}>
                Сохранить
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Item className={`${option.isCorrect ? "rounded-md border-border shadow-sm bg-green-200/50 dark:bg-green-900/50" : "rounded-md border-border shadow-sm"}`} ref={ref}>
          <ItemContent >
            <ItemTitle>{option.text}</ItemTitle>
          </ItemContent>
          <ItemActions>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                <PencilIcon className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => onDeleted(option)}>
                <TrashIcon className="w-4 h-4 text-muted-foreground" />
              </Button>
          </ItemActions>
        </Item>
      )}
    </>
  );
}

export default function TestQuestionEdit({
  question,
  onSaved,
  onDeleted,
  index,
}: {
  question: TestQuestionDto;
  onSaved: (question: TestQuestionDto) => void;
  onDeleted: (question: TestQuestionDto) => void;
  index: number;
}) {
  const { ref } = useSortable({ id: question.id, index });

  const form = useForm<TestQuestionFormValues>({
    resolver: zodResolver(testQuestionFormSchema) as Resolver<TestQuestionFormValues>,
    defaultValues: toTestQuestionFormValues(question),
    mode: "onSubmit",   
    reValidateMode: "onChange",
  });
  const [error, setError] = useState<string | null>(null);

  const [options, setOptions] = useState<TestQuestionOption[]>(
    question.options.map(
      (option) =>
        ({
          id: option.id,
          questionId: question.id,
          text: option.text,
          isCorrect: option.isCorrect ?? false,
          sortOrder: option.sortOrder,
        }) as TestQuestionOption,
    ),
  );

  useEffect(() => {
    setOptions(
      question.options.map(
        (option) =>
          ({
            id: option.id,
            questionId: question.id,
            text: option.text,
            isCorrect: option.isCorrect ?? false,
            sortOrder: option.sortOrder,
          }) as TestQuestionOption,
      ),
    );
  }, [question.id, question.options]);

  const [isEditing, setIsEditing] = useState(question.question?.length === 0);

  const { register, handleSubmit, reset, setValue, control } = form;
  const type = useWatch({ control, name: "type" });
  const required = useWatch({ control, name: "required" });
  const attachmentNeeded = useWatch({ control, name: "attachmentNeeded" });

  const onSubmit: SubmitHandler<TestQuestionFormValues> = (data) => {
    if (question.type !== "text" && options.length === 0) {
      setError("Нужен хотя бы один вариант");
      return;
    }
    if (question.type !== "text" && !options.some((option) => option.isCorrect)) {
      setError("Нужен хотя бы один правильный вариант");
      return;
    }
    setError(null);
    onSaved(
      toTestQuestionDto(
        data,
        question.id,
        options.map((option) => toTestQuestionOptionDto(option)),
      ),
    );
    setIsEditing(false);
    reset(data);
  };

  const handleCancel = () => {
    reset(toTestQuestionFormValues(question));
    setIsEditing(false);
    if (question.question.length === 0) {
      onDeleted(question);
      return;
    }
    setOptions(
      question.options.map(
        (option) =>
          ({
            id: option.id,
            questionId: question.id,
            text: option.text,
            isCorrect: option.isCorrect ?? false,
            sortOrder: option.sortOrder,
          }) as TestQuestionOption,
      ),
    );
  };

  const addOption = () => {
    setOptions([
      ...options,
      {
        id: -Date.now(),
        questionId: question.id,
        text: "",
        isCorrect: false,
        sortOrder: options.length + 1,
      } as TestQuestionOption,
    ]);
  };

  const onOptionSaved = (option: TestQuestionOption) => {
    console.log(option);
    if (type !== "multiple_choice" && option.isCorrect && options.some((o) => o.isCorrect)) {
      setOptions(options.map((o) => ({ ...o, isCorrect: false })));
    }
    setOptions(options.map((o) => (o.id === option.id ? option : o)));
  };

  const onOptionDeleted = (option: TestQuestionOption) => {
    setOptions(options.filter((o) => o.id !== option.id));
  };

  return (
    <>
      {isEditing ? (
        <div className="flex flex-col gap-4 bg-background rounded-md border border-border shadow-sm p-4 mt-2">
          {error && (
          <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            {error}
          </p>
        )}
          <Label>Вопрос {question.sortOrder}</Label>
          <Input {...register("question")} />
          <ButtonGroup>
            <Button
              type="button"
              className={
                type === "single_choice"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }
              onClick={() =>
                setValue("type", "single_choice", { shouldDirty: true, shouldValidate: true })
              }
            >
                Один правильный ответ
              </Button>
              <Button
                type="button"
                className={
                  type === "multiple_choice"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }
                onClick={() =>
                  setValue("type", "multiple_choice", { shouldDirty: true, shouldValidate: true })
                }
              >
                Несколько правильных ответов
              </Button>
              <Button
                type="button"
                className={
                  type === "text"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }
                onClick={() => setValue("type", "text", { shouldDirty: true, shouldValidate: true })}
              >
                Текстовый ответ
              </Button>
            </ButtonGroup>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="required"
                    checked={required}
                    onCheckedChange={(checked) => {
                      setValue("required", checked === true, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                  />
                  <Label htmlFor="required">Обязательный вопрос</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="attachmentNeeded"
                    checked={attachmentNeeded}
                    onCheckedChange={(checked) => {
                      setValue("attachmentNeeded", checked === true, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                  />
                  <Label htmlFor="attachmentNeeded">Нужно прикрепить файл</Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input {...register("score")} />
                <Label>Баллы</Label>
              </div>
            </div>
            {type !== "text" && (
              <div className="flex flex-col gap-2 mt-2">
                <Label className="text-lg font-medium">Ответы</Label>
                <DragDropProvider
                  onDragEnd={(event) => {
                    if (event.canceled) return;
                  const { source } = event.operation;
                  if (!isSortable(source)) return;
                  setOptions((current) =>
                    reorderOptions(current, source.initialIndex, source.index),
                  );
                }}
              >
                <div className="flex flex-col gap-2">
                  {options.map((option, index) => (
                    <SortableAnswerOption
                      key={option.id}
                      id={option.id}
                      option={option}
                      index={index}
                      onSaved={onOptionSaved}
                      onDeleted={onOptionDeleted}
                      questionId={question.id}
                    />
                  ))}
                </div>
              </DragDropProvider>
              <Button type="button" variant="outline" onClick={addOption}>
                Добавить ответ <PlusIcon className="size-4" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => void handleSubmit(onSubmit)()}>
              Сохранить
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <Item className="rounded-md border-border shadow-sm" ref={ref}>
          <ItemContent>
            <ItemTitle>
              {question.sortOrder}. {question.question}
            </ItemTitle>
          </ItemContent>
          <ItemActions>
            <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
              <PencilIcon className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => onDeleted(question)}>
              <TrashIcon className="w-4 h-4 text-muted-foreground" />
            </Button>
          </ItemActions>
        </Item>
      )}
    </>
  );
}
