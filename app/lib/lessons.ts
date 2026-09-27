import type { Lesson, Prisma, TestQuestion, TestQuestionOption, VideoPlatform, Video } from "@prisma/client";
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

export type NestedTestQuestionWrite = {
  id?: number;
  question: string;
  type: QuestionType;
  score: number;
  sortOrder: number;
  required: boolean;
  attachmentNeeded: boolean;
  textAnswer?: string | null;
  options: QuestionOptionWrite[];
};

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
  testQuestions?: NestedTestQuestionWrite[];
};

export function lessonRecordFields(data: LessonWriteData) {
  const fields = { ...data };
  delete fields.testQuestions;
  delete fields.published;
  return fields;
}

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
    ...(raw.testQuestions !== undefined
      ? { testQuestions: parseNestedTestQuestions(raw.testQuestions) }
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

  if (
    data.testQuestions !== undefined &&
    effectiveType !== undefined &&
    effectiveType !== "test"
  ) {
    throw new Error("Поле testQuestions допустимо только для type=test");
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
  required?: boolean;
  attachmentNeeded?: boolean;
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

function parseNestedTestQuestions(value: unknown): NestedTestQuestionWrite[] {
  if (!Array.isArray(value)) {
    throw new Error("Поле testQuestions должно быть массивом");
  }

  const questions = value.map((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`testQuestions[${index}] должен быть объектом`);
    }
    const raw = item as Record<string, unknown>;
    const type =
      asQuestionType(raw.type) ??
      (() => {
        throw new Error(`testQuestions[${index}].type обязательно`);
      })();
    const options = parseOptions(raw.options) ?? [];
    const id = asOptionalId(raw.id, `testQuestions[${index}].id`);

    if (type !== "text" && options.length === 0) {
      throw new Error(`testQuestions[${index}]: для choice-вопроса нужны options`);
    }
    if (type === "text" && options.length > 0) {
      throw new Error(`testQuestions[${index}]: для type=text options не нужны`);
    }
    if (type !== "text" && !options.some((option) => option.isCorrect)) {
      throw new Error(
        `testQuestions[${index}]: нужен хотя бы один правильный вариант`,
      );
    }

    return {
      ...(id !== undefined && id !== null ? { id } : {}),
      question: asRequiredString(raw.question, `testQuestions[${index}].question`),
      type,
      score: asOptionalInt(raw.score, `testQuestions[${index}].score`, 0) ?? 1,
      sortOrder: asRequiredInt(
        raw.sortOrder,
        `testQuestions[${index}].sortOrder`,
        0,
      ),
      required: asBoolean(raw.required, `testQuestions[${index}].required`) ?? true,
      textAnswer: asOptionalString(raw.textAnswer, `testQuestions[${index}].textAnswer`),
      attachmentNeeded:
        asBoolean(
          raw.attachmentNeeded,
          `testQuestions[${index}].attachmentNeeded`,
        ) ?? false,
      options: type === "text" ? [] : options,
    } satisfies NestedTestQuestionWrite;
  });

  const sortOrders = questions.map((question) => question.sortOrder);
  if (new Set(sortOrders).size !== sortOrders.length) {
    throw new Error("У вопросов sortOrder должен быть уникальным");
  }

  return questions;
}

type TxClient = Prisma.TransactionClient;

export async function replaceLessonQuestions(
  lessonId: number,
  questions: NestedTestQuestionWrite[],
  tx: TxClient = prisma,
) {
  const existing = await tx.testQuestion.findMany({
    where: { lessonId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((question) => question.id));

  const toUpdate: NestedTestQuestionWrite[] = [];
  const toCreate: NestedTestQuestionWrite[] = [];
  const keptIds = new Set<number>();

  for (const question of questions) {
    if (question.id !== undefined && existingIds.has(question.id)) {
      toUpdate.push(question);
      keptIds.add(question.id);
    } else {
      toCreate.push(question);
    }
  }

  const toDelete = existing
    .map((question) => question.id)
    .filter((id) => !keptIds.has(id));

  if (toDelete.length > 0) {
    await tx.testQuestionOption.deleteMany({
      where: { questionId: { in: toDelete } },
    });
    await tx.testQuestion.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  for (const question of toUpdate) {
    await tx.testQuestion.update({
      where: { id: question.id! },
      data: { sortOrder: -(question.id! + 100_000) },
    });
  }

  for (const question of toUpdate) {
    await tx.testQuestion.update({
      where: { id: question.id! },
      data: {
        question: question.question,
        type: question.type,
        score: question.score,
        sortOrder: question.sortOrder,
        required: question.required,
        textAnswer: question.textAnswer ?? null,
        attachmentNeeded: question.attachmentNeeded,
      },
    });
    await tx.testQuestionOption.deleteMany({
      where: { questionId: question.id! },
    });
    if (question.options.length > 0) {
      await tx.testQuestionOption.createMany({
        data: question.options.map((option) => ({
          questionId: question.id!,
          text: option.text,
          isCorrect: option.isCorrect,
          sortOrder: option.sortOrder,
        })),
      });
    }
  }

  for (const question of toCreate) {
    await tx.testQuestion.create({
      data: {
        lessonId,
        question: question.question,
        type: question.type,
        score: question.score,
        sortOrder: question.sortOrder,
        required: question.required,
        textAnswer: question.textAnswer ?? null,
        attachmentNeeded: question.attachmentNeeded,
        ...(question.options.length > 0
          ? {
              options: {
                create: question.options.map((option) => ({
                  text: option.text,
                  isCorrect: option.isCorrect,
                  sortOrder: option.sortOrder,
                })),
              },
            }
          : {}),
      },
    });
  }
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
  const required = asBoolean(raw.required, "required");
  const textAnswer = asOptionalString(raw.textAnswer, "textAnswer");
  const attachmentNeeded = asBoolean(raw.attachmentNeeded, "attachmentNeeded");

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
    ...(required !== undefined ? { required } : {}),
    ...(attachmentNeeded !== undefined ? { attachmentNeeded } : {}),
    ...(textAnswer !== undefined ? { textAnswer } : {}),
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

// --- Попытки теста ---

const attemptInclude = {
  answers: {
    include: {
      selectedOptions: true,
      answerFile: true,
    },
  },
} as const;

export type TestAnswerWrite = {
  questionId: number;
  answerText?: string | null;
  answerFileId?: number | null;
  optionIds?: number[];
};

export type TestAnswerReturnData = {
  questionId: number;
  answerText?: string | null;
  answerFileId?: number | null;
  optionIds?: Array<{ optionId: number, isCorrect: boolean | null }>;
  isCorrect: boolean | null;
};


export type TestAttemptPatchData = {
  answers: TestAnswerWrite[];
  submit?: boolean;
  lastAttempt?: boolean | false;
  score?: number;
};

export type TestAttemptReturnData = {
  submit?: boolean;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  answers: TestAnswerReturnData[];
};

export function parseTestAttemptAnswersBody(body: unknown): TestAttemptPatchData {
  const raw = requireObject(body);
  if (!Array.isArray(raw.answers)) {
    throw new Error("Поле answers должно быть массивом");
  }

  const answers = raw.answers.map((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`answers[${index}] должен быть объектом`);
    }
    const row = item as Record<string, unknown>;
    const questionId = asRequiredId(row.questionId, `answers[${index}].questionId`);
    const answerText = asOptionalString(row.answerText, `answers[${index}].answerText`);
    const answerFileId = asOptionalId(
      row.answerFileId,
      `answers[${index}].answerFileId`,
    );

    let optionIds: number[] | undefined;
    if (row.optionIds !== undefined) {
      if (!Array.isArray(row.optionIds)) {
        throw new Error(`answers[${index}].optionIds должен быть массивом`);
      }
      optionIds = row.optionIds.map((optionId, optionIndex) =>
        asRequiredId(optionId, `answers[${index}].optionIds[${optionIndex}]`),
      );
    }

    return {
      questionId,
      ...(answerText !== undefined ? { answerText } : {}),
      ...(answerFileId !== undefined ? { answerFileId } : {}),
      ...(optionIds !== undefined ? { optionIds } : {}),
    } satisfies TestAnswerWrite;
  });

  

  return {
    answers,
    submit: asBoolean(raw.submit, "submit"),
  };
}

export async function findTestAttempt(id: number, resultData: TestAttemptReturnData | null, userId?: number) {
  const attempt = await prisma.testAttempt.findFirst({
    where: {
      id,
      ...(userId !== undefined ? { userId } : {}),
    },
    include: attemptInclude,
  });
  if (!attempt) {
    throw new Error("Попытка не найдена");
  }
  return {
    ...attempt,
    ...(resultData !== null ? { ...resultData } : {}),
  };
}

export async function findTestAttemptsByLessonId(lessonId: number, userId: number) {
  return prisma.testAttempt.findMany({
    where: { lessonId, userId },
    include: attemptInclude,
    orderBy: { attemptNumber: "desc" },
  });
}

export async function startTestAttempt(lessonId: number, userId: number) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null },
    select: {
      id: true,
      type: true,
      maxAttempts: true,
      timeLimitSeconds: true,
    },
  });
  if (!lesson) {
    throw new Error("Урок не найден");
  }
  if (lesson.type !== "test") {
    throw new Error("Попытку можно начать только для урока типа test");
  }

  const openAttempt = await prisma.testAttempt.findFirst({
    where: { userId, lessonId, submittedAt: null },
    include: attemptInclude,
    orderBy: { attemptNumber: "desc" },
  });
  if (openAttempt) {
    return openAttempt;
  }

  const attemptCount = await prisma.testAttempt.count({
    where: { userId, lessonId },
  });
  if (lesson.maxAttempts != null && attemptCount >= lesson.maxAttempts) {
    throw new Error("Исчерпано максимальное число попыток");
  }

  return prisma.testAttempt.create({
    data: {
      userId,
      lessonId,
      attemptNumber: attemptCount + 1,
    },
    include: attemptInclude,
  });
}

export async function rateTestAttempt(
  testId: number,
  testAttempt: TestAttemptPatchData,
): Promise<TestAttemptReturnData | null> {
  if (!testAttempt.submit) {
    return null;
  }

  const test = await prisma.lesson.findFirst({
    where: { id: testId, deletedAt: null },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
    },
  });
  if (!test) {
    throw new Error("Тест не найден");
  }
  if (test.type !== "test") {
    throw new Error("Тест не является тестом");
  }

  return buildAttemptReview({
    questions: test.questions,
    answers: testAttempt.answers,
    reviewEnabled: test.reviewEnabled,
    lastAttempt: Boolean(testAttempt.lastAttempt),
  });
}

type ReviewQuestion = {
  id: number;
  type: string;
  score: number;
  textAnswer: string | null;
  options: Array<{ id: number; isCorrect: boolean }>;
};

export function buildAttemptReview(params: {
  questions: ReviewQuestion[];
  answers: TestAnswerWrite[];
  reviewEnabled: boolean;
  lastAttempt: boolean;
  score?: number | null;
  maxScore?: number | null;
}): TestAttemptReturnData {
  const { questions, answers: userAnswers, reviewEnabled, lastAttempt } = params;
  let score = 0;
  let maxScore = 0;
  const answers: TestAnswerReturnData[] = [];

  for (const question of questions) {
    maxScore += question.score;
    const userAnswer = userAnswers.find(
      (answer) => answer.questionId === question.id,
    );
    const selectedIds = userAnswer?.optionIds ?? [];
    const correctOptionIds = new Set(
      question.options.filter((option) => option.isCorrect).map((option) => option.id),
    );

    let isCorrect = false;
    let optionFeedback: TestAnswerReturnData["optionIds"];

    if (question.type === "single_choice") {
      isCorrect =
        selectedIds.length === 1 && correctOptionIds.has(selectedIds[0]!);
    } else if (question.type === "multiple_choice") {
      isCorrect = sameIdSet(selectedIds, [...correctOptionIds]);
    } else if (question.type === "text") {
      isCorrect = compareTextAnswers(
        question.textAnswer ?? null,
        userAnswer?.answerText ?? null,
      );
    }

    if (isCorrect) {
      score += question.score;
    }

    if (reviewEnabled && question.type !== "text") {
      if (lastAttempt) {
        optionFeedback = question.options.map((option) => ({
          optionId: option.id,
          isCorrect: option.isCorrect,
        }));
      } else {
        optionFeedback = selectedIds
          .filter((optionId) => !correctOptionIds.has(optionId))
          .map((optionId) => ({
            optionId,
            isCorrect: false,
          }));
      }
    }

    answers.push({
      questionId: question.id,
      answerText: userAnswer?.answerText,
      answerFileId: userAnswer?.answerFileId,
      ...(optionFeedback !== undefined ? { optionIds: optionFeedback } : {}),
      isCorrect: reviewEnabled ? isCorrect : null,
    });
  }

  return {
    submit: true,
    score: params.score ?? score,
    maxScore: params.maxScore ?? maxScore,
    isCorrect: answers.every((answer) => answer.isCorrect !== false),
    answers,
  };
}

/** Просмотр завершённой попытки с теми же правилами раскрытия опций. */
export async function getTestAttemptForReview(attemptId: number, userId: number) {
  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      ...attemptInclude,
      lesson: {
        select: {
          id: true,
          type: true,
          maxAttempts: true,
          reviewEnabled: true,
          questions: {
            include: {
              options: true,
            },
          },
        },
      },
    },
  });

  if (!attempt) {
    throw new Error("Попытка не найдена");
  }
  if (!attempt.submittedAt) {
    throw new Error("Попытка ещё не завершена");
  }
  if (attempt.lesson.type !== "test") {
    throw new Error("Урок не является тестом");
  }
  if (!attempt.lesson.reviewEnabled) {
    throw new Error("Просмотр ответов отключён");
  }

  const writeAnswers: TestAnswerWrite[] = attempt.answers.map((answer) => ({
    questionId: answer.questionId,
    answerText: answer.answerText,
    answerFileId: answer.answerFileId,
    optionIds: answer.selectedOptions.map((option) => option.optionId),
  }));

  const lastAttempt =
    attempt.lesson.maxAttempts != null &&
    attempt.attemptNumber >= attempt.lesson.maxAttempts;

  const review = buildAttemptReview({
    questions: attempt.lesson.questions,
    answers: writeAnswers,
    reviewEnabled: true,
    lastAttempt,
    score: attempt.score,
    maxScore: attempt.maxScore,
  });

  const { lesson: _lesson, ...attemptRow } = attempt;
  return {
    ...attemptRow,
    ...review,
    selectedAnswers: attempt.answers,
  };
}

function sameIdSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.every((value, index) => value === right[index]);
}

function compareTextAnswers(a: string | null, b: string | null) {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();
}

export async function saveTestAttemptAnswers(
  attemptId: number,
  userId: number,
  data: TestAttemptPatchData,
) {
  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      lesson: {
        select: {
          id: true,
          type: true,
          passingScore: true,
          manualGrading: true,
          maxAttempts: true,
          reviewEnabled: true,
          questions: {
            include: {
              options: true,
            },
          },
        },
      },
    },
  });

  if (!attempt) {
    throw new Error("Попытка не найдена");
  }
  if (attempt.submittedAt) {
    throw new Error("Попытка уже отправлена, ответы изменить нельзя");
  }
  if (attempt.lesson.type !== "test") {
    throw new Error("Урок не является тестом");
  }

  const questionById = new Map(
    attempt.lesson.questions.map((question) => [question.id, question]),
  );

  for (const answer of data.answers) {
    const question = questionById.get(answer.questionId);
    if (!question) {
      throw new Error(`Вопрос ${answer.questionId} не принадлежит этому тесту`);
    }

    if (question.type === "text") {
      if (answer.optionIds && answer.optionIds.length > 0) {
        throw new Error(`Для текстового вопроса ${question.id} optionIds не нужны`);
      }
    } else {
      const optionIds = answer.optionIds ?? [];
      if (question.type === "single_choice" && optionIds.length > 1) {
        throw new Error(
          `Для single_choice вопроса ${question.id} нужен один вариант`,
        );
      }
      const validOptionIds = new Set(question.options.map((option) => option.id));
      for (const optionId of optionIds) {
        if (!validOptionIds.has(optionId)) {
          throw new Error(
            `Вариант ${optionId} не принадлежит вопросу ${question.id}`,
          );
        }
      }
    }
  }
  let result = null;


  await prisma.$transaction(async (tx) => {
    for (const answer of data.answers) {
      const question = questionById.get(answer.questionId)!;
      const upserted = await tx.userTestAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: answer.questionId,
          },
        },
        create: {
          attemptId,
          questionId: answer.questionId,
          answerText:
            question.type === "text" ? (answer.answerText ?? null) : null,
          answerFileId: answer.answerFileId ?? null,
        },
        update: {
          ...(answer.answerText !== undefined
            ? { answerText: answer.answerText }
            : {}),
          ...(answer.answerFileId !== undefined
            ? { answerFileId: answer.answerFileId }
            : {}),
        },
      });

      await tx.userTestAnswerOption.deleteMany({
        where: { answerId: upserted.id },
      });

      const optionIds =
        question.type === "text" ? [] : (answer.optionIds ?? []);
      if (optionIds.length > 0) {
        await tx.userTestAnswerOption.createMany({
          data: optionIds.map((optionId) => ({
            answerId: upserted.id,
            optionId,
          })),
        });
      }
    }

    if (!data.submit) return;

    const isLastAttempt =
      attempt.lesson.maxAttempts != null &&
      attempt.attemptNumber >= attempt.lesson.maxAttempts;

    result = await rateTestAttempt(attempt.lesson.id, {
      ...data,
      lastAttempt: isLastAttempt,
    });
    if (!result) {
      throw new Error("Не удалось оценить попытку");
    }


    const passed =
      attempt.lesson.passingScore == null
        ? null
        : result.score >= attempt.lesson.passingScore;

    await tx.testAttempt.update({
      where: { id: attemptId },
      data: {
        submittedAt: new Date(),
        score: result.score,
        maxScore: result.maxScore,
        passed: attempt.lesson.manualGrading ? null : passed,
      },
    });
  });

  return findTestAttempt(attemptId, result, userId);
}
