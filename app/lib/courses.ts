import {
  Prisma,
  type Course,
  type File,
  type Category,
  type CourseInstructor,
  type User,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { CourseLevel, type Instructor } from "@/app/lib/models";
import { prisma } from "@/app/lib/prisma";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CYRILLIC: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const instructorUserSelect = {
  id: true,
  email: true,
  name: true,
  surname: true,
  patronymic: true,
  userDetails: true,
  phone: true,
  role: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

export const courseInclude = {
  coverFile: true,
  category: true,
  instructors: {
    include: {
      user: { select: instructorUserSelect },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.CourseInclude;

export type CourseRecord = Course & {
  coverFile: File | null;
  category: Category | null;
  instructors: (CourseInstructor & {
    user: Omit<User, "passwordHash">;
  })[];
};

function serializeInstructor(
  instructor: CourseRecord["instructors"][number],
): Instructor {
  return {
    id: instructor.id,
    courseId: instructor.courseId,
    userId: instructor.userId,
    role: instructor.role,
    createdAt: instructor.createdAt,
    user: instructor.user,
  };
}

export function slugify(value: string): string {
  const transliterated = value
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC[char] ?? char)
    .join("");

  return transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function serializeCourse(course: CourseRecord) {
  return {
    ...course,
    rating: course.rating === null ? null : Number(course.rating),
    instructors: course.instructors.map(serializeInstructor),
  };
}

export type CourseDto = ReturnType<typeof serializeCourse>;

export const COURSE_SORT_FIELDS = [
  "publishedAt",
  "createdAt",
  "updatedAt",
  "name",
  "rating",
] as const;

export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export type CourseListQuery = {
  published?: string | null;
  deleted?: string | null;
  page?: string | null;
  limit?: string | null;
  offset?: string | null;
  sort?: string | null;
  order?: string | null;
  level?: string | null;
  category?: string | null;
  instructor?: string | null;
  tags?: string[] | null;
  search?: string | null;
  ratingFrom?: number | null;
  needEnrollment?: boolean | null;
};

function parseIntParam(value: string | null | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function buildCourseListArgs(query: CourseListQuery) {
  const limit = parseIntParam(query.limit, 9, 1, 50);
  const pageFromQuery = parseIntParam(query.page, 1, 1, 10_000);
  const offsetFromQuery =
    query.offset === null || query.offset === undefined
      ? undefined
      : parseIntParam(query.offset, 0, 0, 1_000_000);
  const offset = offsetFromQuery ?? (pageFromQuery - 1) * limit;
  const page = Math.floor(offset / limit) + 1;

  const sort: CourseSortField = COURSE_SORT_FIELDS.includes(
    query.sort as CourseSortField,
  )
    ? (query.sort as CourseSortField)
    : "publishedAt";
  const order = query.order === "asc" ? "asc" : "desc";

  const levels = Object.values(CourseLevel);
  const level =
    query.level && levels.includes(query.level as CourseLevel)
      ? (query.level as CourseLevel)
      : undefined;

  const categoryId =
    query.category && /^\d+$/.test(query.category)
      ? Number(query.category)
      : undefined;
  const categorySlug =
    query.category && !categoryId ? query.category : undefined;

  const instructorId =
    query.instructor && /^\d+$/.test(query.instructor)
      ? Number(query.instructor)
      : undefined;

  const search = query.search?.trim() || undefined;

  const where: Prisma.CourseWhereInput = {
    ...(query.deleted === "1" ? {} : { deletedAt: null }),
    ...(query.published === "1" ? { publishedAt: { not: null } } : {}),
    ...(query.published === "0" ? { publishedAt: null } : {}),
    ...(level ? { level } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(instructorId
      ? { instructors: { some: { userId: instructorId } } }
      : {}),
    ...(query.tags && query.tags.length > 0 ? { tags: { hasSome: query.tags.map(tag => tag.trim()) } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.ratingFrom ? { rating: { gte: query.ratingFrom } } : {}),
    ...(query.needEnrollment !== undefined && query.needEnrollment !== null ? { needEnrollment: query.needEnrollment } : {}),
  };

  return { where, limit, offset, page, sort, order };
}

export async function listCourses(query: CourseListQuery) {
  const { where, limit, offset, page, sort, order } = buildCourseListArgs(query);

  const [rows, total] = await prisma.$transaction([
    prisma.course.findMany({
      where,
      take: limit,
      skip: offset,
      include: courseInclude,
      orderBy: [{ [sort]: order }, { id: "asc" }],
    }),
    prisma.course.count({ where }),
  ]);

  return {
    items: rows.map(serializeCourse),
    total,
    page,
    limit,
    pageCount: Math.max(1, Math.ceil(total / limit)),
  };
}

export type CourseListResponse = Awaited<ReturnType<typeof listCourses>>;

export function parseIdParam(id: string): { id: number } | { slug: string } {
  if (/^\d+$/.test(id)) {
    return { id: Number(id) };
  }
  return { slug: id };
}

function asOptionalString(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`Поле ${field} должно быть строкой`);
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function asBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(`Поле ${field} должно быть boolean`);
  }
  return value;
}

function asOptionalId(value: unknown, field: string): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Поле ${field} должно быть положительным целым числом`);
  }
  return value;
}

function asTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("Поле tags должно быть массивом строк");
  }
  return value.map((tag) => tag.trim()).filter(Boolean);
}

function asLevel(
  value: unknown,
): (typeof CourseLevel)[keyof typeof CourseLevel] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const levels = Object.values(CourseLevel);
  if (typeof value !== "string" || !levels.includes(value as CourseLevel)) {
    throw new Error("Поле level должно быть beginner, intermediate или advanced");
  }
  return value as CourseLevel;
}

function asPublishedAt(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === false) return null;
  if (value === true) return new Date();
  if (typeof value === "string") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Поле publishedAt должно быть ISO-датой");
    }
    return date;
  }
  throw new Error("Поле publishedAt должно быть датой, true или null");
}

export type CourseWriteData = {
  name?: string;
  slug?: string;
  description?: string | null;
  language?: string;
  level?: (typeof CourseLevel)[keyof typeof CourseLevel] | null;
  needEnrollment?: boolean;
  coverFileId?: number | null;
  categoryId?: number | null;
  tags?: string[];
  publishedAt?: Date | null;
};

export function parseCourseBody(body: unknown, mode: "create" | "update"): CourseWriteData {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Ожидается JSON-объект");
  }

  const raw = body as Record<string, unknown>;
  const name = asOptionalString(raw.name, "name");
  const slugInput = asOptionalString(raw.slug, "slug");
  const description = asOptionalString(raw.description, "description");
  const language = asOptionalString(raw.language, "language");

  if (mode === "create" && !name) {
    throw new Error("Поле name обязательно");
  }

  const slug = slugInput ?? (name ? slugify(name) : undefined);
  if (slug !== undefined && (slug === null || !SLUG_RE.test(slug))) {
    throw new Error("Поле slug: латиница, цифры и дефис, например python-basics");
  }

  const level = asLevel(raw.level);
  const needEnrollment = asBoolean(raw.needEnrollment, "needEnrollment");
  const coverFileId = asOptionalId(raw.coverFileId, "coverFileId");
  const categoryId = asOptionalId(raw.categoryId, "categoryId");
  const tags = asTags(raw.tags);
  const publishedAt = asPublishedAt(raw.publishedAt);

  return {
    ...(name !== undefined && name !== null ? { name } : {}),
    ...(slug ? { slug } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(language !== undefined && language !== null ? { language } : {}),
    ...(level !== undefined ? { level } : {}),
    ...(needEnrollment !== undefined ? { needEnrollment } : {}),
    ...(coverFileId !== undefined ? { coverFileId } : {}),
    ...(categoryId !== undefined ? { categoryId } : {}),
    ...(tags !== undefined ? { tags } : {}),
    ...(publishedAt !== undefined ? { publishedAt } : {}),
  };
}

export async function findCourse(id: string) {
  return prisma.course.findFirst({
    where: parseIdParam(id),
    include: courseInclude,
  });
}

export function prismaErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return jsonError("Курс с таким slug уже существует", 409);
    }
    if (error.code === "P2003") {
      return jsonError("Некорректная ссылка на категорию или файл обложки", 400);
    }
  }
  console.error(error);
  return jsonError("Внутренняя ошибка сервера", 500);
}
