"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { coursePartFormSchema, CoursePartFormValues, toCoursePartFormValues } from "./courseForm";
import { Resolver, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Item, ItemContent, ItemTitle, ItemActions } from "@/components/ui/item";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import { TrashIcon } from "lucide-react";
import { useSortable } from "@dnd-kit/react/sortable";
import type { CoursePartEditData } from "@/app/lib/courseParts";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { SubmitHandler } from "react-hook-form";

export default function CoursePartEdit({ part, index, onSaved, onDeleted }: { part: CoursePartEditData, index: number, onSaved: (part: CoursePartEditData) => void, onDeleted: (part: CoursePartEditData) => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const { ref } = useSortable({ id: part.id ?? index, index });


    useEffect(() => {
        if (!part.name?.length) {
            setIsEditing(true);
        }
    }, [part.name]);
    
    const form = useForm<CoursePartFormValues>({
        resolver: zodResolver(coursePartFormSchema) as Resolver<CoursePartFormValues>,
        mode: "onSubmit",
        reValidateMode: "onChange",
        defaultValues: toCoursePartFormValues(part),
    });

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        getValues,
        control,
        watch,
        formState: { errors, isDirty },
    } = form;

    const onSubmit: SubmitHandler<CoursePartFormValues> = (data) => {
        onSaved({
          ...part,
          ...data,
          id: part.id,
          sortOrder: part.sortOrder ?? data.sortOrder,
        });
        setIsEditing(false);
        reset(data);
      };
    
      const handleCancel = () => {
        reset(toCoursePartFormValues(part));
        setIsEditing(false);
        if (!part.name?.length) {
          onDeleted(part);
          return;
        }
      };
  return (
    <>
    {isEditing ? (
        <div className="flex flex-col gap-4 bg-background rounded-md border border-border shadow-sm p-4 mt-2">
            <Field>
                <FieldLabel>Название <span className="text-destructive text-sm">*</span></FieldLabel>
                <Input {...register("name")} />
                <FieldError errors={[errors.name]} />
            </Field>
            <Field>
                <FieldLabel>Описание</FieldLabel>
                <Textarea {...register("description")} />
                <FieldError errors={[errors.description]} />
            </Field>
            <Field data-invalid={!!errors.deadlineDays || undefined}>
                <FieldLabel htmlFor="deadlineDays">Срок выполнения курса (необязательно)</FieldLabel>
                <Input
                id="deadlineDays"
                type="number"
                min={0}
                className="h-11"
                placeholder="Значение в днях"
                {...register("deadlineDays", {
                setValueAs: (value) => {
                    if (value === "" || value == null) return null;
                    const parsed = Number(value);
                    return Number.isNaN(parsed) ? Number.NaN : parsed;
                },
                })}
                aria-invalid={!!errors.deadlineDays}
            /><FieldError errors={[errors.deadlineDays]} />
      </Field>
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
              {index + 1}. {part.name}
            </ItemTitle>
          </ItemContent>
          <ItemActions>
            <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
              <PencilIcon className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => onDeleted(part)}>
              <TrashIcon className="w-4 h-4 text-muted-foreground" />
            </Button>
          </ItemActions>
        </Item>
    )}
    </>
  );
}