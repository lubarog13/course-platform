"use client";

import { MessageDto, Receiver } from "@/app/lib/messages";
import { Message, MessageContent, MessageFooter } from "../ui/message";
import { MessageScrollerProvider } from "../ui/message-scroller";
import { Card, CardContent, CardFooter } from "../ui/card";
import { CardHeader, CardTitle, CardDescription, CardAction } from "../ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { Button } from "../ui/button";
import {
  Check,
  CheckCheck,
  RotateCwIcon,
  MessageCircleDashedIcon,
  PaperclipIcon,
  ArrowUpIcon,
  PlusIcon,
  CircleXIcon,
} from "lucide-react";
import {
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerButton,
} from "../ui/message-scroller";
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
import { useCallback, useEffect, useState } from "react";
import { Input } from "../ui/input";
import FileUploader from "../base/FileUploader";
import { File as FileModel } from "@/app/lib/models";

const DEFAULT_LIMIT = 50;

export default function MessagesChat({
  receiver,
  userId,
  limit = DEFAULT_LIMIT,
}: {
  receiver: Receiver | null;
  userId: number;
  limit?: number;
}) {
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextMessage, setNextMessage] = useState<string>("");
  const [attachmentIds, setAttachmentIds] = useState<number[]>([]);
  const [uploadFiles, setUploadFiles] = useState<boolean>(false);

  const loadMessages = useCallback(
    async (options?: { beforeId?: number; appendOlder?: boolean }) => {
      const appendOlder = options?.appendOlder === true;
      if (!receiver) return;
      if (appendOlder) {
        setIsBusy(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const params = new URLSearchParams({
          receiverId: String(receiver?.id),
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

        setHasMore(data.hasMore);
        setMessages((current) =>
          appendOlder ? [...data.messages, ...current] : data.messages,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
        if (!appendOlder) setMessages([]);
      } finally {
        setIsLoading(false);
        setIsBusy(false);
      }
    },
    [receiver?.id, limit],
  );

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const loadOlder = async () => {
    const oldest = messages[0];
    if (!oldest || !hasMore || isBusy) return;
    await loadMessages({ beforeId: oldest.id, appendOlder: true });
  };

  const sendMessage = async (message: string) => {
    const text = message.trim();
    if (!text || isBusy) return;

    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
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
      setMessages((current) => [...current, data]);
      setNextMessage("");
      setAttachmentIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setIsBusy(false);
    }
  };

  const clearUploadFiles = () => {
    setAttachmentIds([]);
    setUploadFiles(false);
  }

  const roleLabel =
    receiver?.role === "teacher"
      ? "Преподаватель"
      : receiver?.role === "admin"
        ? "Администратор"
        : "Студент";

  return (
    <MessageScrollerProvider>
      <div className="relative flex flex-col gap-4">
        <Card className="mx-auto h-140 w-full max-w-sm gap-0">
          {receiver? <CardHeader className="gap-1 border-b">
            <CardTitle>
              {receiver.surname} {receiver.name} {receiver.patronymic}
            </CardTitle>
            <CardDescription>{roleLabel}</CardDescription>
            <CardAction>
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
                      <Message key={message.id}>
                        <MessageContent>
                          <Bubble
                            variant={
                              message.receiverId === userId
                                ? "default"
                                : "secondary"
                            }
                          >
                            <BubbleContent>{message.content}</BubbleContent>
                          </Bubble>
                        </MessageContent>
                        <MessageFooter>
                          <div className="flex w-full justify-between">
                            <span>
                              {new Date(message.sentAt).toLocaleString("ru-RU")}
                            </span>
                            {message.senderId === userId &&
                              (message.read ? (
                                <CheckCheck className="text-blue-500" />
                              ) : (
                                <Check className="text-muted-foreground" />
                              ))}
                          </div>
                        </MessageFooter>
                      </Message>
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
                if (!nextMessage.trim() || isBusy) return;
                void sendMessage(nextMessage);
              }}
              className="w-full"
            >
              <InputGroup>
                <div className="h-14 w-full px-3 py-2.5">
                  <Input
                    type="text"
                    value={nextMessage}
                    onChange={(e) => setNextMessage(e.target.value)}
                    placeholder="Введите сообщение…"
                    disabled={isBusy}
                  />
                </div>
                {uploadFiles && <div className="relative">
                  <FileUploader onUploaded={(files: FileModel[]) => setAttachmentIds(files.map((file) => file.id))} multiple={true} />
                    <Button className="absolute top-0 right-0" variant="outline" size="icon-sm" onClick={clearUploadFiles}>
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
                    disabled={!nextMessage.trim() || isBusy}
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
      </div>
    </MessageScrollerProvider>
  );
}
