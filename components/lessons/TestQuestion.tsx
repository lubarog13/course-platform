"use client";

import { TestQuestionDto } from "@/app/lib/lessons";
import { Label } from "@/components/ui/label";
import FileUploader from "@/components/base/FileUploader";
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "../ui/textarea";
import { useState } from "react";
import { declOfNum } from "@/lib/utils";
import { File as FileModel } from "@/app/lib/models";
export default function TestQuestion({question, isSubmitted}: {question: TestQuestionDto, isSubmitted: boolean}) {
    const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
    const [answer, setAnswer] = useState<string>("");
    const [attachment, setAttachment] = useState<FileModel | null>(null);
    const handleOptionChange = (optionId: number, checked: boolean) => {
        if (question.type === 'single_choice') {
            setSelectedOptions(checked ? [optionId] : []);
        } else {
            setSelectedOptions(checked ? [...selectedOptions, optionId] : selectedOptions.filter((id) => id !== optionId));
        }
    };
    return <div className="mt-4 flex flex-col gap-4">
        <div className="text">
           {question.sortOrder}. {question.question} {question.required ? <span className="text-red-500 dark:text-red-400">*</span> : ''}
           <br/> <span className="text-sm text-gray-500 dark:text-gray-400">
            {question.type === 'single_choice' ? 'Выберите один вариант ответа ' : question.type === 'multiple_choice' ? 'Выберите несколько вариантов ответа ' : ''}
            ({question.score} {declOfNum(question.score, ['балл', 'балла', 'баллов'])})</span>
        </div>
        {question.attachmentNeeded && (
            <div className="grid gap-2 w-full grid-cols-[100%] overflow-hidden">
                <Label>Прикрепите файл с ответом</Label>
                <FileUploader onUploaded={(files) => setAttachment(files[0])} />
            </div>
        )}
        {question.type !== 'text' && (
        <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.options.map((option) => (
                <Field key={option.id} orientation='horizontal' className="flex items-center gap-2">
                    <Checkbox disabled={isSubmitted} id={option.id.toString()} checked={selectedOptions.includes(option.id)} onCheckedChange={(checked) => handleOptionChange(option.id, checked)} />
                    <FieldLabel className={isSubmitted && option.isCorrect ? 'text-green-500 dark:text-green-400' : (isSubmitted && selectedOptions.includes(option.id) && !option.isCorrect ? 'text-red-500 dark:text-red-400' : '')} htmlFor={option.id.toString()}>{option.text}</FieldLabel>
                </Field>
            ))}
        </FieldGroup>)}
        {question.type === 'text' && !question.attachmentNeeded && (
            <Field>
                <FieldLabel>Введите ответ</FieldLabel>
                <Textarea disabled={isSubmitted} value={answer} onChange={(e) => setAnswer(e.target.value)} className="resize-none" rows={4}  />
            </Field>
        )}
    </div>
}