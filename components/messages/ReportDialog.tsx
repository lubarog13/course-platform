"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  reason: z
    .string()
    .min(1, "Укажите причину жалобы")
    .max(1000, "Причина не длиннее 1000 символов"),
  content: z
    .string()
    .min(1, "Опишите ситуацию подробнее")
    .max(10000, "Текст не длиннее 10000 символов"),
});

type ReportFormValues = z.infer<typeof formSchema>;

type ReportProps = {
  isOpen: boolean;
  type: "comment" | "review" | "lesson" | "course" | "user";
  commentId?: number | null;
  reviewId?: number | null;
  lessonId?: number | null;
  courseId?: number | null;
  userId?: number | null;
  onOpenChange: (open: boolean) => void;
};

const possibleReasons: Record<ReportProps["type"], string[]> = {
  comment: [
    "Нецензурная брань",
    "Оскорбление",
    "Троллинг",
    "Спам",
    "Неуместный контент",
    "Другое",
  ],
  review: [
    "Нецензурная брань",
    "Оскорбление",
    "Спам",
    "Введение в заблуждение",
    "Другое",
  ],
  lesson: [
    "Неподобающий контент",
    "Ошибка в материале",
    "Неуместный контент",
    "Другое",
  ],
  course: [
    "Неподобающий контент",
    "Ошибка в материале",
    "Неуместный контент",
    "Другое",
  ],
  user: ["Оскорбление", "Спам", "Мошенничество", "Другое"],
};

export default function ReportDialog({
  isOpen,
  onOpenChange,
  type,
  commentId,
  reviewId,
  lessonId,
  courseId,
  userId,
}: ReportProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(formSchema) as Resolver<ReportFormValues>,
    defaultValues: { reason: "", content: "" },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = form;

  const reasons = possibleReasons[type];

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
      reset({ reason: "", content: "" });
    }
    onOpenChange(open);
  };

  const onSubmit = async (data: ReportFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: type,
          reason: data.reason,
          content: data.content,
          ...(commentId != null ? { commentId } : {}),
          ...(reviewId != null ? { reviewId } : {}),
          ...(lessonId != null ? { lessonId } : {}),
          ...(courseId != null ? { courseId } : {}),
          ...(userId != null ? { userId } : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Не удалось отправить жалобу");
      }
      reset({ reason: "", content: "" });
      onOpenChange(false);
      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent size="sm">
        <AlertDialogMedia className="w-full h-full bg-transparent">
          <img src="/images/checked-success.svg" alt="Успешно" width={100} height={100} />
        </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>Жалоба отправлена</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-center">
            Администрация получила ваше сообщение. Переписку можно продолжить в{" "}
            <Link
              href="/user/messages/?admin=1"
              className="text-foreground font-medium underline underline-offset-3"
              onClick={() => setShowSuccess(false)}
            >
              сообщениях с администрацией
            </Link>
            .
          </AlertDialogDescription>
          <AlertDialogFooter>
            <Button
              type="button"
              size="lg"
              className="col-span-2 w-full"
              onClick={() => setShowSuccess(false)}
            >
              Закрыть
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Пожаловаться</DialogTitle>
            <DialogDescription>
              Опишите проблему — сообщение уйдёт администрации платформы.
            </DialogDescription>
          </DialogHeader>
          <form
            id="report-form"
            className="space-y-4"
            onSubmit={(event) => {
              void handleSubmit(onSubmit)(event);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="report-reason">
                Причина <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="report-reason"
                rows={2}
                placeholder="Кратко, в чём проблема"
                {...register("reason")}
              />
              {errors.reason && (
                <p className="text-destructive text-sm">{errors.reason.message}</p>
              )}
              <div className="flex flex-wrap gap-1">
                {reasons.map((reason) => (
                  <Button
                    key={reason}
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() =>
                      setValue("reason", reason, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    {reason}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-content">
                Подробности <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="report-content"
                rows={4}
                placeholder="Расскажите подробнее"
                {...register("content")}
              />
              {errors.content && (
                <p className="text-destructive text-sm">
                  {errors.content.message}
                </p>
              )}
            </div>

            {error && (
              <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                {error}
              </p>
            )}
          </form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => handleOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" form="report-form" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Отправка…
                </>
              ) : (
                "Пожаловаться"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
