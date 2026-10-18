"use client";
import { listPossibleReceivers } from "@/app/lib/messages";
import { useEffect, useState, useCallback } from "react";
import { Receiver, ConversationDto } from "@/app/lib/messages";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "../ui/item";
import { Skeleton } from "../ui/skeleton";
import { AlertTriangleIcon, FileIcon, PlusIcon, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

export default function MessagesSidebar({userId, currentReceiver, refetch, onDialogClick, onReceiverClick}: {userId: number, currentReceiver: Receiver | null, refetch: boolean, onDialogClick: (dialog: ConversationDto) => void, onReceiverClick: (receiver: Receiver) => void}) {
    const [receivers, setReceivers] = useState<Receiver[]>([]);
    const [dialogs, setDialogs] = useState<ConversationDto[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [refetchTimer, setRefetchTimer] = useState<NodeJS.Timeout | null>(null);
    const [error, setError] = useState<string | null>(null);
    const filterReceivers = (receivers: Receiver[], dialogs: ConversationDto[]) => {
        return receivers.filter((receiver) => !dialogs.find((dialog) => dialog.peer.id === receiver.id) && receiver.id !== userId);
    };
    const fetchReceivers = useCallback(async () => {
        setError(null);
        try {
            const res = await fetch("/api/receiver");
            if (!res.ok) {
                throw new Error("Не удалось загрузить получателей");
            }
            const data = (await res.json()) as Receiver[];
            setReceivers(filterReceivers(data, dialogs));
        } catch (error) {
            setError(error instanceof Error ? error.message : "Ошибка загрузки получателей");
        } finally {
            setInitialLoading(false);
        }
    }, []);
    const fetchDialogs = useCallback(async () => {
        setError(null);
        try {
            const res = await fetch("/api/message");
            if (!res.ok) {
                throw new Error("Не удалось загрузить диалоги");
            }
            const data = (await res.json()) as ConversationDto[];
            setDialogs(data);
            setReceivers(filterReceivers(receivers, data));
            setInitialLoading(false);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Ошибка загрузки диалогов");
        } finally {
            setInitialLoading(false);
        }
    }, []);
    useEffect(() => {
        void fetchReceivers();
    }, [fetchReceivers]);
    useEffect(() => {
        void fetchDialogs();
    }, [fetchDialogs]);

    useEffect(() => {
        if (refetchTimer) {
            clearTimeout(refetchTimer);
        }
        setRefetchTimer(setTimeout(() => {
            void fetchDialogs();
        }, 5000));
    }, [refetch]);

    const handleDialogClick = (dialog: ConversationDto) => {
        setDialogs(dialogs.map((d) => ({ ...d, unreadCount: d.peer.id === dialog.peer.id ? 0 : d.unreadCount })));
        onDialogClick(dialog);
    };
    const handleReceiverClick = (receiver: Receiver) => {
        onReceiverClick(receiver);
    };

    const skeletonItems = Array.from({ length: 10 }, (_, index) => (
        <Item key={index}>
            <ItemMedia>
            <Skeleton className="size-10 shrink-0 rounded-full" />
            </ItemMedia>
            <ItemContent>
            <div className="grid gap-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
            </div>
            </ItemContent>
        </Item>
    ));
    if (error) return <>
        <div className="flex flex-col gap-2 items-center justify-center h-full">
            <AlertTriangleIcon className="size-10 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
        </div>
    </>;
    
    return <ItemGroup className="h-full overflow-y-auto border rounded-lg p-2 border-zinc-200 dark:border-zinc-800">
        {initialLoading && skeletonItems}
        {dialogs.map((dialog) => (
            <Item key={dialog.peer.id} onClick={() => handleDialogClick(dialog)} className={cn("border-zinc-200 dark:border-zinc-800 flex-nowrap",currentReceiver?.id === dialog.peer.id ? "bg-gray-100 dark:bg-gray-800" : "")}>
                <ItemMedia>
                <UserCircle className="size-8 text-zinc-500 dark:text-zinc-400" />
                </ItemMedia>
                <ItemContent className="overflow-hidden">
                <ItemTitle className={cn("w-full block whitespace-nowrap overflow-hidden text-ellipsis text-sm font-medium text-zinc-900 dark:text-zinc-50", currentReceiver?.id === dialog.peer.id ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-500")}>{dialog.peer.name} {dialog.peer.surname} {dialog.peer.patronymic}</ItemTitle>
                <ItemDescription className="text-sm text-gray-500">{dialog.lastMessage?.content==='Файлы' ? 
                (dialog.lastMessage?.hasAttachments? <div className="flex gap-1">
                        <FileIcon className="size-4" />
                        <span>Файлы</span>
                    </div> : dialog.lastMessage?.content || "Нет сообщений") : dialog.lastMessage?.content || "Нет сообщений"}</ItemDescription>
                </ItemContent>
                <ItemActions>
                    {dialog.unreadCount > 0 && (<Badge className="bg-blue-500 text-white">
                        {dialog.unreadCount}
                    </Badge>
                    )}
                </ItemActions>
            </Item>
        ))}
        {
            receivers.map((receiver) => (
                <Item key={receiver.id} onClick={() => handleReceiverClick(receiver)} className={cn("border-zinc-200 dark:border-zinc-800 flex-nowrap",currentReceiver?.id === receiver.id ? "bg-gray-100 dark:bg-gray-800" : "")}>
                    <ItemMedia>
                        <UserCircle className="size-8 text-zinc-500 dark:text-zinc-400" />
                    </ItemMedia>
                    <ItemContent className="flex-1 overflow-hidden">
                        <ItemTitle className={cn("w-full block whitespace-nowrap overflow-hidden text-ellipsis text-sm font-medium text-zinc-900 dark:text-zinc-50", currentReceiver?.id === receiver.id ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-500")}>{receiver.name} {receiver.surname} {receiver.patronymic}</ItemTitle>
                        <ItemDescription className="text-xs text-gray-500">{receiver.roleDescription}</ItemDescription>
                    </ItemContent>
                    <ItemActions className="shrink-0">
                        <PlusIcon
                        className="size-4" />
                    </ItemActions>
                </Item>
            ))}
    </ItemGroup>;
}