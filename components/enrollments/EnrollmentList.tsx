"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { EnrollmentDto } from "@/app/lib/enrollment";
import Loading from "../layout/loading";
import NotFound from "../layout/not-found";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { EnrollmentStatus } from "@prisma/client";
import { Button } from "../ui/button";
import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import ErrorView from "../layout/error-view";
import { useRouter } from "next/navigation";

const statusAdapters: Record<EnrollmentStatus, string> = {
  [EnrollmentStatus.pending]: "Ожидает рассмотрения",
  [EnrollmentStatus.enrolled]: "Принято",
  [EnrollmentStatus.in_progress]: "В процессе",
  [EnrollmentStatus.completed]: "Завершено",
  [EnrollmentStatus.dropped]: "Отказано",
  [EnrollmentStatus.expired]: "Истекло",
};

export default function EnrollmentList() {
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const fetchEnrollments = useCallback(async () => {
    try {
      const res = await fetch("/api/enroll");
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Не удалось загрузить записи на курсы");
      }
      const data = (await res.json()) as EnrollmentDto[];
      setEnrollments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      void fetchEnrollments();
    }
  }, [status, fetchEnrollments]);

  const updateEnrollmentStatus = async (
    enrollmentId: number,
    nextStatus: EnrollmentStatus,
  ) => {
    setActionId(enrollmentId);
    setActionError(null);
    try {
      const res = await fetch(`/api/enroll/${enrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Не удалось обновить заявку");
      }
      const updated = (await res.json()) as {
        id: number;
        status: EnrollmentStatus;
        updatedAt: string | Date;
        endDate?: string | Date | null;
      };

      setEnrollments((current) =>
        current.map((item) =>
          item.id === enrollmentId
            ? {
                ...item,
                status: updated.status,
                updatedAt: new Date(updated.updatedAt),
                endDate: updated.endDate ? new Date(updated.endDate) : item.endDate,
              }
            : item,
        ),
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Ошибка обновления");
    } finally {
      setActionId(null);
    }
  };

  const handleAccept = async (enrollmentId: number) => {
    await updateEnrollmentStatus(enrollmentId, EnrollmentStatus.enrolled);
  };

  const handleReject = async (enrollmentId: number) => {
    await updateEnrollmentStatus(enrollmentId, EnrollmentStatus.dropped);
  };

  const handleCancel = async (enrollmentId: number) => {
    await updateEnrollmentStatus(enrollmentId, EnrollmentStatus.dropped);
  };

  if (loading || status === "loading") {
    return <Loading />;
  }

  if (error) {
    return <ErrorView title="Ошибка загрузки" text={error} showReloadButton={true} showBackButton={true} />;
  }

  if (enrollments.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
        Заявок пока нет.
      </p>
    );
  }

  const isStaff = session?.user?.role !== "student";

  return (
    <div className="flex flex-col gap-4">
      {actionError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {enrollments.map((enrollment) => {
          const busy = actionId === enrollment.id;
          const isPending = enrollment.status === EnrollmentStatus.pending;

          return (
            <Card key={enrollment.id}>
              <CardHeader>
                <CardTitle className="cursor-pointer hover:underline" onClick={() => void router.push(`/user/profile/${enrollment.userId}`)}>
                  {enrollment.userSurname} {enrollment.userName}{" "}
                  {enrollment.userPatronymic}
                </CardTitle>
                <CardDescription>{enrollment.courseName}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  <b>Заявка создана:</b>{" "}
                  {new Date(enrollment.createdAt).toLocaleDateString("ru-RU")}
                </p>
                <p>
                  <b>Заявка обновлена:</b>{" "}
                  {new Date(enrollment.updatedAt).toLocaleDateString("ru-RU")}
                </p>
                <p className="my-2 flex items-center gap-2">
                  <b>Статус:</b>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-white",
                      enrollment.status === EnrollmentStatus.pending
                        ? "bg-yellow-500"
                        : enrollment.status === EnrollmentStatus.enrolled
                          ? "bg-green-500"
                          : enrollment.status === EnrollmentStatus.in_progress
                            ? "bg-blue-500"
                            : enrollment.status === EnrollmentStatus.completed
                              ? "bg-green-500"
                              : enrollment.status === EnrollmentStatus.dropped
                                ? "bg-red-500"
                                : enrollment.status === EnrollmentStatus.expired
                                  ? "bg-gray-500"
                                  : "",
                    )}
                  >
                    {statusAdapters[enrollment.status]}
                  </span>
                </p>
              </CardContent>
              {isPending && (
                <CardFooter className="flex flex-wrap gap-2">
                  {isStaff ? (
                    <>
                      <Button
                        disabled={busy}
                        onClick={() => void handleAccept(enrollment.id)}
                      >
                        <CheckIcon className="h-4 w-4" />
                        {busy ? "Сохранение…" : "Принять"}
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={busy}
                        onClick={() => void handleReject(enrollment.id)}
                      >
                        <XIcon className="h-4 w-4" />
                        {busy ? "Сохранение…" : "Отклонить"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => void handleCancel(enrollment.id)}
                    >
                      <XIcon className="h-4 w-4" />
                      {busy ? "Сохранение…" : "Отменить заявку"}
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
