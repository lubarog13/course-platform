import { NotificationType, NotificationEntityType, Notification } from "@prisma/client";
import { prisma } from "./prisma";

export type NotificationFull = Notification & {
  url: string;
};

export async function getNotificationCount(userId: number, notRead: boolean): Promise<number> {
  const filter = { userId } as { userId: number; readAt?: { equals: null } };
  if (notRead) {
    filter.readAt = { equals: null };
  }
  return await prisma.notification.count({ where: filter });
}

export async function getNotifications(
  userId: number,
  limit: number,
  offset: number,
): Promise<{ notifications: NotificationFull[]; total: number }> {
  console.log("getNotifications", userId, limit, offset);
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });
  return {
    notifications: await withUrls(userId, notifications),
    total: await getNotificationCount(userId, false),
  };
}

/** Собеседник в чате: тот участник сообщения, который не владелец уведомления. */
function chatPeerId(
  userId: number,
  message: { senderId: number; receiverId: number },
): number {
  return message.senderId === userId ? message.receiverId : message.senderId;
}

async function withUrls(
  userId: number,
  notifications: Notification[],
): Promise<NotificationFull[]> {
  const courseIds = new Set<number>();
  const lessonIds = new Set<number>();
  const attemptIds = new Set<number>();
  const messageIds = new Set<number>();

  for (const notification of notifications) {
    if (notification.entityId == null || notification.entityType == null) {
      continue;
    }
    if (notification.entityType === NotificationEntityType.course) {
      courseIds.add(notification.entityId);
    } else if (notification.entityType === NotificationEntityType.lesson) {
      lessonIds.add(notification.entityId);
    } else if (notification.entityType === NotificationEntityType.attempt) {
      attemptIds.add(notification.entityId);
    } else if (notification.entityType === NotificationEntityType.message) {
      messageIds.add(notification.entityId);
    }
  }

  const [courses, lessons, attempts, messages] = await Promise.all([
    courseIds.size > 0
      ? prisma.course.findMany({
          where: { id: { in: [...courseIds] } },
          select: { id: true, slug: true },
        })
      : [],
    lessonIds.size > 0
      ? prisma.lesson.findMany({
          where: { id: { in: [...lessonIds] } },
          select: {
            id: true,
            coursePart: { select: { course: { select: { slug: true } } } },
          },
        })
      : [],
    attemptIds.size > 0
      ? prisma.testAttempt.findMany({
          where: { id: { in: [...attemptIds] } },
          select: {
            id: true,
            lessonId: true,
            lesson: {
              select: {
                coursePart: { select: { course: { select: { slug: true } } } },
              },
            },
          },
        })
      : [],
    messageIds.size > 0
      ? prisma.message.findMany({
          where: { id: { in: [...messageIds] } },
          select: { id: true, senderId: true, receiverId: true },
        })
      : [],
  ]);

  const courseUrlById = new Map(
    courses.map((course) => [course.id, `/course/${course.slug}`]),
  );
  const lessonUrlById = new Map(
    lessons.map((lesson) => [
      lesson.id,
      `/course/${lesson.coursePart.course.slug}/learn?lessonId=${lesson.id}`,
    ]),
  );
  const attemptUrlById = new Map(
    attempts.map((attempt) => [
      attempt.id,
      `/course/${attempt.lesson.coursePart.course.slug}/learn?lessonId=${attempt.lessonId}`,
    ]),
  );
  const messageUrlById = new Map(
    messages.map((message) => [
      message.id,
      `/user/messages?receiverId=${chatPeerId(userId, message)}`,
    ]),
  );

  return notifications.map((notification) => {
    const entityId = notification.entityId;
    let url = "";
    if (entityId != null && notification.entityType != null) {
      if (notification.entityType === NotificationEntityType.course) {
        url = courseUrlById.get(entityId) ?? "";
      } else if (notification.entityType === NotificationEntityType.lesson) {
        url = lessonUrlById.get(entityId) ?? "";
      } else if (notification.entityType === NotificationEntityType.attempt) {
        url = attemptUrlById.get(entityId) ?? "";
      } else if (notification.entityType === NotificationEntityType.message) {
        url = messageUrlById.get(entityId) ?? "";
      }
    }
    return { ...notification, url };
  });
}

export async function createNotification(
  userId: number,
  type: NotificationType,
  title: string,
  body: string,
  entityType: NotificationEntityType,
  entityId: number,
): Promise<Notification | null> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        entityType,
        entityId,
      },
    });
    return notification;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function markNotificationAsRead(notificationId: number): Promise<Notification | null> {
  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
  return notification;
}

export async function deleteNotification(notificationId: number): Promise<Notification | null> {
  const notification = await prisma.notification.delete({
    where: { id: notificationId },
  });
  return notification;
}
