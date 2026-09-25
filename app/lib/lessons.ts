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

export type TestAttemptPatchData = {
  answers: TestAnswerWrite[];
  submit?: boolean;
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

export async function findTestAttempt(id: number, userId?: number) {
  return prisma.testAttempt.findFirst({
    where: {
      id,
      ...(userId !== undefined ? { userId } : {}),
    },
    include: attemptInclude,
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

function sameIdSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.every((value, index) => value === right[index]);
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
          score: 0,
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

    const answers = await tx.userTestAnswer.findMany({
      where: { attemptId },
      include: { selectedOptions: true },
    });
    const answerByQuestionId = new Map(
      answers.map((answer) => [answer.questionId, answer]),
    );

    let score = 0;
    let maxScore = 0;

    for (const question of attempt.lesson.questions) {
      maxScore += question.score;
      const answer = answerByQuestionId.get(question.id);
      let questionScore = 0;

      if (question.type === "text") {
        questionScore = 0;
      } else if (answer) {
        const selected = answer.selectedOptions.map((row) => row.optionId);
        const correct = question.options
          .filter((option) => option.isCorrect)
          .map((option) => option.id);
        if (sameIdSet(selected, correct)) {
          questionScore = question.score;
        }
      }

      score += questionScore;
      if (answer) {
        await tx.userTestAnswer.update({
          where: { id: answer.id },
          data: { score: questionScore },
        });
      }
    }

    const passed =
      attempt.lesson.passingScore == null
        ? null
        : score >= attempt.lesson.passingScore;

    await tx.testAttempt.update({
      where: { id: attemptId },
      data: {
        submittedAt: new Date(),
        score,
        maxScore,
        passed: attempt.lesson.manualGrading ? null : passed,
      },
    });
  });

  return findTestAttempt(attemptId, userId);
}
