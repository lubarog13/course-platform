"use client";

import { useCallback, useEffect, useState } from "react";
import router from "next/router";
import type { NotificationFull } from "@/app/lib/notifications";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Item, ItemDescription, ItemContent, ItemMedia, ItemTitle, ItemActions } from "../ui/item";
import { BookOpenText, SquareText, MessagesSquare, SquareCheck } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";


export default function NotificationList() {
    const [notifications, setNotifications] = useState<NotificationFull[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const { data: session, status } = useSession();

    const fetchNotifications = useCallback(async () => {
        if (status === "loading") {
            return;
        }
        try {
            const response = await fetch("/api/notification");
            if (!response.ok) {
                if (response.status === 401) {
                    router.push("/login");
                    return;
                }
                throw new Error("Не удалось получить уведомления");
            }
            const data = await response.json();
            setNotifications(data.notifications ?? []);
            setTotal(data.total ?? 0);
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError("Неизвестная ошибка");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications, status]);

    const loadMore = useCallback(async () => {
        setPage(page + 1);
        await fetchNotifications();
    }, [fetchNotifications, page]);

    if (loading) {
        return <div className="flex flex-col gap-3 w-full">
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

    const NotificationItem = ({ notification }: { notification: NotificationFull }) => {
        const buttonText = () => {
            if (notification.entityType === 'course') {
                return 'Открыть курс';
            }
            if (notification.entityType === 'lesson') {
                return 'Открыть урок';
            }
            if (notification.entityType === 'message') {
                return 'Открыть сообщение';
            }
            if (notification.entityType === 'attempt') {
                return 'Открыть попытку';
            }
            return 'Открыть';
        }
        return (
            <Item>
                <ItemMedia>
                    <div className="bg-muted rounded-md p-2">
                        {notification.entityType === 'course'? 
                        <BookOpenText className="size-4" /> :
                        notification.entityType === 'lesson'?
                        <SquareText className="size-4" /> :
                        notification.entityType === 'message'?
                        <MessagesSquare className="size-4" /> :
                        notification.entityType === 'attempt'?
                        <SquareCheck className="size-4" /> :
                        null}
                    </div>
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>
                        {notification.title}
                    </ItemTitle>
                    {notification.body && (
                        <ItemDescription>
                            {notification.body}
                        </ItemDescription>
                    )}
                </ItemContent>
                {notification.url && (
                <ItemActions>
                    <Button variant="outline" size="sm">
                        <Link href={notification.url}>
                            {buttonText()}
                        </Link>
                    </Button>
                </ItemActions>
                )}
            </Item>
        )
    }

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col gap-3 w-full">
                {notifications.map((notification) => <NotificationItem key={notification.id} notification={notification} />)}
            </div>
            {hasMore && (
                <div className="flex justify-center w-full">
                    <Button variant="link" size="sm" onClick={loadMore}>
                        Загрузить больше
                    </Button>
                </div>
            )}
        </div>
    );
}