"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { reviewFormSchema, toReviewFormValues, ReviewFormValues } from "./reviewForm";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Rating } from "@/components/ui/rating";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { CourseReview } from "@prisma/client";
import Image from "next/image";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from "../ui/alert-dialog";

type CourseReviewModalProps = {
  courseId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
};

export default function CourseReviewModal({
  courseId,
  open,
  onOpenChange,
  onSubmitted,
}: CourseReviewModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasReview, setHasReview] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });
  const {
    handleSubmit,
    setValue,
    register,
    reset,
    control,
    formState: { errors },
  } = form;
  const rating = useWatch({ control, name: "rating" });
  

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setLoadingReview(true);
    setSubmitError(null);

    fetch(`/api/review?courseId=${courseId}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Не удалось загрузить отзыв");
        }
        const review = data.review as CourseReview | null;
        if (review) {
          reset(toReviewFormValues(review));
          setHasReview(true);
        } else {
          reset({ rating: 0, comment: "" });
          setHasReview(false);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSubmitError(error instanceof Error ? error.message : "Не удалось загрузить отзыв");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingReview(false);
      });

    return () => controller.abort();
  }, [open, courseId, reset]);

  const placeholder = useMemo(() => {
    switch (rating) {
      case 0:
        return "Опишите ваше впечатление о курсе";
      case 1:
      case 2:
        return "Опишите, что вам не понравилось в курсе";
      case 3:
        return "Опишите, что можно улучшить в курсе";
      case 4:
        return "Опишите, что вам понравилось в курсе";
      case 5:
        return "Опишите, что вам особенно понравилось в курсе";
    }
  }, [rating]);

  const color = useMemo(() => {
    switch (rating) {
      case 0:
        return "default";
      case 1:
        return "destructive";
      default:
        return "yellow";
    }
  }, [rating]);


  const onSubmit = async (data: ReviewFormValues) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          rating: data.rating,
          comment: data.comment,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось отправить отзыв");
      }
      onOpenChange(false);
      setShowAlert(true);
      onSubmitted?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось отправить отзыв");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <AlertDialog  open={showAlert} onOpenChange={setShowAlert}>
      <AlertDialogContent size="sm">
        <AlertDialogMedia className="flex justify-center w-full bg-transparent h-[100px]">
          <Image src="/images/review-success.svg" alt="Спасибо за ваш отзыв" className="scale-100" width={100} height={100} />
        </AlertDialogMedia>
        <AlertDialogHeader>
          <AlertDialogTitle>Спасибо за ваш отзыв!</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-center">
          Ваш отзыв поможет другим студентам выбрать лучший курс. Вы можете изменить его в любое время в разделе курса.
        </AlertDialogDescription>
        <AlertDialogFooter >
          <Button onClick={() => setShowAlert(false)} size="lg" className="w-full col-span-2">Закрыть</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{hasReview ? "Ваш отзыв" : "Оставить отзыв"}</DialogTitle>
          <DialogDescription>
            Оставьте отзыв о курсе для других студентов. Это поможет другим студентам выбрать лучший курс.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              void handleSubmit(onSubmit)(event);
            }}
          >
            <Field data-invalid={!!errors.rating || undefined}>
              <FieldLabel>Оценка</FieldLabel>
              <Rating
                size={24}
                precision={1}
                value={rating}
                onValueChange={(value) =>
                  setValue("rating", value ?? 0, { shouldValidate: true, shouldDirty: true })
                }
                disabled={loadingReview || submitting}
                variant={color}
                aria-label="Рейтинг курса"
              />
              <FieldError errors={[errors.rating]} />
            </Field>
            <Field data-invalid={!!errors.comment || undefined}>
              <FieldLabel>Комментарий</FieldLabel>
              <Textarea
                {...register("comment")}
                rows={4}
                maxLength={500}
                disabled={loadingReview || submitting}
                aria-invalid={!!errors.comment}
                placeholder={placeholder}
              />
              <FieldError errors={[errors.comment]} />
            </Field>
            {submitError && (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={loadingReview || submitting}>
                {(loadingReview || submitting) && <Loader2 className="animate-spin" />}
                {hasReview ? "Сохранить отзыв" : "Оставить отзыв"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
    </>
  );
}
