"use client";

import { useCallback, useEffect, useState } from "react";
import type { EnrollmentStatus } from "@prisma/client";
import {
  type DeadlineExtensionListData,
  type DeadlineExtensionListResponse,
  isDeadlineExtensionExpired,
} from "@/app/lib/deadlineExtension";
import {
  Item,
  ItemDescription,
  ItemContent,
  ItemFooter,
  ItemHeader,
  ItemTitle,
  ItemActions,
} from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import { type VariantProps } from "class-variance-authority";
import { cn, declOfNum } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import Loading from "@/components/layout/loading";
import ErrorView from "@/components/layout/error-view";
import { Loader2 } from "lucide-react";

const STATUS_LABELS: Partial<Record<EnrollmentStatus, string>> = {
  pending: "Ожидается",
  in_progress: "В процессе",
  completed: "Одобрен",
  dropped: "Отклонён",
  expired: "Истёк",
};

const STATUS_COLORS: Partial<Record<EnrollmentStatus, VariantProps<typeof Badge>["variant"]>> = {
  pending: "secondary",
  in_progress: "secondary",
  completed: "outline",
  dropped: "destructive",
  expired: "destructive",
};

export default function DeadleneExtensionList() {
  const [data, setData] = useState<DeadlineExtensionListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchExtensions = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
          sort: "createdAt",
          order,
        });
        const response = await fetch(`/api/deadline-extension?${params}`, {
          signal,
        });
        const payload = (await response.json().catch(() => null)) as
          | (DeadlineExtensionListResponse & { error?: string })
          | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "Не удалось загрузить заявки");
        }
        setData(payload as DeadlineExtensionListResponse);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [page, order],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchExtensions(controller.signal);
    return () => controller.abort();
  }, [fetchExtensions]);

  const changeStatus = async (
    extension: DeadlineExtensionListData,
    status: EnrollmentStatus,
  ) => {
    setActionId(extension.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/deadline-extension/${extension.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json().catch(() => null)) as {
        request?: DeadlineExtensionListData;
        error?: string;
      } | null;
      if (!response.ok || !payload?.request) {
        throw new Error(payload?.error ?? "Не удалось обновить заявку");
      }

      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((item) =>
            item.id === extension.id ? payload.request! : item,
          ),
        };
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Ошибка обновления");
    } finally {
      setActionId(null);
    }
  };

  if (loading && !data) {
    return <Loading />;
  }

  if (error && !data) {
    return (
      <ErrorView
        title="Ошибка загрузки"
        text={error}
        showReloadButton={true}
        showBackButton={false}
      />
    );
  }

  const extensions = data?.items ?? [];
  const pageCount = data?.pageCount ?? 1;

  if (extensions.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
        Заявок на продление срока пока нет.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Всего: {data?.total ?? 0}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPage(1);
            setOrder((current) => (current === "desc" ? "asc" : "desc"));
          }}
        >
          По дате: {order === "desc" ? "сначала новые" : "сначала старые"}
        </Button>
      </div>

      {actionError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {extensions.map((extension) => {
          const busy = actionId === extension.id;
          const createdAt = new Date(extension.createdAt);
          const expired =
            extension.status === "expired" ||
            isDeadlineExtensionExpired({
              ...extension,
              createdAt,
            });
          const canReview =
            extension.status === "pending" ||
            extension.status === "in_progress";

          return (
            <Item key={extension.id} variant={extension.status === "pending" || extension.status === "in_progress" ? "outline" : "muted"}>
              <ItemHeader className="flex flex-col gap-2 md:flex-row items-start md:items-center">
                <Link href={`/courses/${extension.course.slug}`}>
                <ItemTitle className={cn(extension.status !== "pending" && extension.status !== "in_progress" && "text-gray-700 dark:text-gray-300")}>
                  Курс: {extension.course.name}
                  {extension.coursePart?.name
                    ? `, ${extension.coursePart.name}`
                    : ""}
                </ItemTitle></Link>
                <Link href={`/user/profile/${extension.user.id}`} className="text-sm text-gray-500 cursor-pointer hover:underline">
                  От: {extension.user.surname} {extension.user.name}{" "}
                  {extension.user.patronymic}
                </Link>
              </ItemHeader>
              <ItemContent>
                <ItemDescription>{extension.reason}</ItemDescription>
              </ItemContent>
              <ItemFooter>
                {extension.requestedDays != null && (
                  <p className="text-sm text-gray-500">
                    На {extension.requestedDays}{" "}
                    {declOfNum(extension.requestedDays, [
                      "день",
                      "дня",
                      "дней",
                    ])}
                    , дата запроса: {createdAt.toLocaleDateString("ru-RU")}
                  </p>
                )}
                <div className="flex flex-col items-end">
                <p className="text-sm text-gray-500">
                  <Badge variant={STATUS_COLORS[extension.status] ?? "secondary"}>{STATUS_LABELS[extension.status] ?? extension.status}</Badge>
                </p>
                {expired && (
                  <p className="text-sm text-red-500">Срок продления истёк</p>
                )}
                </div>
              </ItemFooter>
              {canReview && !expired && (
                <ItemActions className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void changeStatus(extension, "dropped")}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Отклонить"
                    )}
                  </Button>
                  <Button
                    variant="default"
                    disabled={busy}
                    onClick={() => void changeStatus(extension, "completed")}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Принять"
                    )}
                  </Button>
                  {extension.status === "pending" && (
                    <Button
                    className="col-span-2"
                      variant="link"
                      disabled={busy}
                      onClick={() =>
                        void changeStatus(extension, "in_progress")
                      }
                    >
                      Поставить на рассмотрение
                    </Button>
                  )}
                </ItemActions>
              )}
            </Item>
          );
        })}
      </div>

      {pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page <= 1 || loading}
                className={
                  page <= 1 || loading ? "pointer-events-none opacity-50" : undefined
                }
                onClick={(event) => {
                  event.preventDefault();
                  if (page > 1 && !loading) setPage((current) => current - 1);
                }}
              />
            </PaginationItem>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map(
              (pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === page}
                    onClick={(event) => {
                      event.preventDefault();
                      if (!loading) setPage(pageNumber);
                    }}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page >= pageCount || loading}
                className={
                  page >= pageCount || loading
                    ? "pointer-events-none opacity-50"
                    : undefined
                }
                onClick={(event) => {
                  event.preventDefault();
                  if (page < pageCount && !loading) {
                    setPage((current) => current + 1);
                  }
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
