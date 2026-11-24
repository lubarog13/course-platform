"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { DeadlineExtensionRequest } from "@prisma/client";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { declOfNum } from "@/lib/utils";
import {
  Ban,
  CheckCircleIcon,
  Loader2,
  MailIcon,
  RefreshCcwIcon,
  XCircleIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createDeadlineExtensionFormSchema,
  defaultDeadlineExtensionValues,
  type DeadlineExtensionFormValues,
} from "./deadlineExtensionForm";

type DeadlineBannerProps = {
  courseId?: number;
  coursePartId?: number;
  deadline?: Date | null;
  deadlineDays?: number;
  onSubmit?: (deadline: DeadlineExtensionRequest) => void;
};

export default function DeadlineBanner({
  courseId,
  coursePartId,
  deadline,
  deadlineDays,
  onSubmit,
}: DeadlineBannerProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const router = useRouter();
  const [currentRequest, setCurrentRequest] =
    useState<DeadlineExtensionRequest | null>(null);

  const schema = useMemo(
    () => createDeadlineExtensionFormSchema(deadlineDays ?? 0),
    [deadlineDays],
  );

  const form = useForm<DeadlineExtensionFormValues>({
    resolver: zodResolver(schema) as Resolver<DeadlineExtensionFormValues>,
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: defaultDeadlineExtensionValues,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = form;

  const requestedDays = useWatch({ control, name: "requestedDays" }) ?? 1;

  const deadlineValid =
    deadline != null && !Number.isNaN(deadline.getTime()) ? deadline : null;
  const isDeadlinePassed =
    deadlineValid != null && deadlineValid.getTime() < Date.now();

  const newDeadline =
    deadlineValid != null && Number.isFinite(Number(requestedDays))
      ? new Date(
          new Date().getTime() + Number(requestedDays) * 24 * 60 * 60 * 1000,
        )
      : null;

  const targetLabel = courseId != null ? "курса" : "части";

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (coursePartId != null) {
      params.set("coursePartId", String(coursePartId));
    } else if (courseId != null) {
      params.set("courseId", String(courseId));
    }
    return params;
  }, [courseId, coursePartId]);

  const fetchExistingExtensionRequest = async (signal?: AbortSignal) => {
    if (queryParams.toString() === "") {
      setCurrentRequest(null);
      setFetching(false);
      return;
    }
    setFetching(true);
    setError("");
    try {
      const response = await fetch(
        `/api/deadline-extension?${queryParams.toString()}`,
        { signal },
      );
      const data = (await response.json().catch(() => null)) as {
        request?: DeadlineExtensionRequest | null;
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Не удалось загрузить заявку");
      }
      setCurrentRequest(data?.request ?? null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Ошибка загрузки заявки");
      setCurrentRequest(null);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchExistingExtensionRequest(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when target ids change
  }, [queryParams]);

  const openDialog = () => {
    reset(defaultDeadlineExtensionValues);
    setError("");
    setOpen(true);
  };

  const submitExtension = async (values: DeadlineExtensionFormValues) => {
    if (loading) return;
    if (queryParams.toString() === "") {
      setError("Не указан курс или часть курса");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        reason: values.reason,
        requestedDays: values.requestedDays,
      };
      if (coursePartId != null) body.coursePartId = coursePartId;
      else if (courseId != null) body.courseId = courseId;

      const response = await fetch("/api/deadline-extension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as {
        request?: DeadlineExtensionRequest;
        error?: string;
      } | null;
      if (!response.ok || !data?.request) {
        throw new Error(data?.error ?? "Не удалось отправить заявку");
      }
      setCurrentRequest(data.request);
      onSubmit?.(data.request);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки заявки");
    } finally {
      setLoading(false);
    }
  };

  if (fetching || !isDeadlinePassed) {
    return null;
  }

  return (
    <>
      {currentRequest == null && (
        <div className="text-gray-700 dark:text-gray-300 mb-4 mr-10 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          <Ban className="w-4 h-4 text-destructive shrink-0" />
          <span className="flex-1">
            Срок прохождения истёк {deadlineValid?.toLocaleString("ru-RU")}
          </span>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive/80"
            onClick={openDialog}
          >
            <RefreshCcwIcon className="w-4 h-4" />
            <span>Сбросить срок сдачи</span>
          </Button>
        </div>
      )}
      {currentRequest?.status === "pending" && (
        <div className="text-gray-700 dark:text-gray-300 mb-4 mr-10 flex items-center gap-2 rounded-lg border border-green-300/30 bg-green-50 px-3 py-2 text-sm dark:bg-green-950/20">
          <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />
          <span>
            Вы отправили запрос на продление срока сдачи {targetLabel} на{" "}
            {currentRequest.requestedDays} {declOfNum(currentRequest.requestedDays, ["день", "дня", "дней"])}. Ожидайте ответа.
          </span>
        </div>
      )}
      {currentRequest?.status === "completed" && (
        <div className="text-gray-700 dark:text-gray-300 mb-4 mr-10 flex items-center gap-2 rounded-lg border border-green-300/30 bg-green-50 px-3 py-2 text-sm dark:bg-green-950/20">
          <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />
          <span>
            Ваш запрос на продление срока сдачи {targetLabel} на{" "}
            {currentRequest.requestedDays} дней был одобрен. Новый срок сдачи:{" "}
            {deadline?.toLocaleDateString("ru-RU")}.
          </span>
        </div>
      )}
      {currentRequest?.status === "dropped" && (
        <div className="text-gray-700 dark:text-gray-300 mb-4 mr-10 rounded-lg border border-red-300/30 bg-red-50 px-3 py-2 text-sm dark:bg-red-950/20">
          <div className="flex items-center gap-2 mb-2">
            <XCircleIcon className="w-4 h-4 text-red-500 shrink-0" />
            <span>
              Ваш запрос на продление срока сдачи {targetLabel} на{" "}
              {currentRequest.requestedDays} дней был отклонен. Вы можете
              отправить запрос заново или <a href="/user/messages?admin=1" className="text-red-500 hover:text-red-500/80">свяжитесь с администрацией платформы</a>.
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="text-red-500 hover:text-red-500/80"
              onClick={openDialog}
            >
              <RefreshCcwIcon className="w-4 h-4" />
              <span>Отправить заново</span>
            </Button>
            <Button
              variant="outline"
              className="text-red-500 hover:text-red-500/80"
              onClick={() => router.push("/user/messages")}
            >
              <MailIcon className="w-4 h-4" />
              <span>В чат</span>
            </Button>
          </div>
        </div>
      )}
      {currentRequest?.status === "expired" && (
        <div className="text-gray-700 dark:text-gray-300 mb-4 rounded-lg border border-red-300/30 bg-red-50 px-3 py-2 text-sm dark:bg-red-950/20">
          <div className="flex items-center gap-2 mb-2">
            <XCircleIcon className="w-4 h-4 text-red-500 shrink-0" />
            <span>
              Запрос на продление срока сдачи {targetLabel} на{" "}
              {currentRequest.requestedDays} дней истек. Вы можете отправить
              запрос заново или <a href="/user/messages?admin=1" className="text-red-500 hover:text-red-500/80">свяжитесь с администрацией платформы</a>.
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="text-red-500 hover:text-red-500/80"
              onClick={openDialog}
            >
              <RefreshCcwIcon className="w-4 h-4" />
              <span>Отправить заново</span>
            </Button>
            <Button
              variant="outline"
              className="text-red-500 hover:text-red-500/80"
              onClick={() => router.push("/user/messages")}
            >
              <MailIcon className="w-4 h-4" />
              <span>В чат</span>
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            reset(defaultDeadlineExtensionValues);
            setError("");
          }
        }}
      >
        <DialogContent className="max-w-md! w-[80vw]">
          <DialogHeader>
            <DialogTitle>
              Запрос на продление срока сдачи {targetLabel}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Для продления срока сдачи {targetLabel} необходимо подтверждение
            администратора или преподавателя. Срок сдачи {targetLabel} истёк{" "}
            {deadlineValid?.toLocaleDateString("ru-RU")}. Укажите причину
            продления и количество дней.
          </DialogDescription>
          <FormProvider {...form}>
            <form
              noValidate
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                void handleSubmit(submitExtension)(event);
              }}
            >
              <Field data-invalid={!!errors.reason || undefined}>
                <FieldLabel htmlFor="deadline-reason">
                  Причина продления
                </FieldLabel>
                <Textarea
                  id="deadline-reason"
                  {...register("reason")}
                  aria-invalid={!!errors.reason}
                  disabled={loading}
                />
                <FieldError errors={[errors.reason]} />
              </Field>
              <Field data-invalid={!!errors.requestedDays || undefined}>
                <FieldLabel htmlFor="deadline-requested-days">
                  Количество дней продления
                </FieldLabel>
                <Input
                  id="deadline-requested-days"
                  max={deadlineDays}
                  min={1}
                  type="number"
                  {...register("requestedDays")}
                  aria-invalid={!!errors.requestedDays}
                  disabled={loading}
                />
                <FieldError errors={[errors.requestedDays]} />
                <FieldDescription>
                  Новый срок сдачи {targetLabel}:{" "}
                  {newDeadline?.toLocaleDateString("ru-RU")}.
                </FieldDescription>
              </Field>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Отправить запрос"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </>
  );
}
