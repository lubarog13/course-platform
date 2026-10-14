import type { LessonComment, Role } from "@prisma/client";

import {
  asOptionalId,
  asRequiredId,
  asRequiredString,
  requireObject,
} from "@/app/lib/api";
import { isCourseStaff } from "@/app/lib/enrollment";
import { prisma } from "@/app/lib/prisma";

export type CommentUser = {
  name: string;
  surname: string;
  id: number;
};

export type CommentReply = {
  id: number;
  lessonId: number;
  userId: number;
  parentId: number | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user: CommentUser;
};

export type CommentDto = Omit<CommentReply, "repliesCount"> & {
  replies: CommentReply[];
  repliesCount: number;
};

export type CommentListResult = {
  items: CommentDto[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
  teacherIds: number[];
};

const commentUserSelect = {
  name: true,
  surname: true,
  id: true,
} as const;

function parseIntParam(
  value: string | null | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function serializeUser(user: CommentUser): CommentUser {
  return {
    id: user.id,
    name: user.name,
    surname: user.surname,
  };
}

function serializeReply(
  comment: LessonComment & { user: CommentUser },
): CommentReply {
  return {
    id: comment.id,
    lessonId: comment.lessonId,
    userId: comment.userId,
    parentId: comment.parentId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    deletedAt: comment.deletedAt?.toISOString() ?? null,
    user: serializeUser(comment.user),
  };
}

function serializeComment(
  comment: LessonComment & {
    user: CommentUser;
    replies: (LessonComment & { user: CommentUser })[];
    repliesCount: number;
  },
): CommentDto {
  return {
    ...serializeReply(comment),
    replies: comment.replies.map(serializeReply),
    repliesCount: comment.repliesCount,
  };
}

type LessonAccess = {
  courseId: number;
  teacherIds: number[];
  needEnrollment: boolean;
};

async function resolveLessonAccess(lessonId: number): Promise<LessonAccess> {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null },
    select: {
      coursePart: {
        select: {
          courseId: true,
          course: {
            select: {
              needEnrollment: true,
              instructors: { select: { userId: true } },
            },
          },
        },
      },
    },
  });

  if (!lesson?.coursePart) {
    throw new Error("Урок не найден", { cause: "not_found" });
  }

  return {
    courseId: lesson.coursePart.courseId,
    needEnrollment: lesson.coursePart.course.needEnrollment,
    teacherIds: lesson.coursePart.course.instructors.map((item) => item.userId),
  };
}

/** Проверка: staff, открытый курс или активная запись. */
export async function assertCanAccessLessonComments(
  lessonId: number,
  actor: { id: number; role: Role },
): Promise<LessonAccess> {
  const access = await resolveLessonAccess(lessonId);

  if (await isCourseStaff(access.courseId, actor.id, actor.role)) {
    return access;
  }

  if (!access.needEnrollment) {
    return access;
  }

  const enrollment = await prisma.userCourse.findFirst({
    where: {
      userId: actor.id,
      courseId: access.courseId,
      status: { in: ["enrolled", "in_progress", "completed"] },
    },
    select: { id: true },
  });

  if (!enrollment) {
    throw new Error("Нет доступа к комментариям урока", { cause: "no_access" });
  }

  return access;
}

export async function listComments(
  lessonId: number,
  parentId: number | null,
  limit: string | null,
  offset: string | null,
): Promise<Omit<CommentListResult, "teacherIds">> {
  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    throw new Error("Некорректный lessonId", { cause: "invalid" });
  }

  const limitNum = parseIntParam(limit, 50, 1, 100);
  const offsetNum = parseIntParam(offset, 0, 0, 1_000_000);

  const where = {
    lessonId,
    parentId,
    deletedAt: null,
  };

  const [rows, total] = await prisma.$transaction([
    prisma.lessonComment.findMany({
      where,
      take: limitNum,
      skip: offsetNum,
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: commentUserSelect },
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          take: limitNum,
          skip: offsetNum,
          include: {
            user: { select: commentUserSelect },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    }),
    prisma.lessonComment.count({ where }),
  ]);

  return {
    items: rows.map((row) => serializeComment({ ...row, repliesCount: row._count.replies })),
    total,
    page: Math.floor(offsetNum / limitNum) + 1,
    limit: limitNum,
    pageCount: Math.max(1, Math.ceil(total / limitNum)),
  };
}

export type CreateCommentInput = {
  lessonId: number;
  content: string;
  parentId?: number | null;
};

export function parseCreateCommentBody(body: unknown): CreateCommentInput {
  const raw = requireObject(body);
  const parentId =
    raw.parentId === undefined ? undefined : asOptionalId(raw.parentId, "parentId");

  return {
    lessonId: asRequiredId(raw.lessonId, "lessonId"),
    content: asRequiredString(raw.content, "content"),
    parentId: parentId === undefined ? null : parentId,
  };
}

export type UpdateCommentInput = {
  content: string;
};

export function parseUpdateCommentBody(body: unknown): UpdateCommentInput {
  const raw = requireObject(body);
  return {
    content: asRequiredString(raw.content, "content"),
  };
}

export async function createComment(
  actor: { id: number; role: Role },
  data: CreateCommentInput,
): Promise<CommentDto> {
  await assertCanAccessLessonComments(data.lessonId, actor);

  if (data.parentId) {
    const parent = await prisma.lessonComment.findFirst({
      where: {
        id: data.parentId,
        lessonId: data.lessonId,
        deletedAt: null,
      },
      select: { id: true, parentId: true },
    });
    if (!parent) {
      throw new Error("Родительский комментарий не найден", { cause: "not_found" });
    }
    // Ответы только на корневые комментарии (один уровень вложенности)
    if (parent.parentId != null) {
      throw new Error("Нельзя ответить на ответ", { cause: "invalid" });
    }
  }

  const created = await prisma.lessonComment.create({
    data: {
      lessonId: data.lessonId,
      userId: actor.id,
      parentId: data.parentId ?? null,
      content: data.content,
    },
    include: {
      user: { select: commentUserSelect },
      replies: {
        where: { deletedAt: null },
        include: { user: { select: commentUserSelect } },
        _count: {
          select: { replies: true },
        },
      },
    },
  });

  return serializeComment({ ...created, repliesCount: created.replies.length ?? 0 });
}

export async function findComment(id: number, repliesLimit: number, repliesOffset: number) {
  return prisma.lessonComment.findFirst({
    where: { id, deletedAt: null },
    include: {
      user: { select: commentUserSelect },
      replies: {
        where: { deletedAt: null },
        take: repliesLimit,
        skip: repliesOffset,
        orderBy: { createdAt: "asc" },
        include: { user: { select: commentUserSelect } },
      },
      lesson: {
        select: {
          coursePart: { select: { courseId: true } },
        },
      },
    },
  });
}

export async function getInstructors(lessonId: number) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null },
    select: {
      coursePart: { select: { course: { select: { instructors: { select: { userId: true } } } } } },
    },
  });
  return lesson?.coursePart?.course?.instructors.map((instructor) => instructor.userId);
}

export async function updateComment(
  id: number,
  actor: { id: number; role: Role },
  data: UpdateCommentInput,
): Promise<CommentDto> {
  const existing = await findComment(id, 50, 0);
  if (!existing) {
    throw new Error("Комментарий не найден", { cause: "not_found" });
  }

  await assertCanAccessLessonComments(existing.lessonId, actor);

  if (existing.userId !== actor.id) {
    throw new Error("Можно редактировать только свой комментарий", {
      cause: "no_access",
    });
  }

  const updated = await prisma.lessonComment.update({
    where: { id },
    data: { content: data.content },
    include: {
      user: { select: commentUserSelect },
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { user: { select: commentUserSelect } },
      },
    },
  });

  return serializeComment({ ...updated, repliesCount: updated.replies.length ?? 0 });
}

export async function deleteComment(
  id: number,
  actor: { id: number; role: Role },
): Promise<{ ok: true }> {
  const existing = await findComment(id, 50, 0);
  if (!existing) {
    throw new Error("Комментарий не найден", { cause: "not_found" });
  }

  const courseId = existing.lesson.coursePart?.courseId;
  if (!courseId) {
    throw new Error("Урок не найден", { cause: "not_found" });
  }

  const isAuthor = existing.userId === actor.id;
  const staff = await isCourseStaff(courseId, actor.id, actor.role);

  if (!isAuthor && !staff) {
    throw new Error("Нет прав на удаление комментария", { cause: "no_access" });
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.lessonComment.update({
      where: { id },
      data: { deletedAt: now },
    }),
    // Мягко удаляем прямые ответы вместе с корневым
    prisma.lessonComment.updateMany({
      where: { parentId: id, deletedAt: null },
      data: { deletedAt: now },
    }),
  ]);

  return { ok: true };
}
