import type { File as Attachment, Message, Role } from "@prisma/client";

import {
  asBoolean,
  asRequiredId,
  asRequiredString,
  requireObject,
} from "@/app/lib/api";
import { prisma } from "@/app/lib/prisma";
import { isCourseStaff } from "./enrollment";

export type Receiver = {
  id: number;
  name: string;
  surname: string;
  patronymic: string | null;
  email: string;
  phone: string | null;
  role: Role | string;
  roleDescription?: string
};

export type MessageDto = Message & {
  sender: Pick<Receiver, "id" | "name" | "surname" | "patronymic" | "role">;
  receiver: Pick<Receiver, "id" | "name" | "surname" | "patronymic" | "role">;
  attachments: Attachment[];
};

export type ConversationDto = {
  peer: Pick<Receiver, "id" | "name" | "surname" | "patronymic" | "role" | "email">;
  lastMessage: {
    id: number;
    content: string | null;
    sentAt: Date;
    read: boolean;
    senderId: number;
    hasAttachments: boolean;
  } | null;
  unreadCount: number;
};

const userPreviewSelect = {
  id: true,
  name: true,
  surname: true,
  patronymic: true,
  role: true,
} as const;

const userPeerSelect = {
  ...userPreviewSelect,
  email: true,
} as const;

const messageInclude = {
  sender: { select: userPreviewSelect },
  receiver: { select: userPreviewSelect },
  attachments: {
    include: { file: true },
  },
} as const;

export type MessageCreateData = {
  receiverId: number;
  content: string;
  attachmentIds?: number[];
};

export type MessageUpdateData = {
  /** Единственное разрешённое изменение — мягкое удаление для текущего участника */
  deleted?: true;
  read?: true;
};

export function parseMessageCreateBody(body: unknown): MessageCreateData {
  const raw = requireObject(body);
  const receiverId = asRequiredId(raw.receiverId, "receiverId");
  const content = asRequiredString(raw.content, "content");
  if (content.length > 10_000) {
    throw new Error("Сообщение не может быть длиннее 10000 символов", {
      cause: "invalid",
    });
  }

  let attachmentIds: number[] | undefined;
  if (raw.attachmentIds !== undefined) {
    if (!Array.isArray(raw.attachmentIds)) {
      throw new Error("Поле attachmentIds должно быть массивом", {
        cause: "invalid",
      });
    }
    attachmentIds = raw.attachmentIds.map((id, index) =>
      asRequiredId(id, `attachmentIds[${index}]`),
    );
  }

  return {
    receiverId,
    content,
    ...(attachmentIds !== undefined ? { attachmentIds } : {}),
  };
}

export function parseMessageUpdateBody(body: unknown): MessageUpdateData {
  const raw = requireObject(body);
  const data: MessageUpdateData = {};

  if (raw.deleted !== undefined) {
    if (asBoolean(raw.deleted, "deleted") !== true) {
      throw new Error("Можно только пометить сообщение удалённым (deleted: true)", {
        cause: "invalid",
      });
    }
    data.deleted = true;
  }

  if (raw.read !== undefined) {
    if (asBoolean(raw.read, "read") !== true) {
      throw new Error("Можно только отметить сообщение прочитанным (read: true)", {
        cause: "invalid",
      });
    }
    data.read = true;
  }

  if (Object.keys(data).length === 0) {
    throw new Error(
      "Нет полей для обновления. Разрешены только deleted и read",
      { cause: "invalid" },
    );
  }

  // Контент и прочие поля редактировать нельзя
  const forbidden = ["content", "receiverId", "senderId", "sentAt", "attachmentIds"];
  for (const key of forbidden) {
    if (key in raw) {
      throw new Error("Редактирование содержимого сообщения запрещено", {
        cause: "invalid",
      });
    }
  }

  return data;
}

function serializeMessage(
  message: {
    id: number;
    senderId: number;
    receiverId: number;
    content: string;
    sentAt: Date;
    read: boolean;
    deletedBySenderAt: Date | null;
    deletedByReceiverAt: Date | null;
    sender: MessageDto["sender"];
    receiver: MessageDto["receiver"];
    attachments: Array<{ file: Attachment }>;
  },
  viewerId: number,
): MessageDto {
  const deletedForViewer =
    (message.senderId === viewerId && message.deletedBySenderAt != null) ||
    (message.receiverId === viewerId && message.deletedByReceiverAt != null);

  return {
    id: message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    content: deletedForViewer ? "" : message.content,
    sentAt: message.sentAt,
    read: message.read,
    deletedBySenderAt: message.deletedBySenderAt,
    deletedByReceiverAt: message.deletedByReceiverAt,
    sender: message.sender,
    receiver: message.receiver,
    attachments: deletedForViewer
      ? []
      : message.attachments.map((item) => item.file),
  };
}

export type ThreadMessagesResult = {
  messages: MessageDto[];
  hasMore: boolean;
  limit: number;
};

/** Диалог между текущим пользователем и peerId (последние `limit` сообщений). */
export async function listMessagesWithPeer(
  viewerId: number,
  peerId: number,
  options: {
    limit?: number;
    beforeId?: number | null;
    /** Только сообщения новее этого id (для polling) */
    afterId?: number | null;
  } = {},
): Promise<ThreadMessagesResult> {
  if (viewerId === peerId) {
    throw new Error("Нельзя открыть диалог с самим собой", { cause: "invalid" });
  }

  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const beforeId = options.beforeId ?? null;
  const afterId = options.afterId ?? null;

  if (beforeId != null && afterId != null) {
    throw new Error("Нельзя одновременно указывать beforeId и afterId", {
      cause: "invalid",
    });
  }

  const peer = await prisma.user.findFirst({
    where: { id: peerId, deletedAt: null },
    select: { id: true },
  });
  if (!peer) {
    throw new Error("Собеседник не найден", { cause: "not_found" });
  }

  const threadOr = [
    {
      senderId: viewerId,
      receiverId: peerId,
      deletedBySenderAt: null,
    },
    {
      senderId: peerId,
      receiverId: viewerId,
      deletedByReceiverAt: null,
    },
  ];

  if (afterId != null) {
    const anchor = await prisma.message.findFirst({
      where: {
        id: afterId,
        OR: [
          { senderId: viewerId, receiverId: peerId },
          { senderId: peerId, receiverId: viewerId },
        ],
      },
      select: { id: true },
    });
    if (!anchor) {
      throw new Error("Сообщение-якорь не найдено", { cause: "not_found" });
    }

    const rows = await prisma.message.findMany({
      where: {
        OR: threadOr,
        id: { gt: afterId },
      },
      include: messageInclude,
      orderBy: [{ sentAt: "asc" }, { id: "asc" }],
      take: limit,
    });

    return {
      messages: rows.map((message) => serializeMessage(message, viewerId)),
      hasMore: false,
      limit,
    };
  }

  let beforeSentAt: Date | undefined;
  if (beforeId != null) {
    const anchor = await prisma.message.findFirst({
      where: {
        id: beforeId,
        OR: [
          { senderId: viewerId, receiverId: peerId },
          { senderId: peerId, receiverId: viewerId },
        ],
      },
      select: { sentAt: true },
    });
    if (!anchor) {
      throw new Error("Сообщение-якорь не найдено", { cause: "not_found" });
    }
    beforeSentAt = anchor.sentAt;
  }

  const threadWhere = {
    OR: threadOr,
    ...(beforeSentAt ? { sentAt: { lt: beforeSentAt } } : {}),
  };

  const rows = await prisma.message.findMany({
    where: threadWhere,
    include: messageInclude,
    orderBy: [{ sentAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  page.reverse();

  return {
    messages: page.map((message) => serializeMessage(message, viewerId)),
    hasMore,
    limit,
  };
}

/** Список диалогов текущего пользователя. */
export async function listConversations(viewerId: number): Promise<ConversationDto[]> {
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: viewerId, deletedBySenderAt: null },
        { receiverId: viewerId, deletedByReceiverAt: null },
      ],
    },
    include: {
      sender: { select: userPeerSelect },
      receiver: { select: userPeerSelect },
      attachments: {
        select: {
          file: {
            select: {
              id: true,
            },
          },
        },
      },
    },
    orderBy: { sentAt: "desc" },
  });

  const byPeer = new Map<number, ConversationDto>();

  for (const message of messages) {
    const peerId =
      message.senderId === viewerId ? message.receiverId : message.senderId;
    const peer =
      message.senderId === viewerId ? message.receiver : message.sender;

    const deletedForViewer =
      (message.senderId === viewerId && message.deletedBySenderAt != null) ||
      (message.receiverId === viewerId && message.deletedByReceiverAt != null);
    if (deletedForViewer) continue;

    const existing = byPeer.get(peerId);
    if (!existing) {
      byPeer.set(peerId, {
        peer: {
          id: peer.id,
          name: peer.name,
          surname: peer.surname,
          patronymic: peer.patronymic,
          role: peer.role,
          email: peer.email,
        },
        lastMessage: {
          id: message.id,
          content: message.content,
          sentAt: message.sentAt,
          read: message.read,
          senderId: message.senderId,
          hasAttachments: message.attachments.length > 0,
        },
        unreadCount:
          message.receiverId === viewerId && !message.read ? 1 : 0,
      });
    } else if (message.receiverId === viewerId && !message.read) {
      existing.unreadCount += 1;
    }
  }

  return [...byPeer.values()].sort((a, b) => {
    const aTime = a.lastMessage?.sentAt.getTime() ?? 0;
    const bTime = b.lastMessage?.sentAt.getTime() ?? 0;
    return bTime - aTime;
  });
}

/**Список возможных получателей сообщения. */
export async function listPossibleReceivers(viewerId: number): Promise<Receiver[]> {
  const courses = await prisma.userCourse.findMany({
    where: { userId: viewerId},
    select: { courseId: true },
  });

  const courseIds = courses.map((course) => course.courseId);

  const result = [];
  for (const courseId of courseIds) {
    const instructors = await prisma.courseInstructor.findMany({
      where: { courseId, deletedAt: null },
      select: { 
        user: {
        select: {
          id: true,
          name: true,
          surname: true,
          patronymic: true,
          email: true,
          phone: true,
          role: true,
        },
      },
    course: {
      select: {
        name: true,
      }
    }
    },
    });

    result.push(...instructors.map((instructor) => ({
      id: instructor.user.id,
      name: instructor.user.name,
      surname: instructor.user.surname,
      patronymic: instructor.user.patronymic,
      email: instructor.user.email,
      phone: instructor.user.phone,
      role: instructor.user.role,
      roleDescription: 'Преподаватель курса ' + instructor.course.name,
    })));
  }
  const coursesAsTeacher = await prisma.courseInstructor.findMany({
    where: { userId: viewerId},
    select: {
      course: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  for (const course of coursesAsTeacher) {
      const students = await prisma.userCourse.findMany({
        where: { courseId: course.course.id},
        select: { user: {
          select: {
            id: true,
            name: true,
            surname: true,
            patronymic: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    result.push(...students.map((student) => ({
      id: student.user.id,
      name: student.user.name,
      surname: student.user.surname,
      patronymic: student.user.patronymic,
      email: student.user.email,
      phone: student.user.phone,
      role: student.user.role,
      roleDescription: 'Студент курса ' + course.course.name,
    })));
  }
  const admins = await prisma.user.findMany({
    where: { role: 'admin'},
    select: {
      id: true,
      name: true,
      surname: true,
      patronymic: true,
      email: true,
      phone: true,
      role: true,
    },
  });
  result.push(...admins.map((admin) => ({
    id: admin.id,
    name: admin.name,
    surname: admin.surname,
    patronymic: admin.patronymic,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
    roleDescription: 'Администратор',
  })));
  return result;
}

export async function createMessage(senderId: number, data: MessageCreateData) {
  if (senderId === data.receiverId) {
    throw new Error("Нельзя отправить сообщение самому себе", {
      cause: "invalid",
    });
  }

  const receiver = await prisma.user.findFirst({
    where: { id: data.receiverId, deletedAt: null },
    select: { id: true },
  });
  if (!receiver) {
    throw new Error("Получатель не найден", { cause: "not_found" });
  }

  if (data.attachmentIds?.length) {
    const files = await prisma.file.findMany({
      where: { id: { in: data.attachmentIds } },
      select: { id: true },
    });
    if (files.length !== data.attachmentIds.length) {
      throw new Error("Один или несколько файлов не найдены", {
        cause: "invalid",
      });
    }
  }

  const message = await prisma.message.create({
    data: {
      senderId,
      receiverId: data.receiverId,
      content: data.content,
      ...(data.attachmentIds?.length
        ? {
            attachments: {
              create: data.attachmentIds.map((fileId) => ({ fileId })),
            },
          }
        : {}),
    },
    include: messageInclude,
  });

  return serializeMessage(message, senderId);
}

export async function findMessageForActor(messageId: number, actorId: number) {
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      OR: [{ senderId: actorId }, { receiverId: actorId }],
    },
    include: messageInclude,
  });
  if (!message) {
    throw new Error("Сообщение не найдено", { cause: "not_found" });
  }
  return message;
}

/**
 * Обновление: только soft-delete для текущего участника или read для получателя.
 * Содержимое менять нельзя.
 */
export async function updateMessage(
  messageId: number,
  actorId: number,
  data: MessageUpdateData,
) {
  const message = await findMessageForActor(messageId, actorId);

  if (data.read) {
    if (message.receiverId !== actorId) {
      throw new Error("Прочитанным может отметить только получатель", {
        cause: "no_access",
      });
    }
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { read: true },
      include: messageInclude,
    });
    return serializeMessage(updated, actorId);
  }

  if (data.deleted) {
    const patch =
      message.senderId === actorId
        ? { deletedBySenderAt: new Date() }
        : { deletedByReceiverAt: new Date() };

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: patch,
      include: messageInclude,
    });
    return serializeMessage(updated, actorId);
  }

  throw new Error("Нет полей для обновления", { cause: "invalid" });
}

/** Мягкое удаление (то же, что PATCH { deleted: true }). */
export async function deleteMessage(messageId: number, actorId: number) {
  return updateMessage(messageId, actorId, { deleted: true });
}

export async function markThreadRead(viewerId: number, peerId: number) {
  await prisma.message.updateMany({
    where: {
      senderId: peerId,
      receiverId: viewerId,
      read: false,
      deletedByReceiverAt: null,
    },
    data: { read: true },
  });
}

/** Мягкое удаление всего диалога для текущего пользователя. */
export async function deleteThreadWithPeer(viewerId: number, peerId: number) {
  if (viewerId === peerId) {
    throw new Error("Нельзя удалить диалог с самим собой", { cause: "invalid" });
  }

  const peer = await prisma.user.findFirst({
    where: { id: peerId, deletedAt: null },
    select: { id: true },
  });
  if (!peer) {
    throw new Error("Собеседник не найден", { cause: "not_found" });
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.message.updateMany({
      where: {
        senderId: viewerId,
        receiverId: peerId,
        deletedBySenderAt: null,
      },
      data: { deletedBySenderAt: now },
    }),
    prisma.message.updateMany({
      where: {
        senderId: peerId,
        receiverId: viewerId,
        deletedByReceiverAt: null,
      },
      data: { deletedByReceiverAt: now },
    }),
  ]);

  return { ok: true as const };
}

export function parseOptionalPeerId(value: string | null): number | null {
  if (value == null || value === "") return null;
  if (!/^\d+$/.test(value)) {
    throw new Error("Некорректный receiverId", { cause: "invalid" });
  }
  return Number(value);
}
