"use client";

import { MessageDto, Receiver } from "@/app/lib/messages";
import { Message, MessageContent, MessageFooter } from "../ui/message";
import { Card, CardContent, CardFooter } from "../ui/card";
import { CardHeader, CardTitle, CardDescription, CardAction } from "../ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { Button } from "../ui/button";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "../ui/attachment";
import {
  Check,
  CheckCheck,
  RotateCwIcon,
  MessageCircleDashedIcon,
  PaperclipIcon,
  ArrowUpIcon,
  PlusIcon,
  CircleXIcon,
  FileIcon,
  ArrowLeftIcon,
  TrashIcon,
  FileCodeIcon,
} from "lucide-react";
import {
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  MessageScrollerProvider,
  useMessageScroller,
} from "../ui/message-scroller";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupButton } from "../ui/input-group";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "../ui/empty";
import { Bubble, BubbleContent } from "../ui/bubble";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Input } from "../ui/input";
import FileUploader from "../base/FileUploader";
import { File as FileModel } from "@/app/lib/models";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";

const DEFAULT_LIMIT = 50;
const POLL_INTERVAL_MS = 5000;

function ScrollApiBridge({
  apiRef,
}: {
  apiRef: MutableRefObject<ReturnType<typeof useMessageScroller> | null>;
}) {
  const api = useMessageScroller();
  useEffect(() => {
    apiRef.current = api;
  }, [api, apiRef]);
  return null;
}

/** Скролл к первому непрочитанному входящему или к концу после загрузки. */
function ScrollToUnreadOrEnd({
  receiverId,
  userId,
  messages,
  isLoading,
}: {
  receiverId: number | null;
  userId: number;
  messages: MessageDto[];
  isLoading: boolean;
}) {
  const { scrollToEnd, scrollToMessage } = useMessageScroller();
  const scrolledForReceiverRef = useRef<number | null>(null);

  useEffect(() => {
    scrolledForReceiverRef.current = null;
  }, [receiverId]);

  useEffect(() => {
    if (receiverId == null || isLoading || messages.length === 0) return;
    if (scrolledForReceiverRef.current === receiverId) return;
    scrolledForReceiverRef.current = receiverId;

    const firstUnread = messages.find(
      (message) => message.receiverId === userId && !message.read,
    );

    // Ждём отрисовку Item'ов со scrollAnchor / messageId
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (firstUnread) {
          const ok = scrollToMessage(String(firstUnread.id), {
            align: "start",
            behavior: "auto",
          });
          if (!ok) scrollToEnd({ behavior: "auto" });
        } else {
          scrollToEnd({ behavior: "auto" });
        }
      });
    });
  }, [
    receiverId,
    isLoading,
    messages,
    userId,
    scrollToEnd,
    scrollToMessage,
  ]);

  return null;
}

type ConfirmDelete =
  | { type: "chat" }
  | { type: "message"; messageId: number };

export default function MessagesChat({
  receiver,
  userId,
  limit = DEFAULT_LIMIT,
  onMessageSend,
  onBackButtonClick,
  onChatDeleted,
}: {
  receiver: Receiver | null;
  userId: number;
  limit?: number;
  onMessageSend: (message?: MessageDto) => void;
  onBackButtonClick: () => void;
  onChatDeleted?: () => void;
}) {
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextMessage, setNextMessage] = useState<string>("");
  const [attachmentIds, setAttachmentIds] = useState<number[]>([]);
  const [uploadFiles, setUploadFiles] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const messagesRef = useRef<MessageDto[]>([]);
  const isBusyRef = useRef(false);
  const pollInFlightRef = useRef(false);
  const scrollerApiRef = useRef<ReturnType<typeof useMessageScroller> | null>(
    null,
  );

  const firstUnreadId = messages.find(
    (message) => message.receiverId === userId && !message.read,
  )?.id;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isBusyRef.current = isBusy;
  }, [isBusy]);

  const loadMessages = useCallback(
    async (options?: {
      beforeId?: number;
      appendOlder?: boolean;
      silent?: boolean;
    }) => {
      const appendOlder = options?.appendOlder === true;
      const silent = options?.silent === true;
      if (!receiver) return;
      if (!silent) {
        if (appendOlder) {
          setIsBusy(true);
        } else {
          setIsLoading(true);
        }
        setError(null);
      }
      try {
        const params = new URLSearchParams({
          receiverId: String(receiver.id),
          limit: String(limit),
        });
        if (options?.beforeId != null) {
          params.set("beforeId", String(options.beforeId));
          params.set("markRead", "0");
        }

        const response = await fetch(`/api/message?${params.toString()}`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Не удалось загрузить сообщения");
        }

        const data = (await response.json()) as {
          messages: MessageDto[];
          hasMore: boolean;
        };

        if (!silent || !appendOlder) {
          setHasMore(data.hasMore);
        }
        setMessages((current) => {
          if (appendOlder) return [...data.messages, ...current];
          if (!silent || current.length === 0) return data.messages;
          // Тихий refresh: сохраняем уже подгруженную историю
          const pageMinId = data.messages[0]?.id;
          const older =
            pageMinId != null
              ? current.filter((message) => message.id < pageMinId)
              : [];
          return [...older, ...data.messages];
        });
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
          if (!appendOlder) setMessages([]);
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
          setIsBusy(false);
        }
      }
    },
    [receiver?.id, limit],
  );

  const pollNewMessages = useCallback(async () => {
    if (!receiver || pollInFlightRef.current || isBusyRef.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }

    const lastId = messagesRef.current.at(-1)?.id;
    if (lastId == null) {
      await loadMessages({ silent: true });
      return;
    }

    pollInFlightRef.current = true;
    try {
      const params = new URLSearchParams({
        receiverId: String(receiver.id),
        afterId: String(lastId),
        limit: String(limit),
      });
      const response = await fetch(`/api/message?${params.toString()}`);
      if (!response.ok) return;

      const data = (await response.json()) as {
        messages: MessageDto[];
      };
      if (!data.messages?.length) {
        // Обновить галочки прочтения, если есть непрочитанные исходящие
        const hasUnreadOutgoing = messagesRef.current.some(
          (message) => message.senderId === userId && !message.read,
        );
        if (hasUnreadOutgoing) {
          await loadMessages({ silent: true });
        }
        return;
      }

      const existingIds = new Set(
        messagesRef.current.map((message) => message.id),
      );
      const fresh = data.messages.filter(
        (message) => !existingIds.has(message.id),
      );
      if (!fresh.length) return;

      setMessages((current) => [...current, ...fresh]);
      onMessageSend(fresh[fresh.length - 1]!);
    } catch {
      // тихо: следующий тик повторит
    } finally {
      pollInFlightRef.current = false;
    }
  }, [receiver?.id, limit, loadMessages, onMessageSend, userId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!receiver) return;

    const tick = () => {
      void pollNewMessages();
    };
    const id = window.setInterval(tick, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [receiver?.id, pollNewMessages]);

  const loadOlder = async () => {
    const oldest = messages[0];
    if (!oldest || !hasMore || isBusy) return;
    await loadMessages({ beforeId: oldest.id, appendOlder: true });
  };
  const formatDate = (date: Date) => {
    if (dayjs(date).isSame(dayjs(), "day")) {
      return dayjs(date).format("HH:mm");
    }
    return dayjs(date).format("DD.MM.YYYY HH:mm");
  }

  const sendMessage = async (message: string) => {
    const text = message.trim();
    if ((!text && attachmentIds.length === 0) || isBusy) return;

    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text.length > 0 ? text : "Файлы",
          receiverId: receiver?.id,
          attachmentIds,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Не удалось отправить сообщение");
      }
      const data = (await response.json()) as MessageDto;
      onMessageSend(data);
      setMessages((current) => [...current, data]);
      setNextMessage("");
      setAttachmentIds([]);
      setUploadFiles(false);
      requestAnimationFrame(() => {
        scrollerApiRef.current?.scrollToEnd({ behavior: "smooth" });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setIsBusy(false);
    }
  };

  const askDeleteChat = () => {
    if (!receiver || isBusy || isDeleting) return;
    setConfirmDelete({ type: "chat" });
  };

  const askDeleteMessage = (messageId: number) => {
    if (isBusy || isDeleting) return;
    setConfirmDelete({ type: "message", messageId });
  };

  const runConfirmedDelete = async () => {
    if (!confirmDelete || !receiver) return;
    setIsDeleting(true);
    setError(null);
    try {
      if (confirmDelete.type === "chat") {
        const response = await fetch(
          `/api/message?receiverId=${receiver.id}`,
          { method: "DELETE" },
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Не удалось удалить чат");
        }
        setMessages([]);
        setConfirmDelete(null);
        onChatDeleted?.();
        return;
      }

      const response = await fetch(
        `/api/message/${confirmDelete.messageId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Не удалось удалить сообщение");
      }
      const deletedId = confirmDelete.messageId;
      setMessages((current) =>
        current.filter((message) => message.id !== deletedId),
      );
      setConfirmDelete(null);
      onMessageSend();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    } finally {
      setIsDeleting(false);
    }
  };

  const clearUploadFiles = () => {
    setAttachmentIds([]);
    setUploadFiles(false);
  }

  const downloadFile = (attachment: FileModel) => {
    const filename =
      typeof attachment.url === "string"
        ? attachment.url.split(/[/\\]/).pop()
        : undefined;
    if (!filename) return;
    const url = `/api/uploads/${encodeURIComponent(filename)}`;
    window.open(url, "_blank");
  }

  const roleLabel =
    receiver?.role === "teacher"
      ? "Преподаватель"
      : receiver?.role === "admin"
        ? "Администратор"
        : "Студент";

  return (
    <MessageScrollerProvider
      autoScroll
      defaultScrollPosition={firstUnreadId != null ? "last-anchor" : "end"}
    >
      <ScrollApiBridge apiRef={scrollerApiRef} />
      <ScrollToUnreadOrEnd
        receiverId={receiver?.id ?? null}
        userId={userId}
        messages={messages}
        isLoading={isLoading}
      />
      <div className="relative flex flex-col gap-4 h-full w-full">
        <Card className="mx-auto  max-h-[calc(100dvh-12rem)]  min-h-[calc(100dvh-12rem)] w-full gap-0 h-full">
          {receiver? <CardHeader className="column-gap-3 row-gap-1 border-b grid  grid-cols-[auto_1fr_auto]! md:grid-cols-[1fr_auto]!">
              <Button className="md:hidden row-span-2 row-start-1 col-start-1" variant="outline" size="icon" aria-label="Назад" onClick={onBackButtonClick}>
                <ArrowLeftIcon />
              </Button>
            <CardTitle>
              {receiver.surname} {receiver.name} {receiver.patronymic}
            </CardTitle>
            <CardDescription>{roleLabel}</CardDescription>
            <CardAction className="md:col-start-2 col-start-3 flex gap-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Обновить диалог"
                      onClick={() => void loadMessages()}
                      disabled={isBusy || isLoading}
                    >
                      <RotateCwIcon />
                    </Button>
                  }
                />
                <TooltipContent>
                  <p>Обновить диалог</p>
                </TooltipContent>
              </Tooltip>
              <Button
                variant="outline"
                size="icon"
                aria-label="Удалить чат"
                onClick={askDeleteChat}
                disabled={isBusy || isDeleting}
              >
                <TrashIcon className="text-destructive" />
              </Button>
            </CardAction>
          </CardHeader> :
          <CardHeader className="gap-1 border-b">
            <CardTitle>Выберите чат</CardTitle>
          </CardHeader>}
          <CardContent className="flex-1 overflow-hidden p-0">
            {error && (
              <p className="border-b border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {isLoading && receiver ? (
              <p className="text-muted-foreground flex h-full items-center justify-center text-sm">
                Загрузка сообщений…
              </p>
            ) : messages.length === 0 && receiver ? (
              <Empty className="h-full">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageCircleDashedIcon />
                  </EmptyMedia>
                  <EmptyTitle>Новый чат</EmptyTitle>
                  <EmptyDescription>
                    Напишите сообщение, чтобы начать новый диалог
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : receiver?  (
              <MessageScroller>
                <MessageScrollerViewport>
                  <MessageScrollerContent
                    aria-busy={isBusy}
                    className="p-(--card-spacing)"
                  >
                    {hasMore && (
                      <div className="mb-2 flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void loadOlder()}
                        >
                          Загрузить ещё
                        </Button>
                      </div>
                    )}
                    {messages.map((message) => (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={String(message.id)}
                        scrollAnchor={message.id === firstUnreadId}
                      >
                        <ContextMenu disabled={!!(message.deletedByReceiverAt || message.deletedBySenderAt) || message.senderId !== userId}>
                          <ContextMenuTrigger>
                        <Message
                          align={
                            message.receiverId === userId ? "start" : "end"
                          }
                        >
                          <MessageContent>
                            <Bubble
                              variant="muted"
                            >
                              <BubbleContent   
                               className={cn(message.receiverId === userId ? "bg-blue-300! dark:bg-blue-900!" : "")}
                              >
                                <div className="flex flex-col gap-1">
                                  {message.content && (
                                    <p className={cn("text-sm", message.deletedByReceiverAt || message.deletedBySenderAt ? "text-muted-foreground" : "")}>{message.content}</p>
                                  )}
                                  {message.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {message.attachments.map((attachment) => (
                                        <Attachment
                                          key={attachment.id}
                                          onClick={() =>
                                            downloadFile(attachment)
                                          }
                                          className="max-w-50"
                                        >
                                          <AttachmentMedia>
                                            <FileIcon className="size-4" />
                                          </AttachmentMedia>
                                          <AttachmentContent>
                                            <AttachmentTitle>
                                              {attachment.originalName}
                                            </AttachmentTitle>
                                            <AttachmentDescription>
                                              {attachment.sizeBytes /
                                                1024 /
                                                1024 >
                                              1
                                                ? (
                                                    attachment.sizeBytes /
                                                    1024 /
                                                    1024
                                                  ).toFixed(2) + " MB"
                                                : (
                                                    attachment.sizeBytes / 1024
                                                  ).toFixed(2) + " KB"}
                                              ·{" "}
                                              {attachment.originalName
                                                .split(".")
                                                .pop()
                                                ?.toUpperCase()}
                                            </AttachmentDescription>
                                          </AttachmentContent>
                                        </Attachment>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </BubbleContent>
                            </Bubble>
                            
                            <MessageFooter className="p-0">
                              <div className="flex gap-3 justify-between">
                                <span>{formatDate(message.sentAt)}</span>
                                {message.senderId === userId &&
                                  (message.read ? (
                                    <CheckCheck
                                      size={16}
                                      className="text-blue-500"
                                    />
                                  ) : (
                                    <Check
                                      size={16}
                                      className="text-muted-foreground"
                                    />
                                  ))}
                              </div>
                            </MessageFooter>
                          </MessageContent>
                        </Message>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            onClick={() => askDeleteMessage(message.id)}
                          >
                            <TrashIcon className="text-destructive" />
                            Удалить сообщение
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                      </MessageScrollerItem>
                    ))}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>) :
              <Empty className="h-full">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <MessageCircleDashedIcon />
                    </EmptyMedia>
                    <EmptyTitle>Здесь будут отображаться сообщения</EmptyTitle>
                    <EmptyDescription>
                        Выберите чат из списка слева
                    </EmptyDescription>
                </EmptyHeader>
              </Empty>}
          </CardContent>
          <CardFooter className="flex-col gap-2">
            {receiver && <form
              onSubmit={(e) => {
                e.preventDefault();
                if ((!nextMessage.trim() && attachmentIds.length === 0) || isBusy) return;
                void sendMessage(nextMessage);
              }}
              className="w-full"
            >
              <InputGroup>
                <div className="h-14 w-full px-3 py-2.5">
                  <Input
                    type="text"
                    className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={nextMessage}
                    onChange={(e) => setNextMessage(e.target.value)}
                    placeholder="Введите сообщение…"
                    disabled={isBusy}
                  />
                </div>
                {uploadFiles && <div className="relative w-full px-2">
                  <FileUploader onUploaded={(files: FileModel[]) => setAttachmentIds(files.map((file) => file.id))} multiple={true} className="w-full" />
                    <Button className="absolute top-5 right-3" variant="ghost" size="icon-sm" onClick={clearUploadFiles}>
                        <CircleXIcon />
                    </Button>
                </div>}
                <InputGroupAddon align="block-end" className="pt-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <InputGroupButton
                          aria-label="Add files"
                          type="button"
                          size="icon-sm"
                          variant="outline"
                        >
                          <PlusIcon />
                        </InputGroupButton>
                      }
                    />
                    <DropdownMenuContent
                      align="start"
                      side="top"
                      className="w-44"
                    >
                      <DropdownMenuItem onClick={() => setUploadFiles(true)}>
                        <PaperclipIcon />
                        Добавить фото и файлы
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <InputGroupButton
                    type="submit"
                    variant="default"
                    size="icon-sm"
                    disabled={(!nextMessage.trim() && attachmentIds.length === 0) || isBusy}
                    className="ml-auto"
                  >
                    <ArrowUpIcon />
                    <span className="sr-only">Отправить</span>
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>}
          </CardFooter>
        </Card>

        <Dialog
          open={confirmDelete != null}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setConfirmDelete(null);
          }}
        >
          <DialogContent showCloseButton={!isDeleting}>
            <DialogHeader>
              <DialogTitle>
                {confirmDelete?.type === "chat"
                  ? "Удалить чат?"
                  : "Удалить сообщение?"}
              </DialogTitle>
              <DialogDescription>
                {confirmDelete?.type === "chat"
                  ? "Диалог исчезнет только у вас. У собеседника переписка останется."
                  : "Сообщение будет удалено только у вас. Это действие нельзя отменить."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() => setConfirmDelete(null)}
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting}
                onClick={() => void runConfirmedDelete()}
              >
                {isDeleting ? "Удаление…" : "Удалить"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MessageScrollerProvider>
  );
}
