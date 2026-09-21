import { z } from "zod";

import type { TestQuestion } from "@prisma/client";
import type { TestQuestionOption } from "@prisma/client";
import type { TestQuestionDto, TestQuestionOptionDto } from "@/app/lib/lessons";

export const testOptionFormSchema = z.object({
    text: z.string().min(1, "Введите текст опции"),
    isCorrect: z.boolean().default(false),
    sortOrder: z.number().min(0, "Порядок должен быть больше 0"),
});

export const testQuestionFormSchema = z.object({
    question: z.string().min(1, "Введите вопрос"),
    type: z.enum(["single_choice", "multiple_choice", "text"]),
    sortOrder: z.number().min(0, "Порядок должен быть больше 0"),
    required: z.boolean().default(true),
    attachmentNeeded: z.boolean().default(false),
    lessonId: z.number().int().positive("Выберите урок"),
    score: z.number().min(0, "Баллы должны быть больше или равен 0"),
});


export type TestOptionFormValues = z.infer<typeof testOptionFormSchema>;
export type TestQuestionFormValues = z.infer<typeof testQuestionFormSchema>;

export function toTestQuestionFormValues(question: TestQuestion): TestQuestionFormValues {
    return {
        question: question.question,
        type: question.type,
        sortOrder: question.sortOrder,
        required: question.required,
        attachmentNeeded: question.attachmentNeeded,
        lessonId: question.lessonId,
        score: question.score,
    };
}

export function toTestOptionFormValues(option: TestQuestionOption): TestOptionFormValues {
    return {
        text: option.text,
        isCorrect: option.isCorrect,
        sortOrder: option.sortOrder,
    };
}

export function toTestQuestion(values: TestQuestionFormValues, id: number): TestQuestion {
    return {
        id: id,
        question: values.question,
        type: values.type,
        sortOrder: values.sortOrder,
        required: values.required,
        attachmentNeeded: values.attachmentNeeded,
        lessonId: values.lessonId,
        score: values.score,

    };
}

export function toTestQuestionDto(values: TestQuestionFormValues, id: number, options: TestQuestionOptionDto[]): TestQuestionDto {
    return {
        id: id,
        question: values.question,
        type: values.type,
        sortOrder: values.sortOrder,
        required: values.required,
        attachmentNeeded: values.attachmentNeeded,
        lessonId: values.lessonId,
        score: values.score,
        options: options,
    };
}

export function toTestOption(values: TestOptionFormValues, id: number, questionId: number): TestQuestionOption {
    return {
        id: id,
        questionId: questionId,
        text: values.text,
        isCorrect: values.isCorrect,
        sortOrder: values.sortOrder,
    };
}

export function toTestQuestionOptionDto(option: TestQuestionOption): TestQuestionOptionDto {
    return {
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect,
        sortOrder: option.sortOrder,
    };
}