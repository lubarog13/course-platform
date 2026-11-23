import { NotificationType, NotificationEntityType, Notification } from "@prisma/client";
import { prisma } from "./prisma";
import { Resend } from "resend";
import {
  NotificationEmail,
  type NotificationEmailProps,
} from "@/emails/notification";
import { render, pretty } from "react-email";
import DeadlineEmail, { type DeadlineEmailProps } from "@/emails/deadline";
import { declOfNum } from "@/lib/utils";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}
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
      if (
        notification.type === NotificationType.course_enrollment_request ||
        notification.type === NotificationType.deadline_extension_request
      ) {
        url = `/user/enrollments?tab=${notification.type === NotificationType.course_enrollment_request ? "enrollments" : "extensions"}`;
      }
      else if (notification.entityType === NotificationEntityType.course) {
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

type EmailNotificationPayload = {
  title: string;
  body: string;
  url?: string;
  label?: string;
  variables?: Record<string, string>;
};

type DeadlineEmailPayload = {
  courseName: string;
  coursePartName: string;
  coursePartId: number;
  deadlineDate: Date;
  courseSlug: string;
};

export type DeadlineReminder = {
  userId: number;
  courseId: number;
  coursePartId: number;
  courseName: string;
  coursePartName: string;
  courseSlug: string;
  deadlineDate: Date;
  daysBeforeDeadline: number;
};

export type DeadlineNotifyResult = {
  days: number[];
  candidates: number;
  notificationsCreated: number;
  emailsAttempted: number;
  skippedDuplicate: number;
  errors: number;
};

const DEFAULT_DEADLINE_REMINDER_DAYS = [0, 1, 3] as const;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function calendarDaysUntil(deadline: Date, from = new Date()): number {
  const start = startOfDay(from).getTime();
  const end = startOfDay(deadline).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

/** Незавершённые части курса с дедлайном в указанные дни (0 = сегодня). */
export async function findDeadlineReminders(
  daysAhead: number[] = [...DEFAULT_DEADLINE_REMINDER_DAYS],
): Promise<DeadlineReminder[]> {
  const uniqueDays = [...new Set(daysAhead)].sort((a, b) => a - b);
  if (uniqueDays.length === 0) return [];

  const now = new Date();
  const windows = uniqueDays.map((days) => {
    const target = new Date(now);
    target.setDate(target.getDate() + days);
    return {
      days,
      from: startOfDay(target),
      to: endOfDay(target),
    };
  });

  const minDate = windows.reduce(
    (min, window) => (window.from < min ? window.from : min),
    windows[0].from,
  );
  const maxDate = windows.reduce(
    (max, window) => (window.to > max ? window.to : max),
    windows[0].to,
  );

  const rows = await prisma.userCoursePart.findMany({
    where: {
      completed: false,
      deadline: {
        not: null,
        gte: minDate,
        lte: maxDate,
      },
      user: { deletedAt: null },
      coursePart: {
        deletedAt: null,
        course: {
          deletedAt: null,
          publishedAt: { not: null },
        },
      },
    },
    select: {
      userId: true,
      deadline: true,
      coursePart: {
        select: {
          id: true,
          name: true,
          course: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (rows.length === 0) return [];

  const courseIds = [...new Set(rows.map((row) => row.coursePart.course.id))];
  const userIds = [...new Set(rows.map((row) => row.userId))];

  const activeEnrollments = await prisma.userCourse.findMany({
    where: {
      userId: { in: userIds },
      courseId: { in: courseIds },
      status: { in: ["enrolled", "in_progress"] },
    },
    select: { userId: true, courseId: true },
  });

  const activeKeys = new Set(
    activeEnrollments.map((row) => `${row.userId}:${row.courseId}`),
  );

  const daySet = new Set(uniqueDays);
  const reminders: DeadlineReminder[] = [];

  for (const row of rows) {
    if (!row.deadline) continue;
    const course = row.coursePart.course;
    if (!activeKeys.has(`${row.userId}:${course.id}`)) continue;

    const daysBeforeDeadline = calendarDaysUntil(row.deadline, now);
    if (!daySet.has(daysBeforeDeadline)) continue;

    reminders.push({
      userId: row.userId,
      courseId: course.id,
      coursePartId: row.coursePart.id,
      courseName: course.name,
      coursePartName: row.coursePart.name,
      courseSlug: course.slug,
      deadlineDate: row.deadline,
      daysBeforeDeadline,
    });
  }

  return reminders;
}

function deadlineNotificationCopy(reminder: DeadlineReminder): {
  title: string;
  body: string;
} {
  const { coursePartName, courseName, daysBeforeDeadline } = reminder;
  if (daysBeforeDeadline > 0) {
    return {
      title: `Срок сдачи через ${daysBeforeDeadline} ${declOfNum(daysBeforeDeadline, ["день", "дня", "дней"])}`,
      body: `До сдачи части «${coursePartName}» курса «${courseName}» осталось ${daysBeforeDeadline} ${declOfNum(daysBeforeDeadline, ["день", "дня", "дней"])}.`,
    };
  }
  if (daysBeforeDeadline === 0) {
    return {
      title: `Сегодня срок сдачи: ${coursePartName}`,
      body: `Сегодня крайний срок сдачи части «${coursePartName}» курса «${courseName}».`,
    };
  }
  const overdue = Math.abs(daysBeforeDeadline);
  return {
    title: `Пропущен срок сдачи: ${coursePartName}`,
    body: `Срок сдачи части «${coursePartName}» курса «${courseName}» истёк ${overdue} ${declOfNum(overdue, ["день", "дня", "дней"])} назад.`,
  };
}

async function wasDeadlineNotifiedToday(
  reminder: DeadlineReminder,
): Promise<boolean> {
  const todayStart = startOfDay(new Date());
  const existing = await prisma.notification.findFirst({
    where: {
      userId: reminder.userId,
      type: NotificationType.deadline,
      entityType: NotificationEntityType.course,
      entityId: reminder.courseId,
      createdAt: { gte: todayStart },
      title: { contains: reminder.coursePartName },
    },
    select: { id: true },
  });
  return existing != null;
}

/** Создаёт in-app уведомления и шлёт email по подходящим дедлайнам (для cron). */
export async function notifyDeadlineReminders(
  daysAhead: number[] = [...DEFAULT_DEADLINE_REMINDER_DAYS],
  options: { dryRun?: boolean } = {},
): Promise<DeadlineNotifyResult> {
  const reminders = await findDeadlineReminders(daysAhead);
  const result: DeadlineNotifyResult = {
    days: [...new Set(daysAhead)].sort((a, b) => a - b),
    candidates: reminders.length,
    notificationsCreated: 0,
    emailsAttempted: 0,
    skippedDuplicate: 0,
    errors: 0,
  };

  if (options.dryRun) {
    return result;
  }

  for (const reminder of reminders) {
    try {
      if (await wasDeadlineNotifiedToday(reminder)) {
        result.skippedDuplicate += 1;
        continue;
      }

      const { title, body } = deadlineNotificationCopy(reminder);
      const notification = await createNotification(
        reminder.userId,
        NotificationType.deadline,
        title,
        body,
        NotificationEntityType.course,
        reminder.courseId,
      );
      if (notification) {
        result.notificationsCreated += 1;
      }

      await sendDeadlineEmailNotification(reminder.userId, {
        courseName: reminder.courseName,
        coursePartName: reminder.coursePartName,
        deadlineDate: reminder.deadlineDate,
        courseSlug: reminder.courseSlug,
        coursePartId: reminder.coursePartId,
      });
      result.emailsAttempted += 1;
    } catch (error) {
      result.errors += 1;
      console.error("notifyDeadlineReminders:", error);
    }
  }

  return result;
}

export async function sendEmailNotification(userId: number, payload: EmailNotificationPayload): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      agreement: true,
    },
  });
  if (!user) {
    throw new Error("Пользователь не найден", { cause: "user_not_found" });
  }
  if (!user.agreement?.accept_email_notifications) {
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    console.warn(
      "sendEmailNotification: пропуск — не задан RESEND_API_KEY или EMAIL_FROM",
    );
    return;
  }

  const resend = getResendClient();
  if (!resend) return;

  const variables: NotificationEmailProps = {
    title: payload.title,
    recipientName: user.name,
    body: payload.body,
    actionUrl: (payload.url ? process.env.NEXT_PUBLIC_APP_URL + payload.url : undefined),
    actionLabel: payload.label,
  };
  const html = await pretty(await render(<NotificationEmail {...variables} />));
  const { error } = await resend.emails.send({
    from,
    to: user.email,
    subject: variables.title,
    html,
  });
  if (error) {
    console.error("Resend error:", error);
  }
}

export async function sendDeadlineEmailNotification(userId: number, payload: DeadlineEmailPayload): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      agreement: true,
    },
  });
  if (!user) {
    throw new Error("Пользователь не найден", { cause: "user_not_found" });
  }
  if (!user.agreement?.accept_email_notifications) {
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    console.warn(
      "sendEmailNotification: пропуск — не задан RESEND_API_KEY или EMAIL_FROM",
    );
    return;
  }

  const resend = getResendClient();
  if (!resend) return;

  const variables: DeadlineEmailProps = {
    courseName: payload.courseName,
    lessonName: payload.coursePartName,
    deadlineDate: payload.deadlineDate,
    actionUrl:
      (process.env.NEXT_PUBLIC_APP_URL ?? "") +
      `/course/${payload.courseSlug}/learn?partId=${payload.coursePartId}`,
    recipientName: user.name,
  };
  const html = await pretty(await render(<DeadlineEmail {...variables} />));
  const { error } = await resend.emails.send({
    from,
    to: user.email,
    subject: `Срок сдачи для ${payload.coursePartName} по курсу ${payload.courseName}`,
    html,
  });
  if (error) {
    console.error("Resend error:", error);
  }
}