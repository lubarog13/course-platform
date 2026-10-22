import { prisma } from "@/app/lib/prisma";
import type { UserDetails } from "@/app/lib/models";
import type { CourseLevel, Role } from "@prisma/client";

export async function getUser(id: string) {
  return prisma.user.findUnique({
    where: {
      id: Number(id),
    },
  });
}

export type PublicCourseSummary = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  level: CourseLevel | null;
  coverUrl: string | null;
  tags: string[];
};

export type PublicUserProfile = {
  id: number;
  name: string;
  surname: string;
  patronymic: string | null;
  role: Role;
  userDetails: UserDetails | null;
  taughtCourses: PublicCourseSummary[];
  completedCourses: PublicCourseSummary[];
  email: string | null;
  phone: string | null;
};

function mapCourse(course: {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  level: CourseLevel | null;
  coverFile: { url: string } | null;
  tags: string[];
}): PublicCourseSummary {
  return {
    id: course.id,
    name: course.name,
    slug: course.slug,
    description: course.description,
    level: course.level,
    coverUrl: course.coverFile?.url ?? null,
    tags: course.tags ?? [],
  };
}

const publishedCourseSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  level: true,
  coverFile: { select: { url: true } },
  tags: true,
} as const;

/** Публичный профиль без email / phone / passwordHash */
export async function getPublicUserProfile(
  id: string,
): Promise<PublicUserProfile | null> {
  const userId = Number(id);
  if (!Number.isFinite(userId) || userId <= 0) return null;

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      surname: true,
      patronymic: true,
      role: true,
      userDetails: true,
      email: true,
      phone: true,
      instructedCourses: {
        where: {
          course: {
            deletedAt: null,
            publishedAt: { not: null },
          },
        },
        select: {
          course: { select: publishedCourseSelect },
        },
        orderBy: { createdAt: "desc" },
      },
      enrollments: {
        where: {
          status: "completed",
          course: {
            deletedAt: null,
            publishedAt: { not: null },
          },
        },
        select: {
          course: { select: publishedCourseSelect },
        },
        orderBy: { endDate: "desc" },
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    surname: user.surname,
    patronymic: user.patronymic,
    role: user.role,
    userDetails: (user.userDetails as UserDetails | null) ?? null,
    taughtCourses: user.instructedCourses.map((row) => mapCourse(row.course)),
    completedCourses: user.enrollments.map((row) => mapCourse(row.course)),
    email: user.email,
    phone: user.phone,
  };
}
