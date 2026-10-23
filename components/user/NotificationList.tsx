"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import router from "next/router";
import handleViewport, { type InjectedViewportProps } from "react-in-viewport";
import type { NotificationFull } from "@/app/lib/notifications";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Item, ItemDescription, ItemContent, ItemMedia, ItemTitle, ItemActions } from "../ui/item";
import { BookOpenText, SquareText, MessagesSquare, SquareCheck, RefreshCcwIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import ErrorView from "../layout/error-view";
import { BellIcon } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "../ui/empty";
import { Badge } from "../ui/badge";

function actionLabel(entityType: NotificationFull["entityType"]) {
  if (entityType === "course") return "Открыть курс";
  if (entityType === "lesson") return "Открыть урок";
  if (entityType === "message") return "Открыть сообщение";
  if (entityType === "attempt") return "Открыть попытку";
  return "Открыть";
}

function NotificationItemContent({
  notification,
  forwardedRef,
}: {
  notification: NotificationFull;
} & InjectedViewportProps<HTMLDivElement>) {
  return (
    <div ref={forwardedRef}>
      <Item>
        <ItemMedia>
          <div className="bg-muted rounded-md p-2">
            {notification.entityType === "course" ? (
              <BookOpenText className="size-4" />
            ) : notification.entityType === "lesson" ? (
              <SquareText className="size-4" />
            ) : notification.entityType === "message" ? (
              <MessagesSquare className="size-4" />
            ) : notification.entityType === "attempt" ? (
              <SquareCheck className="size-4" />
            ) : null}
          </div>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{notification.title} {notification.readAt ? null: <Badge className="bg-blue-500 text-white">Новое</Badge>}</ItemTitle>
          {notification.body && <ItemDescription className="line-clamp-3">{notification.body}</ItemDescription>}
          <div className="text-sm text-muted-foreground sm:hidden">
            {new Date(notification.createdAt).toLocaleString()}
          </div>
        </ItemContent>
        {notification.url && (
          <ItemActions className="flex flex-col gap-2">
            <Button variant="outline" size="sm" className="px-1 sm:px-2.5">
              <Link className="hidden sm:block" href={notification.url}>{actionLabel(notification.entityType)}</Link>
              <ArrowRightIcon className="size-4 sm:hidden" />
            </Button>
            <div className="text-sm text-muted-foreground hidden sm:block">
              {new Date(notification.createdAt).toLocaleString()}
            </div>
          </ItemActions>
        )}
      </Item>
    </div>
  );
}

const NotificationItem = handleViewport(NotificationItemContent, {
  rootMargin: "100px",
});


export default function NotificationList() {
    const [notifications, setNotifications] = useState<NotificationFull[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [hasMore, setHasMore] = useState(true);
    const [hasNew, setHasNew] = useState(false);
    const { status } = useSession();
    const newestIdRef = useRef<number | null>(null);
    const loadedRef = useRef(false);

    const fetchNotifications = useCallback(async (nextPage: number, mode: "replace" | "append") => {
        if (status === "loading") {
            return;
        }
        try {
            const response = await fetch(`/api/notification?limit=${limit}&offset=${(nextPage - 1) * limit}`);
            if (!response.ok) {
                if (response.status === 401) {
                    router.push("/login");
                    return;
                }
                throw new Error("Не удалось получить уведомления");
            }
            const data = await response.json() as {
                notifications?: NotificationFull[];
                total?: number;
                hasMore?: boolean;
            };
            const items = data.notifications ?? [];
            if (mode === "append") {
                setNotifications((current) => [...current, ...items]);
            } else {
                setNotifications(items);
                newestIdRef.current = items[0]?.id ?? null;
                loadedRef.current = true;
                setHasNew(false);
            }
            setHasMore(
                data.hasMore ??
                    (data.total != null ? nextPage * limit < data.total : items.length === limit),
            );
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError("Неизвестная ошибка");
            }
        } finally {
            setLoading(false);
        }
    }, [limit, status]);

    const checkForNew = useCallback(async (signal?: AbortSignal) => {
        if (status !== "authenticated" || !loadedRef.current) return;
        try {
            const response = await fetch("/api/notification?limit=1&offset=0", { signal });
            if (!response.ok) return;
            const data = (await response.json()) as { notifications?: NotificationFull[] };
            const latestId = data.notifications?.[0]?.id ?? null;
            if (latestId != null && latestId !== newestIdRef.current) {
                setHasNew(true);
            }
        } catch (error: unknown) {
            if (error instanceof DOMException && error.name === "AbortError") return;
        }
    }, [status]);

    useEffect(() => {
        void fetchNotifications(1, "replace");
    }, [fetchNotifications]);

    useEffect(() => {
        const controller = new AbortController();
        const tick = () => {
            void checkForNew(controller.signal);
        };
        const id = window.setInterval(tick, 30000);
        const onVisibility = () => {
            if (document.visibilityState === "visible") tick();
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            controller.abort();
            window.clearInterval(id);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [checkForNew]);

    const loadMore = useCallback(async () => {
        const nextPage = page + 1;
        setPage(nextPage);
        await fetchNotifications(nextPage, "append");
    }, [fetchNotifications, page]);

    const refresh = useCallback(async () => {
        setPage(1);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        await fetchNotifications(1, "replace");
    }, [fetchNotifications]);

    const markedIds = useRef(new Set<number>());

    const markAsRead = useCallback(async (notificationId: number) => {
        if (markedIds.current.has(notificationId)) return;
        markedIds.current.add(notificationId);
        const response = await fetch(`/api/notification/${notificationId}`, {
            method: "PUT",
        });
        if (!response.ok) {
            markedIds.current.delete(notificationId);
            setNotifications((current) =>
                current.map((notification) =>
                    notification.id === notificationId
                        ? { ...notification, readAt: null }
                        : notification,
                ),
            );
        }
    }, []);

    if (loading) {
        return <div className="flex flex-col gap-3 w-full py-4">
            {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="flex w-fit items-center gap-4">
                    <Skeleton className="size-10 shrink-0 rounded-full" />
                    <div className="grid gap-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-4 w-[100px]" />
                    </div>
                </div>
            ))}
        </div>
    }

    if (error) {
        return <ErrorView title="Ошибка при получении уведомлений" text={error} showReloadButton={true} showBackButton={true} />
    }

    if (notifications.length === 0) {
        return <Empty className="h-full bg-muted/30">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BellIcon className="size-4" />
          </EmptyMedia>
          <EmptyTitle className="text-xl mb-4">Нет уведомлений</EmptyTitle>
          <EmptyDescription className="max-w-sm text-lg text-pretty">
            У вас нет уведомлений. Новые уведомления будут появляться здесь.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCcwIcon />
            {hasNew ? "Есть новые уведомления" : "Обновить"}
          </Button>
        </EmptyContent>
      </Empty>
    }

    return (
        <div className="flex flex-col gap-3 w-full py-4">
            <div className="flex flex-col gap-3 w-full">
                {notifications.map((notification) => (
                    <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onEnterViewport={() => {
                            if (!notification.readAt) void markAsRead(notification.id);
                        }}
                    />
                ))}
            </div>
            {hasMore && (
                <div className="flex justify-center w-full">
                    <Button variant="link" size="sm" onClick={loadMore}>
                        Загрузить больше
                    </Button>
                </div>
            )}
            {hasNew && (
                <Button
                    className="fixed bottom-4 right-4 md:bottom-[50%] md:translate-y-[50%]"
                    variant="outline"
                    aria-label="Обновить уведомления"
                    onClick={() => void refresh()}
                >
                    <RefreshCcwIcon />
                </Button>
            )}
        </div>
    );
}