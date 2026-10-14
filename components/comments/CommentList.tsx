"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PencilIcon, TrashIcon, UserCircle } from "lucide-react";

import type { CommentDto, CommentReply } from "@/app/lib/comments";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type CommentListProps = {
  lessonId: number;
  teacherIds?: number[];
  parentId?: number | null;
};

function formatCommentDate(value: string) {
  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function userLabel(user: CommentReply["user"]) {
  const initial = user.surname?.charAt(0) ?? "";
  return `${user.name}${initial ? ` ${initial}.` : ""}`;
}

export default function CommentList({
  lessonId,
  parentId = null,
}: CommentListProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ? Number(session.user.id) : null;
  const isAdmin = session?.user?.role === "admin";

  const [comments, setComments] = useState<CommentDto[]>([]);
  const [teacherIds, setTeacherIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [rootContent, setRootContent] = useState("");
  const [replyId, setReplyId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [offset, setOffset] = useState(0);
  const [repliesOffsets, setRepliesOffsets] = useState<Record<number, number>>({});
  const [totalComments, setTotalComments] = useState(0);

  const canModerate = (userId: number) =>
    currentUserId === userId ||
    isAdmin ||
    (currentUserId != null && teacherIds.includes(currentUserId));

  const fetchComments = async (signal?: AbortSignal) => {
    setError(null);
    const params = new URLSearchParams({ lessonId: String(lessonId) });
    params.set("offset", String(offset));
    if (parentId != null) params.set("parentId", String(parentId));

    try {
      const res = await fetch(`/api/comments?${params}`, { signal });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось загрузить комментарии");
      }
      if (offset === 0) {
        setComments(data.items ?? []);
      } else {
        setComments((prev) => [...prev, ...(data.items ?? [])]);
      }
      data.items.forEach((item: CommentDto) => {
        setRepliesOffsets((prev) => ({
          ...prev,
          [item.id]: item.replies?.length ?? 0,
        }));
      });
      setTotalComments(data.total ?? 0);
      if (Array.isArray(data.teacherIds)) {
        setTeacherIds(data.teacherIds);
      }
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const fetchReplies = async (commentId: number, signal?: AbortSignal) => {
    const offset = repliesOffsets[commentId] ?? 0;
    const res = await fetch(`/api/comments/${commentId}?limit=50&offset=${offset}`, { signal });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось загрузить ответы");
    }
    const replies = data.items ?? [];
    const comment = comments.find((comment) => comment.id === commentId);
    if (comment) {
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? { ...comment, replies: [...(comment.replies ?? []), ...replies] } : comment,
        ),
      );
    }
    setRepliesOffsets((prev) => ({
      ...prev,
      [commentId]: (prev[commentId] ?? 0) + replies.length,
    }));
  };

  const loadMoreComments = () => {
    setOffset(offset + 50);
    const controller = new AbortController();
    fetchComments(controller.signal);
    return () => controller.abort();
  };

  const loadMoreReplies = (commentId: number) => {
    const controller = new AbortController();
    fetchReplies(commentId, controller.signal);
    return () => controller.abort();
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchComments(controller.signal);
    return () => controller.abort();
  }, [lessonId, parentId]);

  const createComment = async (content: string, replyTo: number | null) => {
    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          content: trimmed,
          parentId: replyTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось отправить комментарий");
      }

      if (replyTo == null) {
        setComments((prev) => [...prev, data as CommentDto]);
        setRootContent("");
      } else {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === replyTo
              ? {
                  ...comment,
                  replies: [...(comment.replies ?? []), data as CommentReply],
                }
              : comment,
          ),
        );
        setReplyId(null);
        setReplyContent("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdit = async (id: number) => {
    const trimmed = editContent.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось сохранить");
      }

      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === id) {
            return { ...comment, content: data.content, updatedAt: data.updatedAt };
          }
          return {
            ...comment,
            replies: comment.replies.map((reply) =>
              reply.id === id
                ? { ...reply, content: data.content, updatedAt: data.updatedAt }
                : reply,
            ),
          };
        }),
      );
      setEditingId(null);
      setEditContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSubmitting(false);
    }
  };

  const removeComment = async (id: number, isReply: boolean, parentCommentId?: number) => {
    if (submitting) return;
    if (!window.confirm("Удалить комментарий?")) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось удалить");
      }

      if (isReply && parentCommentId != null) {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === parentCommentId
              ? {
                  ...comment,
                  replies: comment.replies.filter((reply) => reply.id !== id),
                }
              : comment,
          ),
        );
      } else {
        setComments((prev) => prev.filter((comment) => comment.id !== id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    } finally {
      setSubmitting(false);
    }
  };

  const renderBody = (
    comment: CommentReply,
    options: { isReply?: boolean; parentId?: number } = {},
  ) => {
    const isEditing = editingId === comment.id;
    const isTeacher = teacherIds.includes(comment.user.id);
    const isOwner = currentUserId === comment.userId;

    return (
      <Item key={comment.id} className={options.isReply ? "ml-8 border-l border-l-gray-200 pl-4 w-[calc(100%_-_var(--spacing)_*_8)]" : undefined}>
        <ItemMedia variant="icon">
          <UserCircle className="h-10 w-10" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>
            {userLabel(comment.user)}
            {isTeacher && (
              <span className="ml-2 text-sm font-normal text-green-600">
                Преподаватель
              </span>
            )}
            {
              isOwner && (
                <span className="ml-1 text-sm font-normal text-gray-500">
                (Вы)
                </span>
              )
            }
          </ItemTitle>
          <ItemDescription className="text-sm text-muted-foreground">
            {formatCommentDate(comment.createdAt)}
          </ItemDescription>
          {isEditing ? (
            <div className="mt-2 flex flex-col gap-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={submitting || !editContent.trim()}
                  onClick={() => saveEdit(comment.id)}
                >
                  Сохранить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setEditContent("");
                  }}
                >
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <ItemDescription className="whitespace-pre-wrap text-foreground">
              {comment.content}
            </ItemDescription>
          )}
        </ItemContent>
        <ItemActions className="flex flex-wrap gap-1">
          {!options.isReply && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReplyId(comment.id);
                setReplyContent("");
                setEditingId(null);
              }}
            >
              Ответить
            </Button>
          )}
          {isOwner && !isEditing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditingId(comment.id);
                setEditContent(comment.content);
                setReplyId(null);
              }}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          )}
          {canModerate(comment.userId) && !isEditing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                removeComment(comment.id, !!options.isReply, options.parentId)
              }
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
        </ItemActions>

        {replyId === comment.id && (
          <div className="mt-3 flex w-full flex-col gap-2 px-2">
            <Label>
              Ответ пользователю{" "}
              <span className="font-semibold">{userLabel(comment.user)}</span>
            </Label>
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Напишите ответ"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={submitting || !replyContent.trim()}
                onClick={() => createComment(replyContent, comment.id)}
              >
                Ответить
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyId(null);
                  setReplyContent("");
                }}
              >
                Отмена
              </Button>
            </div>
          </div>
        )}
      </Item>
    );
  };

  if (loading) {
    return (
      <div className="py-4 text-muted-foreground">
        Загрузка комментариев…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <hr className="mt-8 mb-4" />
      <h2 className="text-lg font-bold">Комментарии</h2>
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {comments.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground">
          Нет комментариев
        </div>
      ) : (
        <>
        <ItemGroup>
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              {renderBody(comment)}
              {comment.replies?.map((reply) =>
                renderBody(reply, { isReply: true, parentId: comment.id }),
              )}
            </div>
          ))}
        </ItemGroup>
        {comments.length < totalComments && (<>
            <div className="text-center my-5 text-muted-foreground cursor-pointer" onClick={loadMoreComments}>
              Ещё {totalComments - comments.length} комментариев
            </div>
          </>
          )}
          </>
      )}

      {parentId == null && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`comment-${lessonId}`}>Новый комментарий</Label>
          <Textarea
            id={`comment-${lessonId}`}
            value={rootContent}
            onChange={(e) => setRootContent(e.target.value)}
            placeholder="Напишите комментарий"
            rows={3}
          />
          <Button
          className="w-fit min-w-[200px]"
            variant="outline"
            disabled={submitting || !rootContent.trim() || currentUserId == null}
            onClick={() => createComment(rootContent, null)}
          >
            Отправить
          </Button>
        </div>
      )}
    </div>
  );
}
