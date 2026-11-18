import type {
  DeadlineExtensionRequest,
  EnrollmentStatus,
  Prisma,
  Role,
} from "@prisma/client";
import {
  NotificationEntityType,
  NotificationType,
} from "@prisma/client";

import {
  asRequiredId,
  asRequiredInt,
  asRequiredString,
  requireObject,
} from "@/app/lib/api";
import { createNotification, sendEmailNotification } from "@/app/lib/notifications";
import { prisma } from "@/app/lib/prisma";

export type DeadlineExtensionCreateData = {
  courseId?: number;
  coursePartId?: number;
  reason: string;
  requestedDays: number;
};

export type DeadlineExtensionStatusUpdateData = {
  status: EnrollmentStatus;
};

const REVIEWABLE_STATUSES = new Set<EnrollmentStatus>([
  "pending",
  "in_progress",
]);

const STAFF_STATUS_TARGETS = new Set<EnrollmentStatus>([
  "pending",
  "in_progress",
  "completed",
  "dropped",
]);

export type DeadlineExtensionListData = DeadlineExtensionRequest & {
  course: {
    id: number;
    name: string;
    slug: string;
  };
  coursePart: {
    name: string;
  } | null;
  user: {
    id: number;
    name: string;
    surname: string;
    patronymic: string | null;
  };
};

export type DeadlineExtensionListQuery = {
  page?: string | number | null;
  limit?: string | number | null;
  order?: string | null;
  sort?: string | null;
};

export type DeadlineExtensionListResponse = {
  items: DeadlineExtensionListData[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

export type DeadlineExtensionDto = DeadlineExtensionRequest;

function fail(message: string, cause: string): never {
  throw new Error(message, { cause });
}

function parseIntParam(
  value: string | number | null | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function extensionExpiresAt(createdAt: Date, requestedDays: number | null) {
  if (requestedDays == null || requestedDays < 1) return null;
  return new Date(createdAt.getTime() + requestedDays * 24 * 60 * 60 * 1000);
}

export function isDeadlineExtensionExpired(
  extension: Pick<DeadlineExtensionRequest, "createdAt" | "requestedDays" | "status">,
) {
  if (extension.status === "expired") return true;
  if (extension.status === "completed" || extension.status === "dropped") {
    return false;
  }
  const expiresAt = extensionExpiresAt(
    new Date(extension.createdAt),
    extension.requestedDays,
  );
  return expiresAt != null && expiresAt.getTime() < Date.now();
}

export function parseDeadlineExtensionStatusBody(
  body: unknown,
): DeadlineExtensionStatusUpdateData {
  const raw = requireObject(body);
  const status = raw.status;
  if (typeof status !== "string" || !STAFF_STATUS_TARGETS.has(status as EnrollmentStatus)) {
    fail(
      "Статус должен быть pending, in_progress, completed или dropped",
      "invalid",
    );
  }
  return { status: status as EnrollmentStatus };
}

export function parseDeadlineExtensionBody(
  body: unknown,
): DeadlineExtensionCreateData {
  const raw = requireObject(body);
  const courseId =
    raw.courseId === undefined || raw.courseId === null
      ? undefined
      : asRequiredId(Number(raw.courseId), "courseId");
  const coursePartId =
    raw.coursePartId === undefined || raw.coursePartId === null
      ? undefined
      : asRequiredId(Number(raw.coursePartId), "coursePartId");

  if ((courseId != null) === (coursePartId != null)) {
    fail("Укажите ровно одно из полей: courseId или coursePartId", "invalid");
  }

  const reason = asRequiredString(raw.reason, "reason");
  if (reason.length < 10) {
    fail("Причина продления должна быть не менее 10 символов", "invalid");
  }
  if (reason.length > 500) {
    fail("Причина продления должна быть не более 500 символов", "invalid");
  }

  const requestedDays = asRequiredInt(Number(raw.requestedDays), "requestedDays", 1);

  return {
    ...(courseId != null ? { courseId } : {}),
    ...(coursePartId != null ? { coursePartId } : {}),
    reason,
    requestedDays,
  };
}

async function notifyCourseStaff(
  courseId: number,
  courseSlug: string,
  title: string,
  body: string,
) {
  const [instructors, admins] = await Promise.all([
    prisma.courseInstructor.findMany({
      where: { courseId },
      select: { userId: true },
    }),
    prisma.user.findMany({
      where: { role: "admin", deletedAt: null },
      select: { id: true },
    }),
  ]);

  const recipientIds = new Set<number>([
    ...instructors.map((item) => item.userId),
    ...admins.map((item) => item.id),
  ]);
  const courseUrl = `/course/${courseSlug}`;

  for (const userId of recipientIds) {
    await createNotification(
      userId,
      NotificationType.deadline_extension_request,
      title,
      body,
      NotificationEntityType.course,
      courseId,
    );
    try {
      await sendEmailNotification(userId, {
        title,
        body,
        url: courseUrl,
        label: "Открыть курс",
      });
    } catch (error) {
      console.error("Error sending deadline extension email:", error);
    }
  }
}

/** Актуальная заявка текущего пользователя по courseId или coursePartId. */
export async function findCurrentDeadlineExtensionRequest(
  userId: number,
  query: { courseId?: number; coursePartId?: number },
): Promise<DeadlineExtensionDto | null> {
  const courseId = query.courseId;
  const coursePartId = query.coursePartId;

  if ((courseId != null) === (coursePartId != null)) {
    fail("Укажите ровно одно из полей: courseId или coursePartId", "invalid");
  }

  if (courseId != null) {
    const userCourse = await prisma.userCourse.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    });
    if (!userCourse) return null;

    return prisma.deadlineExtensionRequest.findFirst({
      where: { userId, userCourseId: userCourse.id },
      orderBy: { createdAt: "desc" },
    });
  }

  const userCoursePart = await prisma.userCoursePart.findUnique({
    where: {
      userId_coursePartId: { userId, coursePartId: coursePartId! },
    },
    select: { id: true },
  });
  if (!userCoursePart) return null;

  return prisma.deadlineExtensionRequest.findFirst({
    where: { userId, userCoursePartId: userCoursePart.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDeadlineExtensionRequest(
  userId: number,
  data: DeadlineExtensionCreateData,
): Promise<DeadlineExtensionDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, surname: true, patronymic: true },
  });
  if (!user) fail("Пользователь не найден", "not_found");

  let userCourseId: number | null = null;
  let userCoursePartId: number | null = null;
  let courseId: number;
  let courseSlug: string;
  let maxDays: number | null;
  let targetLabel: string;

  if (data.courseId != null) {
    const userCourse = await prisma.userCourse.findUnique({
      where: { userId_courseId: { userId, courseId: data.courseId } },
      include: {
        course: {
          select: { id: true, name: true, slug: true, deadlineDays: true },
        },
      },
    });
    if (!userCourse) fail("Вы не записаны на этот курс", "no_access");
    if (!userCourse.deadline) {
      fail("У курса нет срока сдачи", "invalid");
    }

    userCourseId = userCourse.id;
    courseId = userCourse.courseId;
    courseSlug = userCourse.course.slug;
    maxDays = userCourse.course.deadlineDays;
    targetLabel = `курса «${userCourse.course.name}»`;
  } else {
    const userCoursePart = await prisma.userCoursePart.findUnique({
      where: {
        userId_coursePartId: {
          userId,
          coursePartId: data.coursePartId!,
        },
      },
      include: {
        coursePart: {
          select: {
            id: true,
            name: true,
            deadlineDays: true,
            courseId: true,
            course: { select: { name: true, slug: true } },
          },
        },
      },
    });
    if (!userCoursePart) fail("Нет прогресса по этой части курса", "no_access");
    if (!userCoursePart.deadline) {
      fail("У части курса нет срока сдачи", "invalid");
    }

    userCoursePartId = userCoursePart.id;
    courseId = userCoursePart.coursePart.courseId;
    courseSlug = userCoursePart.coursePart.course.slug;
    maxDays = userCoursePart.coursePart.deadlineDays;
    targetLabel = `части «${userCoursePart.coursePart.name}» курса «${userCoursePart.coursePart.course.name}»`;
  }

  if (maxDays == null || maxDays < 1) {
    fail("Продление срока для этого объекта недоступно", "invalid");
  }
  if (data.requestedDays > maxDays) {
    fail(
      `Количество дней продления должно быть не более ${maxDays}`,
      "invalid",
    );
  }

  const existing = await findCurrentDeadlineExtensionRequest(userId, {
    ...(data.courseId != null ? { courseId: data.courseId } : {}),
    ...(data.coursePartId != null ? { coursePartId: data.coursePartId } : {}),
  });
  if (existing?.status === "pending") {
    fail("Заявка на продление уже ожидает рассмотрения", "conflict");
  }

  const request = await prisma.deadlineExtensionRequest.create({
    data: {
      userId,
      userCourseId,
      userCoursePartId,
      reason: data.reason,
      requestedDays: data.requestedDays,
      status: "pending" satisfies EnrollmentStatus,
    },
  });

  const fullName = [user.surname, user.name, user.patronymic]
    .filter(Boolean)
    .join(" ");
  const title = "Запрос на продление срока сдачи";
  const body = `${fullName} просит продлить срок сдачи ${targetLabel} на ${data.requestedDays} дн. Причина: ${data.reason}`;

  await notifyCourseStaff(courseId, courseSlug, title, body);

  return request;
}

/** Помечает просроченные заявки (createdAt + requestedDays) как expired. */
export async function expireOverdueDeadlineExtensions(scope?: {
  userCourseIds?: number[];
  userCoursePartIds?: number[];
}) {
  const where: Prisma.DeadlineExtensionRequestWhereInput = {
    status: { in: ["pending", "in_progress"] },
    requestedDays: { not: null },
  };

  if (scope) {
    const or: Prisma.DeadlineExtensionRequestWhereInput[] = [];
    if (scope.userCourseIds && scope.userCourseIds.length > 0) {
      or.push({ userCourseId: { in: scope.userCourseIds } });
    }
    if (scope.userCoursePartIds && scope.userCoursePartIds.length > 0) {
      or.push({ userCoursePartId: { in: scope.userCoursePartIds } });
    }
    if (or.length === 0) return 0;
    where.OR = or;
  }

  const candidates = await prisma.deadlineExtensionRequest.findMany({
    where,
    select: { id: true, createdAt: true, requestedDays: true, status: true },
  });

  const expiredIds = candidates
    .filter((item) => isDeadlineExtensionExpired(item))
    .map((item) => item.id);

  if (expiredIds.length === 0) return 0;

  const result = await prisma.deadlineExtensionRequest.updateMany({
    where: { id: { in: expiredIds } },
    data: { status: "expired" },
  });
  return result.count;
}

async function resolveTeacherScope(teacherId: number) {
  const instructed = await prisma.courseInstructor.findMany({
    where: { userId: teacherId },
    select: { courseId: true },
  });
  const courseIds = instructed.map((item) => item.courseId);
  if (courseIds.length === 0) {
    return { userCourseIds: [] as number[], userCoursePartIds: [] as number[] };
  }

  const [userCourses, courseParts] = await Promise.all([
    prisma.userCourse.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true },
    }),
    prisma.coursePart.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true },
    }),
  ]);

  const userCourseParts =
    courseParts.length === 0
      ? []
      : await prisma.userCoursePart.findMany({
          where: { coursePartId: { in: courseParts.map((part) => part.id) } },
          select: { id: true },
        });

  return {
    userCourseIds: userCourses.map((item) => item.id),
    userCoursePartIds: userCourseParts.map((item) => item.id),
  };
}

async function hydrateDeadlineExtensionList(
  rows: DeadlineExtensionRequest[],
): Promise<DeadlineExtensionListData[]> {
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((row) => row.userId))];
  const userCourseIds = [
    ...new Set(
      rows
        .map((row) => row.userCourseId)
        .filter((id): id is number => id != null),
    ),
  ];
  const userCoursePartIds = [
    ...new Set(
      rows
        .map((row) => row.userCoursePartId)
        .filter((id): id is number => id != null),
    ),
  ];

  const [users, userCourses, userCourseParts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        surname: true,
        patronymic: true,
      },
    }),
    userCourseIds.length === 0
      ? Promise.resolve([])
      : prisma.userCourse.findMany({
          where: { id: { in: userCourseIds } },
          select: {
            id: true,
            course: { select: { id: true, name: true, slug: true } },
          },
        }),
    userCoursePartIds.length === 0
      ? Promise.resolve([])
      : prisma.userCoursePart.findMany({
          where: { id: { in: userCoursePartIds } },
          select: {
            id: true,
            coursePart: {
              select: {
                name: true,
                course: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        }),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const userCoursesById = new Map(userCourses.map((item) => [item.id, item]));
  const userCoursePartsById = new Map(
    userCourseParts.map((item) => [item.id, item]),
  );

  return rows.map((row) => {
    const user = usersById.get(row.userId);
    if (!user) {
      fail("Пользователь заявки не найден", "not_found");
    }

    let course = { id: 0, name: "Курс удалён", slug: "" };
    let coursePart: { name: string } | null = null;

    if (row.userCourseId != null) {
      const linked = userCoursesById.get(row.userCourseId);
      if (linked) course = linked.course;
    } else if (row.userCoursePartId != null) {
      const linked = userCoursePartsById.get(row.userCoursePartId);
      if (linked) {
        course = linked.coursePart.course;
        coursePart = { name: linked.coursePart.name };
      }
    }

    return {
      ...row,
      course,
      coursePart,
      user,
    };
  });
}

export async function listDeadlineExtensionRequests(
  actor: { id: number; role: Role },
  query: DeadlineExtensionListQuery = {},
): Promise<DeadlineExtensionListResponse> {
  if (actor.role !== "admin" && actor.role !== "teacher") {
    fail("Нет доступа к списку заявок", "no_access");
  }

  const limit = parseIntParam(query.limit, 10, 1, 50);
  const page = parseIntParam(query.page, 1, 1, 10_000);
  const offset = (page - 1) * limit;
  const order = query.order === "asc" ? "asc" : "desc";
  const sort = query.sort === "updatedAt" ? "updatedAt" : "createdAt";

  let where: Prisma.DeadlineExtensionRequestWhereInput = {};
  let teacherScope:
    | { userCourseIds: number[]; userCoursePartIds: number[] }
    | undefined;

  if (actor.role === "teacher") {
    teacherScope = await resolveTeacherScope(actor.id);
    if (
      teacherScope.userCourseIds.length === 0 &&
      teacherScope.userCoursePartIds.length === 0
    ) {
      return { items: [], total: 0, page, limit, pageCount: 1 };
    }
    where = {
      OR: [
        { userCourseId: { in: teacherScope.userCourseIds } },
        { userCoursePartId: { in: teacherScope.userCoursePartIds } },
      ],
    };
  }

  await expireOverdueDeadlineExtensions(teacherScope);

  const [rows, total] = await prisma.$transaction([
    prisma.deadlineExtensionRequest.findMany({
      where,
      orderBy: { [sort]: order },
      skip: offset,
      take: limit,
    }),
    prisma.deadlineExtensionRequest.count({ where }),
  ]);

  return {
    items: await hydrateDeadlineExtensionList(rows),
    total,
    page,
    limit,
    pageCount: Math.max(1, Math.ceil(total / limit)),
  };
}

async function assertCanReviewExtension(
  actor: { id: number; role: Role },
  request: DeadlineExtensionRequest,
) {
  if (actor.role === "admin") return;

  if (actor.role !== "teacher") {
    fail("Нет прав на изменение заявки", "no_access");
  }

  let courseId: number | null = null;
  if (request.userCourseId != null) {
    const userCourse = await prisma.userCourse.findUnique({
      where: { id: request.userCourseId },
      select: { courseId: true },
    });
    courseId = userCourse?.courseId ?? null;
  } else if (request.userCoursePartId != null) {
    const userCoursePart = await prisma.userCoursePart.findUnique({
      where: { id: request.userCoursePartId },
      select: { coursePart: { select: { courseId: true } } },
    });
    courseId = userCoursePart?.coursePart.courseId ?? null;
  }

  if (courseId == null) fail("Курс заявки не найден", "not_found");

  const instructor = await prisma.courseInstructor.findFirst({
    where: { courseId, userId: actor.id },
    select: { id: true },
  });
  if (!instructor) fail("Нет прав на изменение заявки", "no_access");
}

async function applyDeadlineExtension(
  request: DeadlineExtensionRequest,
): Promise<Date | null> {
  const days = request.requestedDays;
  if (days == null || days < 1) {
    fail("В заявке не указано число дней продления", "invalid");
  }

  if (request.userCourseId != null) {
    const userCourse = await prisma.userCourse.findUnique({
      where: { id: request.userCourseId },
      select: { id: true, deadline: true },
    });
    if (!userCourse) fail("Запись на курс не найдена", "not_found");
    const base = new Date();
    const nextDeadline = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    await prisma.userCourse.update({
      where: { id: userCourse.id },
      data: { deadline: nextDeadline },
    });
    return nextDeadline;
  }

  if (request.userCoursePartId != null) {
    const userCoursePart = await prisma.userCoursePart.findUnique({
      where: { id: request.userCoursePartId },
      select: { id: true, deadline: true },
    });
    if (!userCoursePart) fail("Прогресс по части курса не найден", "not_found");
    const base = userCoursePart.deadline ?? new Date();
    const nextDeadline = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    await prisma.userCoursePart.update({
      where: { id: userCoursePart.id },
      data: { deadline: nextDeadline },
    });
    return nextDeadline;
  }

  fail("Заявка не привязана к курсу или части", "invalid");
}

async function notifyStudentAboutDecision(
  request: DeadlineExtensionRequest,
  status: EnrollmentStatus,
  course: { id: number; name: string; slug: string },
  nextDeadline: Date | null,
) {
  const accepted = status === "completed";
  const title = accepted
    ? "Запрос на продление срока одобрен"
    : status === "dropped"
      ? "Запрос на продление срока отклонён"
      : "Статус запроса на продление обновлён";
  const body = accepted
    ? `Ваш запрос по курсу «${course.name}» одобрен${
        nextDeadline
          ? `. Новый срок: ${nextDeadline.toLocaleDateString("ru-RU")}`
          : ""
      }.`
    : status === "dropped"
      ? `Ваш запрос по курсу «${course.name}» отклонён.`
      : `Статус вашего запроса по курсу «${course.name}» изменён.`;

  const type =
    status === "completed"
      ? NotificationType.deadline_extension_request_accepted
      : status === "dropped"
        ? NotificationType.deadline_extension_request_rejected
        : NotificationType.deadline_extension_request;

  await createNotification(
    request.userId,
    type,
    title,
    body,
    NotificationEntityType.course,
    course.id,
  );

  try {
    await sendEmailNotification(request.userId, {
      title,
      body,
      url: `/course/${course.slug}`,
      label: "Открыть курс",
    });
  } catch (error) {
    console.error("Error sending deadline decision email:", error);
  }
}

export async function updateDeadlineExtensionStatus(
  id: number,
  actor: { id: number; role: Role },
  data: DeadlineExtensionStatusUpdateData,
): Promise<DeadlineExtensionListData> {
  const request = await prisma.deadlineExtensionRequest.findUnique({
    where: { id },
  });
  if (!request) fail("Заявка не найдена", "not_found");

  await assertCanReviewExtension(actor, request);

  if (isDeadlineExtensionExpired(request) && request.status !== "expired") {
    await prisma.deadlineExtensionRequest.update({
      where: { id },
      data: { status: "expired" },
    });
    fail("Срок рассмотрения заявки истёк", "invalid");
  }

  if (request.status === "expired") {
    fail("Нельзя изменить просроченную заявку", "invalid");
  }

  if (
    (data.status === "completed" || data.status === "dropped") &&
    !REVIEWABLE_STATUSES.has(request.status)
  ) {
    fail("Заявку в этом статусе нельзя принять или отклонить", "invalid");
  }

  if (
    data.status === "in_progress" &&
    request.status !== "pending" &&
    request.status !== "in_progress"
  ) {
    fail("На рассмотрение можно поставить только ожидающую заявку", "invalid");
  }

  let nextDeadline: Date | null = null;
  if (data.status === "completed") {
    nextDeadline = await applyDeadlineExtension(request);
  }

  const updated = await prisma.deadlineExtensionRequest.update({
    where: { id },
    data: {
      status: data.status,
      ...(data.status === "completed" || data.status === "dropped"
        ? { reviewedById: actor.id, reviewedAt: new Date() }
        : {}),
    },
  });

  const [hydrated] = await hydrateDeadlineExtensionList([updated]);
  if (
    data.status === "completed" ||
    data.status === "dropped" ||
    data.status === "in_progress"
  ) {
    await notifyStudentAboutDecision(
      updated,
      data.status,
      hydrated.course,
      nextDeadline,
    );
  }

  return hydrated;
}
