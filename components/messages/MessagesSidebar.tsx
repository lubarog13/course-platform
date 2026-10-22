"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Receiver, ConversationDto } from "@/app/lib/messages";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "../ui/item";
import { Skeleton } from "../ui/skeleton";
import {
  AlertTriangleIcon,
  FileIcon,
  PlusIcon,
  TrashIcon,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import {useSearchParams} from "next/navigation";

export default function MessagesSidebar({
  userId,
  currentReceiver,
  refetch,
  onDialogClick,
  onReceiverClick,
}: {
  userId: number;
  currentReceiver: Receiver | null;
  refetch: boolean;
  onDialogClick: (dialog: ConversationDto) => void;
  onReceiverClick: (receiver: Receiver) => void;
}) {
  const [allReceivers, setAllReceivers] = useState<Receiver[]>([]);
  const [dialogs, setDialogs] = useState<ConversationDto[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchParams = useSearchParams();
  const receiverId = searchParams.get('receiverId');
  const dialogPeerIds = useMemo(
    () => new Set(dialogs.map((dialog) => dialog.peer.id)),
    [dialogs],
  );

  const receivers = useMemo(
    () =>
      allReceivers.filter(
        (receiver) =>
          receiver.id !== userId && !dialogPeerIds.has(receiver.id),
      ),
    [allReceivers, dialogPeerIds, userId],
  );


  const fetchReceivers = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/receiver");
      if (!res.ok) {
        throw new Error("Не удалось загрузить получателей");
      }
      const data = (await res.json()) as Receiver[];
      setAllReceivers(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка загрузки получателей",
      );
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка загрузки диалогов",
      );
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([fetchReceivers(), fetchDialogs()]);
  }, [fetchReceivers, fetchDialogs]);

  useEffect(() => {
    console.log('receiverId', receiverId);
    if (dialogs.find((dialog) => dialog.peer.id.toString() === receiverId)) {
      onDialogClick(dialogs.find((dialog) => dialog.peer.id.toString() === receiverId)!);
    }
  }, [receiverId, dialogs]);

  useEffect(() => {
    if (refetchTimerRef.current) {
      clearTimeout(refetchTimerRef.current);
    }
    refetchTimerRef.current = setTimeout(() => {
      void fetchDialogs();
    }, 5000);
    return () => {
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
      }
    };
  }, [refetch, fetchDialogs]);

  const handleDialogClick = (dialog: ConversationDto) => {
    setDialogs((current) =>
      current.map((item) =>
        item.peer.id === dialog.peer.id
          ? { ...item, unreadCount: 0 }
          : item,
      ),
    );
    onDialogClick(dialog);
  };

  const getDialogDescription = (dialog: ConversationDto) => {
    if (dialog.lastMessage?.content === "Файлы") {
      return (
        <div className="flex gap-1">
          <FileIcon className="size-4" />
          <span>Файлы</span>
        </div>
      );
    }
    if (dialog.lastMessage?.content === "Сообщение удалено") {
      return (
        <div className="flex gap-1">
          <TrashIcon className="size-4" />
          <span>Сообщение удалено</span>
        </div>
      );
    }
    if (dialog.lastMessage?.senderId === userId) {
      return `(вы) ${dialog.lastMessage?.content || "Нет сообщений"}`;
    }
    return dialog.lastMessage?.content || "Нет сообщений";
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

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangleIcon className="size-10 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <ItemGroup className="h-full overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
      {initialLoading && skeletonItems}
      {dialogs.map((dialog) => (
        <Item
          key={`dialog-${dialog.peer.id}`}
          onClick={() => handleDialogClick(dialog)}
          className={cn(
            "flex-nowrap border-zinc-200 dark:border-zinc-800",
            currentReceiver?.id === dialog.peer.id
              ? "bg-gray-100 dark:bg-gray-800"
              : "",
          )}
        >
          <ItemMedia>
            <UserCircle className="size-8 text-zinc-500 dark:text-zinc-400" />
          </ItemMedia>
          <ItemContent className="overflow-hidden">
            <ItemTitle
              className={cn(
                "block w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium",
                currentReceiver?.id === dialog.peer.id
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-700 dark:text-zinc-500",
              )}
            >
              {dialog.peer.name} {dialog.peer.surname}{" "}
              {dialog.peer.patronymic}
            </ItemTitle>
            <ItemDescription className="text-sm text-gray-500">
              {getDialogDescription(dialog)}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            {dialog.unreadCount > 0 && (
              <Badge className="bg-blue-500 text-white">
                {dialog.unreadCount}
              </Badge>
            )}
          </ItemActions>
        </Item>
      ))}
      {receivers.map((receiver) => (
        <Item
          key={`receiver-${receiver.id}`}
          onClick={() => onReceiverClick(receiver)}
          className={cn(
            "flex-nowrap border-zinc-200 dark:border-zinc-800",
            currentReceiver?.id === receiver.id
              ? "bg-gray-100 dark:bg-gray-800"
              : "",
          )}
        >
          <ItemMedia>
            <UserCircle className="size-8 text-zinc-500 dark:text-zinc-400" />
          </ItemMedia>
          <ItemContent className="flex-1 overflow-hidden">
            <ItemTitle
              className={cn(
                "block w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium",
                currentReceiver?.id === receiver.id
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-700 dark:text-zinc-500",
              )}
            >
              {receiver.name} {receiver.surname} {receiver.patronymic}
            </ItemTitle>
            <ItemDescription className="text-xs text-gray-500">
              {receiver.roleDescription}
            </ItemDescription>
          </ItemContent>
          <ItemActions className="shrink-0">
            <PlusIcon className="size-4" />
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}
