import type { Lesson, TestQuestion, TestQuestionOption, VideoPlatform, Video } from "@prisma/client";
import type { File as FileModel } from "@/app/lib/models";
import {
  asBoolean,
  asOptionalId,
  asOptionalInt,
  asOptionalString,
  asRequiredId,
  asRequiredInt,
  asRequiredString,
  requireObject,
} from "@/app/lib/api";
import { LessonType, QuestionType } from "@/app/lib/models";
import { prisma } from "@/app/lib/prisma";

export type TestQuestionOptionDto = {
  id: number;
  text: string;
  sortOrder: number;
  isCorrect?: boolean;
};

export type TestQuestionDto = TestQuestion & {
  options: TestQuestionOptionDto[];
};

export type LessonFullDto = Lesson & {
  testQuestions: TestQuestionDto[];
  attachment?: FileModel | null;
  publishedAt?: Date | string | null;
  video?: {
    id: number;
    url: string;
    title: string | null;
    durationSeconds: number | null;
    platform: VideoPlatform;
    thumbnailUrl: string | null;
  } | null;
};

const questionIncludeAdmin = {
  options: {
    orderBy: { sortOrder: "asc" as const },
  },
};

const questionIncludeStudent = {
  options: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      text: true,
      sortOrder: true,
    },
  },
};

export function serializeQuestion(
  question: TestQuestion & {
    options: Array<
      Pick<TestQuestionOption, "id" | "text" | "sortOrder"> & {
        isCorrect?: boolean;
      }
    >;
  },
  includeCorrect = false,
): TestQuestionDto {
  return {
    ...question,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
      sortOrder: option.sortOrder,
      ...(includeCorrect && "isCorrect" in option
        ? { isCorrect: option.isCorrect }
        : {}),
    })),
  };
}

export async function findLesson(id: number, includeCorrectAnswers = false) {
  const lesson = await prisma.lesson.findFirst({
    where: { id, deletedAt: null },
    include: {
      video: true,
      attachment: true,
      questions: {
        orderBy: { sortOrder: "asc" },
        include: includeCorrectAnswers
          ? questionIncludeAdmin
          : questionIncludeStudent,
      },
    },
  });

  if (!lesson) return null;

  return {
    ...lesson,
    testQuestions: lesson.questions.map((q) =>
      serializeQuestion(q, includeCorrectAnswers),
    ),
  } satisfies LessonFullDto;
}

export async function findVideo(id: number): Promise<Video | null> {
  const video = await prisma.video.findUnique({
    where: { id, deletedAt: null },
  });
  if (!video) return null;
  return video;
};

export async function listLessons(coursePartId: number) {
  return prisma.lesson.findMany({
    where: { coursePartId, deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });
}

function asLessonType(value: unknown): LessonType | undefined {
  if (value === undefined) return undefined;
  const values = Object.values(LessonType);
  if (typeof value !== "string" || !values.includes(value as LessonType)) {
    throw new Error("Поле type должно быть text, video или test");
  }
  return value as LessonType;
}

export type LessonWriteData = {
  coursePartId?: number;
  name?: string;
  description?: string | null;
  sortOrder?: number;
  type?: LessonType;
  textContent?: string | null;
  videoId?: number | null;
  attachmentId?: number | null;
  points?: number;
  durationSeconds?: number | null;
  timeLimitSeconds?: number | null;
  passingScore?: number | null;
  reviewEnabled?: boolean;
  manualGrading?: boolean;
  maxAttempts?: number | null;
  published?: boolean;
};

export type VideoWriteData = {
  url: string;
  title: string | null;
  durationSeconds: number | null;
  platform: VideoPlatform;
  thumbnailUrl: string | null;
};

export function parseLessonBody(
  body: unknown,
  mode: "create" | "update",
): LessonWriteData {
  const raw = requireObject(body);
  const name =
    mode === "create"
      ? asRequiredString(raw.name, "name")
      : asOptionalString(raw.name, "name") ?? undefined;
  if (name && name.length > 1000) {
    throw new Error("Название урока не может быть больше 1000 символов");
  }
  const description = asOptionalString(raw.description, "description");
  if (description && description.length > 1000) {
    throw new Error("Описание урока не может быть больше 1000 символов");
  }
  const type =
    mode === "create"
      ? asLessonType(raw.type) ??
        (() => {
          throw new Error("Поле type обязательно");
        })()
      : asLessonType(raw.type);
  const coursePartId =
    mode === "create"
      ? asRequiredId(raw.coursePartId, "coursePartId")
      : asOptionalId(raw.coursePartId, "coursePartId");
  const sortOrder =
    mode === "create"
      ? asRequiredInt(raw.sortOrder, "sortOrder", 0)
      : asOptionalInt(raw.sortOrder, "sortOrder", 0);
  const textContent = asOptionalString(raw.textContent, "textContent");
  if (textContent && textContent.length > 10000) {
    throw new Error("Текст урока не может быть больше 10000 символов");
  }
  const data: LessonWriteData = {
    ...(coursePartId !== undefined && coursePartId !== null
      ? { coursePartId }
      : {}),
    ...(name !== undefined && name !== null ? { name } : {}),
    ...(asOptionalString(raw.description, "description") !== undefined
      ? { description: asOptionalString(raw.description, "description") }
      : {}),
    ...(sortOrder !== undefined && sortOrder !== null ? { sortOrder } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(asOptionalString(raw.textContent, "textContent") !== undefined
      ? { textContent: asOptionalString(raw.textContent, "textContent") }
      : {}),
    ...(asOptionalId(raw.videoId, "videoId") !== undefined
      ? { videoId: asOptionalId(raw.videoId, "videoId") }
      : {}),
    ...(asOptionalId(raw.attachmentId, "attachmentId") !== undefined
      ? { attachmentId: asOptionalId(raw.attachmentId, "attachmentId") }
      : {}),
    ...(asOptionalInt(raw.points, "points", 0) !== undefined &&
    asOptionalInt(raw.points, "points", 0) !== null
      ? { points: asOptionalInt(raw.points, "points", 0)! }
      : {}),
    ...(asOptionalInt(raw.durationSeconds, "durationSeconds", 0) !== undefined
      ? {
          durationSeconds: asOptionalInt(
            raw.durationSeconds,
            "durationSeconds",
            0,
          ),
        }
      : {}),
    ...(asOptionalInt(raw.timeLimitSeconds, "timeLimitSeconds", 1) !== undefined
      ? {
          timeLimitSeconds: asOptionalInt(
            raw.timeLimitSeconds,
            "timeLimitSeconds",
            1,
          ),
        }
      : {}),
    ...(asOptionalInt(raw.passingScore, "passingScore", 0) !== undefined
      ? { passingScore: asOptionalInt(raw.passingScore, "passingScore", 0) }
      : {}),
    ...(asBoolean(raw.reviewEnabled, "reviewEnabled") !== undefined
      ? { reviewEnabled: asBoolean(raw.reviewEnabled, "reviewEnabled") }
      : {}),
    ...(asBoolean(raw.manualGrading, "manualGrading") !== undefined
      ? { manualGrading: asBoolean(raw.manualGrading, "manualGrading") }
      : {}),
    ...(asOptionalInt(raw.maxAttempts, "maxAttempts", 1) !== undefined
      ? { maxAttempts: asOptionalInt(raw.maxAttempts, "maxAttempts", 1) }
      : {}),
    ...(asBoolean(raw.published, "published") !== undefined
      ? { published: asBoolean(raw.published, "published") }
      : {}),
  };

  const effectiveType = data.type;
  if (mode === "create") {
    if (effectiveType === "text" && !data.textContent) {
      throw new Error("Для type=text нужно поле textContent");
    }
    if (effectiveType === "video" && !data.videoId) {
      throw new Error("Для type=video нужно поле videoId");
    }
  }

  return data;
}

export function parseVideoBody(
  body: unknown,
  mode: "create" | "update",
): VideoWriteData {
  const raw = requireObject(body);
  const url = asRequiredString(raw.url, "url");
  const title = asOptionalString(raw.title, "title") ?? undefined;
  const durationSeconds = asOptionalInt(raw.durationSeconds, "durationSeconds", 1);
  const platform = asRequiredString(raw.platform, "platform") as VideoPlatform;
  const thumbnailUrl = asOptionalString(raw.thumbnailUrl, "thumbnailUrl") ?? undefined;
  return {
    url,
    title: title ?? null,
    durationSeconds: durationSeconds ?? null,
    platform,
    thumbnailUrl: thumbnailUrl ?? null,
  };
}

function asQuestionType(value: unknown): QuestionType | undefined {
  if (value === undefined) return undefined;
  const values = Object.values(QuestionType);
  if (typeof value !== "string" || !values.includes(value as QuestionType)) {
    throw new Error(
      "Поле type должно быть single_choice, multiple_choice или text",
    );
  }
  return value as QuestionType;
}

export type QuestionOptionWrite = {
  text: string;
  isCorrect: boolean;
  sortOrder: number;
};

export type TestQuestionWriteData = {
  lessonId?: number;
  question?: string;
  type?: QuestionType;
  score?: number;
  sortOrder?: number;
  options?: QuestionOptionWrite[];
};

function parseOptions(value: unknown): QuestionOptionWrite[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error("Поле options должно быть массивом");
  }
  return value.map((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`options[${index}] должен быть объектом`);
    }
    const raw = item as Record<string, unknown>;
    return {
      text: asRequiredString(raw.text, `options[${index}].text`),
      isCorrect: asBoolean(raw.isCorrect, `options[${index}].isCorrect`) ?? false,
      sortOrder: asRequiredInt(raw.sortOrder, `options[${index}].sortOrder`, 0),
    };
  });
}

export function parseTestQuestionBody(
  body: unknown,
  mode: "create" | "update",
): TestQuestionWriteData {
  const raw = requireObject(body);
  const question =
    mode === "create"
      ? asRequiredString(raw.question, "question")
      : asOptionalString(raw.question, "question") ?? undefined;
  const type =
    mode === "create"
      ? asQuestionType(raw.type) ??
        (() => {
          throw new Error("Поле type обязательно");
        })()
      : asQuestionType(raw.type);
  const lessonId =
    mode === "create"
      ? asRequiredId(raw.lessonId, "lessonId")
      : asOptionalId(raw.lessonId, "lessonId");
  const sortOrder =
    mode === "create"
      ? asRequiredInt(raw.sortOrder, "sortOrder", 0)
      : asOptionalInt(raw.sortOrder, "sortOrder", 0);
  const score = asOptionalInt(raw.score, "score", 1);
  const options = parseOptions(raw.options);

  const effectiveType = type;
  if (
    mode === "create" &&
    effectiveType &&
    effectiveType !== "text" &&
    (!options || options.length === 0)
  ) {
    throw new Error("Для choice-вопроса нужны options");
  }
  if (effectiveType === "text" && options && options.length > 0) {
    throw new Error("Для type=text options не нужны");
  }
  if (
    options &&
    effectiveType &&
    effectiveType !== "text" &&
    !options.some((option) => option.isCorrect)
  ) {
    throw new Error("Нужен хотя бы один правильный вариант");
  }

  return {
    ...(lessonId !== undefined && lessonId !== null ? { lessonId } : {}),
    ...(question !== undefined && question !== null ? { question } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(score !== undefined && score !== null ? { score } : {}),
    ...(sortOrder !== undefined && sortOrder !== null ? { sortOrder } : {}),
    ...(options !== undefined ? { options } : {}),
  };
}

export async function findTestQuestion(id: number, includeCorrect = true) {
  const question = await prisma.testQuestion.findUnique({
    where: { id },
    include: includeCorrect ? questionIncludeAdmin : questionIncludeStudent,
  });
  if (!question) return null;
  return serializeQuestion(question, includeCorrect);
}

export async function listTestQuestions(
  lessonId: number,
  includeCorrect = false,
) {
  const questions = await prisma.testQuestion.findMany({
    where: { lessonId },
    orderBy: { sortOrder: "asc" },
    include: includeCorrect ? questionIncludeAdmin : questionIncludeStudent,
  });
  return questions.map((q) => serializeQuestion(q, includeCorrect));
}

export async function replaceQuestionOptions(
  questionId: number,
  options: QuestionOptionWrite[],
) {
  await prisma.$transaction([
    prisma.testQuestionOption.deleteMany({ where: { questionId } }),
    prisma.testQuestionOption.createMany({
      data: options.map((option) => ({
        questionId,
        text: option.text,
        isCorrect: option.isCorrect,
        sortOrder: option.sortOrder,
      })),
    }),
  ]);
}
