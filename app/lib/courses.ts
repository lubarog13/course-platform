import {
  Prisma,
  type Course,
  type File as FileModel,
  type Category,
  type CourseInstructor,
  type User,
  CoursePart,
  UserCourse,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CourseLevel, type Instructor } from "@/app/lib/models";
import { prisma } from "@/app/lib/prisma";
import { CoursePartEditData } from "@/app/lib/courseParts";

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

export const courseSingleInclude = {
  ...courseInclude,
  parts: true,
} satisfies Prisma.CourseInclude;

export type CourseRecord = Course & {
  coverFile: FileModel | null;
  category: Category | null;
  instructors: (CourseInstructor & {
    user: Omit<User, "passwordHash">;
  })[];
  enrollments: UserCourse[] | null;
  parts?: CoursePart[] | null;
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
    parts: course.parts ?? [],
    enrollments: course.enrollments ?? [],
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
  enrolled?: number | boolean | null;
  /** Текущий пользователь — видит свои неопубликованные курсы */
  viewerId?: number | null;
  /** Админ видит все черновики */
  viewerIsAdmin?: boolean;
};

export type CourseFullDto = Course & {
  coverFile: FileModel | null;
  courseParts: CoursePartEditData[];
}

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

  const authoredByViewer: Prisma.CourseWhereInput | undefined =
    query.viewerId != null
      ? { instructors: { some: { userId: query.viewerId, role: "owner" } } }
      : undefined;

  // Неопубликованные — только автору (owner); админ видит все черновики.
  let publishedFilter: Prisma.CourseWhereInput = {};
  if (query.published === "1") {
    publishedFilter = { publishedAt: { not: null } };
  } else if (query.published === "0") {
    if (query.viewerIsAdmin) {
      publishedFilter = { publishedAt: null };
    } else if (authoredByViewer) {
      publishedFilter = { publishedAt: null, ...authoredByViewer };
    } else {
      // Гость / не автор: черновиков нет
      publishedFilter = { id: -1 };
    }
  } else {
    // Без фильтра published: публичные + свои черновики (или все для админа)
    if (query.viewerIsAdmin) {
      publishedFilter = {};
    } else if (authoredByViewer) {
      publishedFilter = {
        OR: [{ publishedAt: { not: null } }, { publishedAt: null, ...authoredByViewer }],
      };
    } else {
      publishedFilter = { publishedAt: { not: null } };
    }
  }

  const and: Prisma.CourseWhereInput[] = [];
  if (Object.keys(publishedFilter).length > 0) {
    and.push(publishedFilter);
  }
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.CourseWhereInput = {
    ...(query.deleted === "1" ? {} : { deletedAt: null }),
    ...(level ? { level } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(instructorId
      ? { instructors: { some: { userId: instructorId } } }
      : {}),
    ...(query.tags && query.tags.length > 0
      ? { tags: { hasSome: query.tags.map((tag) => tag.trim()) } }
      : {}),
    ...(query.ratingFrom ? { rating: { gte: query.ratingFrom } } : {}),
    ...(query.needEnrollment !== undefined && query.needEnrollment !== null
      ? { needEnrollment: query.needEnrollment }
      : {}),
    ...(query.enrolled
      ? { enrollments: { some: { userId: query.enrolled } } }
      : {}),
    ...(and.length > 0 ? { AND: and } : {}),
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
    throw new Error(`Поле ${field} должно быть строкой`, {cause: "invalid"});
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function asBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(`Поле ${field} должно быть boolean`, {cause: "invalid"});
  }
  return value;
}

function asOptionalId(value: unknown, field: string): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Поле ${field} должно быть положительным целым числом`, {cause: "invalid"});
  }
  return value;
}

function asTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("Поле tags должно быть массивом строк", {cause: "invalid"});
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
    throw new Error("Поле level должно быть beginner, intermediate или advanced", {cause: "invalid"});
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
      throw new Error("Поле publishedAt должно быть ISO-датой", {cause: "invalid"});
    }
    return date;
  }
  throw new Error("Поле publishedAt должно быть датой, true или null", {cause: "invalid"});
}

export type CoursePartWriteInput = {
  id?: number;
  name: string;
  description?: string | null;
  sortOrder: number;
  deadlineDays?: number | null;
};

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
  deadlineDays?: number | null;
  publishedAt?: Date | null;
  parts?: CoursePartWriteInput[];
};

function asOptionalIntField(
  value: unknown,
  field: string,
  min = 0,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    throw new Error(`Поле ${field} должно быть целым числом ≥ ${min}`, {cause: "invalid"});
  }
  return value;
}

function asCourseParts(value: unknown): CoursePartWriteInput[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error("Поле parts должно быть массивом", {cause: "invalid"});
  }

  return value.map((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`parts[${index}] должен быть объектом`, {cause: "invalid"});
    }
    const row = item as Record<string, unknown>;
    const name = asOptionalString(row.name, `parts[${index}].name`);
    if (!name) {
      throw new Error(`parts[${index}].name обязательно`, {cause: "invalid"});
    }
    const sortOrder = asOptionalIntField(row.sortOrder, `parts[${index}].sortOrder`, 0);
    if (sortOrder === undefined || sortOrder === null) {
      throw new Error(`parts[${index}].sortOrder обязательно`, {cause: "invalid"});
    }
    const id =
      row.id === undefined
        ? undefined
        : asOptionalId(row.id, `parts[${index}].id`) ?? undefined;
    const description = asOptionalString(row.description, `parts[${index}].description`);
    const deadlineDays = asOptionalIntField(
      row.deadlineDays,
      `parts[${index}].deadlineDays`,
      0,
    );

    return {
      ...(id !== undefined ? { id } : {}),
      name,
      sortOrder,
      ...(description !== undefined ? { description } : {}),
      ...(deadlineDays !== undefined ? { deadlineDays } : {}),
    };
  });
}

export function parseCourseBody(body: unknown, mode: "create" | "update"): CourseWriteData {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Ожидается JSON-объект", {cause: "invalid"});
  }

  const raw = body as Record<string, unknown>;
  const name = asOptionalString(raw.name, "name");
  const slugInput = asOptionalString(raw.slug, "slug");
  const description = asOptionalString(raw.description, "description");
  const language = asOptionalString(raw.language, "language");

  if (mode === "create" && !name) {
    throw new Error("Поле название курса обязательно", {cause: "invalid"});
  }

  const slug = slugInput ?? (name ? slugify(name) : undefined);
  if (slug !== undefined && (slug === null || !SLUG_RE.test(slug))) {
    throw new Error("Поле slug: латиница, цифры и дефис, например python-basics", {cause: "invalid"});
  }

  const level = asLevel(raw.level);
  const needEnrollment = asBoolean(raw.needEnrollment, "needEnrollment");
  const coverFileId = asOptionalId(raw.coverFileId, "coverFileId");
  const categoryId = asOptionalId(raw.categoryId, "categoryId");
  const tags = asTags(raw.tags);
  const deadlineDays = asOptionalIntField(raw.deadlineDays, "deadlineDays", 0);
  const publishedAt = asPublishedAt(raw.publishedAt);
  const parts = asCourseParts(raw.parts);

  if (description && description.length > 10000) {
    throw new Error("Описание курса не может быть больше 10000 символов", {cause: "invalid"});
  }

  if (name && name.length > 1000) {
    throw new Error("Название курса не может быть больше 1000 символов", {cause: "invalid"});
  }

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
    ...(parts !== undefined ? { parts } : {}),
  };
}

/** Синхронизация частей курса внутри транзакции (create/update/soft-delete). */
export async function syncCourseParts(
  courseId: number,
  parts: CoursePartWriteInput[],
) {
  const existing = await prisma.coursePart.findMany({
    where: { courseId, deletedAt: null },
    select: { id: true },
  });
  const keepIds = new Set(
    parts.map((part) => part.id).filter((id): id is number => id != null && id > 0),
  );

  await prisma.$transaction(async (tx) => {
    for (const part of existing) {
      if (!keepIds.has(part.id)) {
        await tx.coursePart.update({
          where: { id: part.id },
          data: { deletedAt: new Date() },
        });
        await tx.lesson.updateMany({
          where: { coursePartId: part.id, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      }
    }

    // Сначала сдвигаем sortOrder, чтобы не ловить unique [courseId, sortOrder]
    for (const [index, part] of parts.entries()) {
      if (part.id != null && part.id > 0) {
        await tx.coursePart.update({
          where: { id: part.id },
          data: { sortOrder: 10_000 + index },
        });
      }
    }

    for (const part of parts) {
      const data = {
        name: part.name,
        description: part.description ?? null,
        sortOrder: part.sortOrder,
        deadlineDays: part.deadlineDays ?? null,
      };

      if (part.id != null && part.id > 0) {
        const owned = existing.some((row) => row.id === part.id);
        if (!owned) {
          throw new Error(`Часть курса ${part.id} не принадлежит этому курсу`, {cause: "invalid"});
        }
        await tx.coursePart.update({
          where: { id: part.id },
          data,
        });
      } else {
        await tx.coursePart.create({
          data: {
            courseId,
            ...data,
          },
        });
      }
    }
  });
}

export function toCourseFullDto(
  course: CourseRecord | (CourseDto & { parts?: CoursePart[] | null }),
): CourseFullDto {
  const parts = ("parts" in course ? course.parts : null) ?? [];
  return {
    ...(course as Course),
    coverFile: course.coverFile ?? null,
    courseParts: parts.map((part) => ({
      id: part.id,
      name: part.name,
      description: part.description,
      sortOrder: part.sortOrder,
      deadlineDays: part.deadlineDays,
      publishedAt: null,
    })),
  };
}

export async function findCourse(id: string) {
  const session = await auth();
  console.log({
    ...parseIdParam(id),
    ...(session?.user?.id && session.user.role !== "admin" ? { enrollments: { some: { userId: Number(session.user.id) } } } : {}),
  })
  return prisma.course.findFirst({
    where: {
      ...parseIdParam(id),
    },
    include: {
      ...courseSingleInclude,
      enrollments: session?.user?.id ? true : false,
    },
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
