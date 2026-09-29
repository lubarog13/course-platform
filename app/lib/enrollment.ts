import type { EnrollmentStatus, Prisma, Role } from "@prisma/client";

import {
  asBoolean,
  asOptionalInt,
  asRequiredString,
  requireObject,
} from "@/app/lib/api";
import { USER_COURSE_STATUS_VALUES } from "@/app/lib/models";
import { prisma } from "@/app/lib/prisma";

const STUDENT_ALLOWED_STATUSES = ["dropped"] as const;
const STAFF_ALLOWED_STATUSES = USER_COURSE_STATUS_VALUES;

export type EnrollmentUpdateData = {
  status?: EnrollmentStatus;
  progress?: number;
  deadline?: Date | null;
  endDate?: Date | null;
  lastAccessedAt?: Date | null;
};

export type UserCoursePartUpdateData = {
  completed?: boolean;
  progress?: number;
  deadline?: Date | null;
  endDate?: Date | null;
  lastAccessedAt?: Date | null;
};

export type UserLessonUpdateData = {
  completed?: boolean;
  completedAt?: Date | null;
  points?: number;
  timeSpentSeconds?: number;
  videoProgressSeconds?: number;
  lastAccessedAt?: Date | null;
};

function asOptionalDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`Поле ${field} должно быть датой`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Поле ${field} должно быть корректной датой`);
  }
  return date;
}

function asEnrollmentStatus(value: unknown, field: string): EnrollmentStatus {
  const status = asRequiredString(value, field);
  if (!USER_COURSE_STATUS_VALUES.includes(status as (typeof USER_COURSE_STATUS_VALUES)[number])
    && status !== "pending") {
    throw new Error(
      `Поле ${field} должно быть одним из: pending, ${USER_COURSE_STATUS_VALUES.join(", ")}`,
    );
  }
  return status as EnrollmentStatus;
}

export function parseEnrollmentUpdateBody(body: unknown): EnrollmentUpdateData {
  const raw = requireObject(body);
  const data: EnrollmentUpdateData = {};

  if (raw.status !== undefined) {
    data.status = asEnrollmentStatus(raw.status, "status");
  }
  if (raw.progress !== undefined) {
    const progress = asOptionalInt(raw.progress, "progress", 0);
    if (progress != null && progress > 100) {
      throw new Error("Поле progress должно быть от 0 до 100");
    }
    data.progress = progress ?? undefined;
  }
  if (raw.deadline !== undefined) {
    data.deadline = asOptionalDate(raw.deadline, "deadline");
  }
  if (raw.endDate !== undefined) {
    data.endDate = asOptionalDate(raw.endDate, "endDate");
  }
  if (raw.lastAccessedAt !== undefined) {
    data.lastAccessedAt = asOptionalDate(raw.lastAccessedAt, "lastAccessedAt");
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Нет полей для обновления");
  }
  return data;
}

export function parseUserCoursePartUpdateBody(body: unknown): UserCoursePartUpdateData {
  const raw = requireObject(body);
  const data: UserCoursePartUpdateData = {};

  if (raw.completed !== undefined) {
    data.completed = asBoolean(raw.completed, "completed");
  }
  if (raw.progress !== undefined) {
    const progress = asOptionalInt(raw.progress, "progress", 0);
    if (progress != null && progress > 100) {
      throw new Error("Поле progress должно быть от 0 до 100");
    }
    data.progress = progress ?? undefined;
  }
  if (raw.deadline !== undefined) {
    data.deadline = asOptionalDate(raw.deadline, "deadline");
  }
  if (raw.endDate !== undefined) {
    data.endDate = asOptionalDate(raw.endDate, "endDate");
  }
  if (raw.lastAccessedAt !== undefined) {
    data.lastAccessedAt = asOptionalDate(raw.lastAccessedAt, "lastAccessedAt");
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Нет полей для обновления");
  }
  return data;
}

export function parseUserLessonUpdateBody(body: unknown): UserLessonUpdateData {
  const raw = requireObject(body);
  const data: UserLessonUpdateData = {};

  if (raw.completed !== undefined) {
    data.completed = asBoolean(raw.completed, "completed");
  }
  if (raw.completedAt !== undefined) {
    data.completedAt = asOptionalDate(raw.completedAt, "completedAt");
  }
  if (raw.points !== undefined) {
    data.points = asOptionalInt(raw.points, "points", 0) ?? undefined;
  }
  if (raw.timeSpentSeconds !== undefined) {
    data.timeSpentSeconds =
      asOptionalInt(raw.timeSpentSeconds, "timeSpentSeconds", 0) ?? undefined;
  }
  if (raw.videoProgressSeconds !== undefined) {
    data.videoProgressSeconds =
      asOptionalInt(raw.videoProgressSeconds, "videoProgressSeconds", 0) ??
      undefined;
  }
  if (raw.lastAccessedAt !== undefined) {
    data.lastAccessedAt = asOptionalDate(raw.lastAccessedAt, "lastAccessedAt");
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Нет полей для обновления");
  }
  return data;
}

export async function findEnrollment(id: number) {
  return prisma.userCourse.findUnique({
    where: { id },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          needEnrollment: true,
          deadlineDays: true,
          instructors: { select: { userId: true } },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          surname: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

async function isCourseStaff(courseId: number, userId: number, role: Role) {
  if (role === "admin") return true;
  if (role !== "teacher") return false;
  const instructor = await prisma.courseInstructor.findFirst({
    where: { courseId, userId },
    select: { id: true },
  });
  return instructor != null;
}

/** Создаёт UserCoursePart / UserLesson, если их ещё нет (при approve → enrolled). */
export async function ensureEnrollmentProgress(userId: number, courseId: number) {
  const courseParts = await prisma.coursePart.findMany({
    where: { courseId, deletedAt: null },
    include: {
      lessons: {
        where: { deletedAt: null },
        select: { id: true },
      },
    },
  });

  for (const coursePart of courseParts) {
    const deadlinePart = coursePart.deadlineDays
      ? new Date(Date.now() + coursePart.deadlineDays * 24 * 60 * 60 * 1000)
      : null;

    await prisma.userCoursePart.upsert({
      where: {
        userId_coursePartId: { userId, coursePartId: coursePart.id },
      },
      create: {
        userId,
        coursePartId: coursePart.id,
        deadline: deadlinePart,
      },
      update: {},
    });

    for (const lesson of coursePart.lessons) {
      await prisma.userLesson.upsert({
        where: {
          userId_lessonId: { userId, lessonId: lesson.id },
        },
        create: {
          userId,
          lessonId: lesson.id,
        },
        update: {},
      });
    }
  }
}

export async function updateEnrollment(
  id: number,
  actor: { id: number; role: Role },
  data: EnrollmentUpdateData,
) {
  const enrollment = await findEnrollment(id);
  if (!enrollment) {
    throw new Error("Запись на курс не найдена");
  }

  const isOwner = enrollment.userId === actor.id;
  const isStaff = await isCourseStaff(enrollment.courseId, actor.id, actor.role);

  if (!isOwner && !isStaff) {
    throw new Error("Нет доступа к этой записи");
  }

  if (data.status !== undefined) {
    if (actor.role === "student" || (!isStaff && isOwner)) {
      if (!STUDENT_ALLOWED_STATUSES.includes(data.status as (typeof STUDENT_ALLOWED_STATUSES)[number])) {
        throw new Error("Студент может изменить статус только на dropped");
      }
      if (!isOwner) {
        throw new Error("Нет доступа к этой записи");
      }
    } else if (isStaff) {
      const allowed = ["pending", ...STAFF_ALLOWED_STATUSES] as string[];
      if (!allowed.includes(data.status)) {
        throw new Error(`Недопустимый статус: ${data.status}`);
      }
    } else {
      throw new Error("Нет доступа к изменению статуса");
    }
  }

  // Студент не может менять progress/deadline/endDate чужими руками staff-полей
  if (!isStaff && isOwner) {
    if (
      data.progress !== undefined ||
      data.deadline !== undefined ||
      data.endDate !== undefined
    ) {
      throw new Error("Студент может обновить только статус (dropped) или lastAccessedAt");
    }
  }

  const updatePayload: Prisma.UserCourseUpdateInput = {};
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.progress !== undefined) updatePayload.progress = data.progress;
  if (data.deadline !== undefined) updatePayload.deadline = data.deadline;
  if (data.lastAccessedAt !== undefined) {
    updatePayload.lastAccessedAt = data.lastAccessedAt;
  }

  if (data.endDate !== undefined) {
    updatePayload.endDate = data.endDate;
  } else if (data.status === "completed" || data.status === "dropped") {
    updatePayload.endDate = new Date();
  } else if (data.status === "enrolled" || data.status === "in_progress" || data.status === "pending") {
    updatePayload.endDate = null;
  }

  const updated = await prisma.userCourse.update({
    where: { id },
    data: updatePayload,
  });

  if (
    data.status === "enrolled" &&
    enrollment.status === "pending"
  ) {
    await ensureEnrollmentProgress(enrollment.userId, enrollment.courseId);
  }

  return findEnrollment(updated.id);
}

export async function findUserCoursePart(id: number) {
  return prisma.userCoursePart.findUnique({
    where: { id },
    include: {
      coursePart: {
        select: {
          id: true,
          courseId: true,
          name: true,
          course: {
            select: {
              instructors: { select: { userId: true } },
            },
          },
        },
      },
    },
  });
}

export async function updateUserCoursePart(
  id: number,
  actor: { id: number; role: Role },
  data: UserCoursePartUpdateData,
) {
  const record = await findUserCoursePart(id);
  if (!record) {
    throw new Error("Прогресс раздела не найден");
  }

  const isOwner = record.userId === actor.id;
  const isStaff = await isCourseStaff(
    record.coursePart.courseId,
    actor.id,
    actor.role,
  );

  if (!isOwner && !isStaff) {
    throw new Error("Нет доступа к этой записи");
  }

  if (!isStaff && isOwner && data.deadline !== undefined) {
    throw new Error("Студент не может менять дедлайн раздела");
  }

  const updatePayload: Prisma.UserCoursePartUpdateInput = {};
  if (data.completed !== undefined) {
    updatePayload.completed = data.completed;
    if (data.completed && data.endDate === undefined) {
      updatePayload.endDate = new Date();
      updatePayload.progress = 100;
    }
    if (!data.completed && data.endDate === undefined) {
      updatePayload.endDate = null;
    }
  }
  if (data.progress !== undefined) updatePayload.progress = data.progress;
  if (data.deadline !== undefined) updatePayload.deadline = data.deadline;
  if (data.endDate !== undefined) updatePayload.endDate = data.endDate;
  if (data.lastAccessedAt !== undefined) {
    updatePayload.lastAccessedAt = data.lastAccessedAt;
  } else if (isOwner) {
    updatePayload.lastAccessedAt = new Date();
  }

  await prisma.userCoursePart.update({
    where: { id },
    data: updatePayload,
  });

  return findUserCoursePart(id);
}

export async function findUserLesson(id: number) {
  return prisma.userLesson.findUnique({
    where: { id },
    include: {
      lesson: {
        select: {
          id: true,
          name: true,
          coursePartId: true,
          coursePart: {
            select: {
              courseId: true,
              course: {
                select: {
                  instructors: { select: { userId: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function updateUserLesson(
  id: number,
  actor: { id: number; role: Role },
  data: UserLessonUpdateData,
) {
  const record = await findUserLesson(id);
  if (!record) {
    throw new Error("Прогресс урока не найден");
  }

  const isOwner = record.userId === actor.id;
  const isStaff = await isCourseStaff(
    record.lesson.coursePart.courseId,
    actor.id,
    actor.role,
  );

  if (!isOwner && !isStaff) {
    throw new Error("Нет доступа к этой записи");
  }

  if (!isStaff && isOwner && data.points !== undefined) {
    throw new Error("Студент не может менять баллы урока");
  }

  const updatePayload: Prisma.UserLessonUpdateInput = {};
  if (data.completed !== undefined) {
    updatePayload.completed = data.completed;
    if (data.completed && data.completedAt === undefined) {
      updatePayload.completedAt = new Date();
    }
    if (!data.completed && data.completedAt === undefined) {
      updatePayload.completedAt = null;
    }
  }
  if (data.completedAt !== undefined) updatePayload.completedAt = data.completedAt;
  if (data.points !== undefined) updatePayload.points = data.points;
  if (data.timeSpentSeconds !== undefined) {
    updatePayload.timeSpentSeconds = data.timeSpentSeconds;
  }
  if (data.videoProgressSeconds !== undefined) {
    updatePayload.videoProgressSeconds = data.videoProgressSeconds;
  }
  if (data.lastAccessedAt !== undefined) {
    updatePayload.lastAccessedAt = data.lastAccessedAt;
  } else if (isOwner) {
    updatePayload.lastAccessedAt = new Date();
  }

  await prisma.userLesson.update({
    where: { id },
    data: updatePayload,
  });

  return findUserLesson(id);
}
