import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import sharp from "sharp";

import { prisma } from "@/app/lib/prisma";
import { getUploadsDir } from "@/app/lib/uploads";
import { getCertificateTemplatesList } from "./courses";
import { Certificate, Course, UserCourse } from "@prisma/client";
import { File as FileModel } from "@prisma/client";
import { DEFAULT_CERTIFICATE_TEMPLATE } from "@/lib/consts";

export type CertificateDto = Certificate & {
    file: FileModel;
}

export type CertificateListDto = CertificateDto & {
  userCourse: UserCourse & { course: Course };
}

const NAVY = rgb(0.106, 0.165, 0.29);
const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const SIGNATURE_SVG = path.join(
  process.cwd(),
  "public",
  "images",
  "signs",
  "example.svg",
);

const FONT_CANDIDATES = {
  regular: [
    path.join(process.cwd(), "assets/fonts/NotoSerif-Regular.ttf"),
    "/usr/share/fonts/google-noto/NotoSerif-Regular.ttf",
  ],
  bold: [
    path.join(process.cwd(), "assets/fonts/NotoSerif-Bold.ttf"),
    "/usr/share/fonts/google-noto/NotoSerif-Bold.ttf",
  ],
  semibold: [
    path.join(process.cwd(), "assets/fonts/NotoSerif-SemiBold.ttf"),
    "/usr/share/fonts/google-noto/NotoSerif-SemiBold.ttf",
  ],
};

function toPdfBytes(buffer: Buffer) {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

async function readFirstExisting(candidates: string[]) {
  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      return readFile(filePath);
    }
  }
  throw new Error("Не найден шрифт с поддержкой кириллицы", { cause: "generate" });
}

function resolveTemplatePath(templateName: string | null | undefined, hasSignature: boolean) {
  const dir = path.join(process.cwd(), "public", "images", "pdf_templates");
  const raw = templateName?.trim() || (hasSignature ? getCertificateTemplatesList()[0] : DEFAULT_CERTIFICATE_TEMPLATE);
  if (!raw) {
    throw new Error("Шаблон сертификата не найден", { cause: "not_found" });
  }
  const base = path.basename(raw);
  const candidates = [
    path.join(dir, base),
    path.join(dir, `${base}.png`),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("Шаблон сертификата не найден", { cause: "not_found" });
}

function formatIssuedAt(date: Date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} г.`;
}

function studentName(user: {
  surname: string;
  name: string;
  patronymic: string | null;
}) {
  return [user.surname, user.name, user.patronymic].filter(Boolean).join(" ");
}

async function resolveSignaturePath(signatureId: number | null) {
  if (!signatureId) {
    return SIGNATURE_SVG;
  }
  const signature = await prisma.file.findUnique({
    where: { id: signatureId },
  });
  if (!signature) {
   return SIGNATURE_SVG;
  }
  return signature.url;
}

function drawFittedText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  centerX: number,
  y: number,
  maxWidth: number,
) {
  let fontSize = size;
  while (fontSize > 12 && font.widthOfTextAtSize(text, fontSize) > maxWidth) {
    fontSize -= 0.5;
  }
  const width = font.widthOfTextAtSize(text, fontSize);
  page.drawText(text, {
    x: centerX - width / 2,
    y,
    size: fontSize,
    font,
    color: NAVY,
  });
}

async function rasterizeSignature(svgPath: string) {
  try {
    return await sharp(svgPath, { density: 150 })
      .ensureAlpha()
      .trim()
      .png()
      .toBuffer();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "sharp";
    throw new Error(`Не удалось наложить подпись: ${detail}`, {
      cause: "generate",
    });
  }
}

export async function renderCertificatePdf(input: {
  templatePath: string;
  studentName: string;
  courseName: string;
  issuedAt: Date;
  signatureId: number | null;
}) {
  const [templateBytes, regularBytes, boldBytes, semiboldBytes, signaturePng] = await Promise.all([
    readFile(input.templatePath),
    readFirstExisting(FONT_CANDIDATES.regular),
    readFirstExisting(FONT_CANDIDATES.bold),
    readFirstExisting(FONT_CANDIDATES.semibold),
    rasterizeSignature(await resolveSignaturePath(input.signatureId)),
  ]);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const regular = await pdfDoc.embedFont(toPdfBytes(regularBytes), { subset: true });
  const bold = await pdfDoc.embedFont(toPdfBytes(boldBytes), { subset: true });
  
  const background = await pdfDoc.embedPng(toPdfBytes(templateBytes));
  const signature = await pdfDoc.embedPng(toPdfBytes(signaturePng));

  const page = pdfDoc.addPage([background.width, background.height]);
  page.drawImage(background, {
    x: 0,
    y: 0,
    width: background.width,
    height: background.height,
  });

  const { width, height } = page.getSize();
  drawFittedText(
    page,
    input.studentName,
    bold,
    34,
    width / 2,
    height * 0.540,
    width * 0.62,
  );
  drawFittedText(
    page,
    input.courseName,
    bold,
    26,
    width / 2,
    height * 0.400,
    width * 0.42,
  );
  drawFittedText(
    page,
    formatIssuedAt(input.issuedAt),
    regular,
    24,
    width * 0.235,
    height * 0.176,
    width * 0.24,
  );

  const signWidth = Math.min(width * 0.16, 240);
  const signHeight = signWidth * (signature.height / signature.width);
  page.drawImage(signature, {
    x: width * 0.755 - signWidth / 2,
    y: height * 0.172,
    width: signWidth,
    height: signHeight,
  });

  pdfDoc.setTitle(`Сертификат — ${input.courseName}`);
  pdfDoc.setAuthor(input.studentName);
  return Buffer.from(await pdfDoc.save());
}

export async function generateCertificate(courseId: number, userId: number) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new Error("Курс не найден", { cause: "not_found" });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("Пользователь не найден", { cause: "not_found" });
    }
    const enrollment = await prisma.userCourse.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { 
        certificate: { include: { file: true } },
        course: { include: { instructors: { include: { user: { select: { signatureId: true } } } } } }
      },
    });
    if (!enrollment) {
      throw new Error("Студент не записан на курс", { cause: "not_found" });
    }

    const eligibility = await getCertificateEligibility(userId, courseId);
    if (!eligibility.eligible) {
      const reasons: string[] = [];
      if (eligibility.progress < eligibility.threshold) {
        reasons.push(
          `прогресс ${eligibility.progress}% из ${eligibility.threshold}% (${eligibility.completedCount}/${eligibility.totalLessons} уроков)`,
        );
      }
      if (!eligibility.requiredCompleted) {
        reasons.push(
          `обязательные уроки: ${eligibility.completedRequiredCount}/${eligibility.totalRequired}`,
        );
      }
      throw new Error(
        `Не выполнены условия для сертификата: ${reasons.join("; ")}`,
        { cause: "no_access" },
      );
    }

    const issuedAt = enrollment.certificate?.issuedAt ?? new Date();
    
    const signatureId = enrollment.course.instructors.find((instructor) => instructor.role === "owner" && instructor.user.signatureId !== null)?.user.signatureId ?? null;
    const pdfBytes = await renderCertificatePdf({
      templatePath: resolveTemplatePath(course.certificateTemplate, signatureId !== null),
      studentName: studentName(user),
      courseName: course.name,
      issuedAt,
      signatureId: signatureId ?? null,
    });

    const existingFile = enrollment.certificate?.file;
    if (existingFile && existsSync(existingFile.url)) {
      await writeFile(existingFile.url, pdfBytes);
      await prisma.file.update({
        where: { id: existingFile.id },
        data: { sizeBytes: pdfBytes.byteLength },
      });
      return prisma.certificate.findUniqueOrThrow({
        where: { id: enrollment.certificate!.id },
        include: { file: true },
      });
    }

    const uploadsDir = getUploadsDir();
    await mkdir(uploadsDir, { recursive: true });
    const filename = `certificate-${courseId}-${userId}-${randomUUID()}.pdf`;
    const filePath = path.join(uploadsDir, filename);
    await writeFile(filePath, pdfBytes);

    const file = await prisma.file.create({
      data: {
        url: filePath,
        originalName: filename,
        mimeType: "application/pdf",
        sizeBytes: pdfBytes.byteLength,
        uploadedBy: userId,
      },
    });
    const verificationCode = randomBytes(8).toString("hex");
    return prisma.certificate.upsert({
      where: { userCourseId: enrollment.id },
      create: {
        userCourseId: enrollment.id,
        number: `CERT-${courseId}-${userId}-${verificationCode.slice(0, 6).toUpperCase()}`,
        verificationCode,
        fileId: file.id,
        issuedAt,
      },
      update: {
        fileId: file.id,
      },
      include: { file: true },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.cause === "not_found" ||
        error.cause === "generate" ||
        error.cause === "no_access")
    ) {
      throw error;
    }
    console.error(error);
    throw new Error("Ошибка при генерации сертификата", { cause: "generate" });
  }
}


export async function getCertificates(userId: number) {
  return prisma.certificate.findMany({
    where: { userCourse: { userId } },
    include: { file: true, userCourse: { include: { course: true } } },
  });
}

export type CompletedCourseDto = Course & {
  hasCertificate: boolean;
};

export type CertificateEligibility = {
  eligible: boolean;
  /** Процент по всем урокам курса */
  progress: number;
  threshold: number;
  completedCount: number;
  totalLessons: number;
  /** Все обязательные уроки пройдены */
  requiredCompleted: boolean;
  completedRequiredCount: number;
  totalRequired: number;
};

type CourseLessonRef = {
  id: number;
  type: string;
  required: boolean;
};

type CourseProgressSource = {
  certificateProgress: number | null;
  parts: Array<{
    lessons: CourseLessonRef[];
  }>;
};

async function loadLessonCompletionMaps(userId: number, lessonIds: number[]) {
  if (lessonIds.length === 0) {
    return {
      completedLessons: new Set<number>(),
      testsPassed: new Set<number>(),
    };
  }

  const [progressRows, attemptRows] = await Promise.all([
    prisma.userLesson.findMany({
      where: { userId, lessonId: { in: lessonIds } },
      select: { lessonId: true, completed: true, points: true },
    }),
    prisma.testAttempt.findMany({
      where: {
        userId,
        lessonId: { in: lessonIds },
        submittedAt: { not: null },
        OR: [
          { passed: true },
          {
            score: { not: null },
            maxScore: { not: null },
          },
        ],
      },
      select: { lessonId: true, score: true, maxScore: true, passed: true },
    }),
  ]);

  const completedLessons = new Set<number>();
  for (const row of progressRows) {
    if (row.completed || row.points > 0) {
      completedLessons.add(row.lessonId);
    }
  }

  const testsPassed = new Set<number>();
  for (const attempt of attemptRows) {
    if (
      attempt.passed === true ||
      (attempt.score != null &&
        attempt.maxScore != null &&
        attempt.maxScore > 0 &&
        attempt.score >= attempt.maxScore)
    ) {
      testsPassed.add(attempt.lessonId);
      completedLessons.add(attempt.lessonId);
    }
  }

  return { completedLessons, testsPassed };
}

function isLessonCompleted(
  lesson: CourseLessonRef,
  completedLessons: Set<number>,
  testsPassed: Set<number>,
) {
  if (lesson.type === "test") {
    return testsPassed.has(lesson.id) || completedLessons.has(lesson.id);
  }
  return completedLessons.has(lesson.id);
}

function evaluateCertificateEligibility(
  course: CourseProgressSource,
  completedLessons: Set<number>,
  testsPassed: Set<number>,
): CertificateEligibility {
  const allLessons = course.parts.flatMap((part) => part.lessons);
  const requiredLessons = allLessons.filter((lesson) => lesson.required);
  const threshold = Math.min(
    100,
    Math.max(0, course.certificateProgress ?? 100),
  );

  if (allLessons.length === 0) {
    return {
      eligible: false,
      progress: 0,
      threshold,
      completedCount: 0,
      totalLessons: 0,
      requiredCompleted: requiredLessons.length === 0,
      completedRequiredCount: 0,
      totalRequired: 0,
    };
  }

  const completedCount = allLessons.filter((lesson) =>
    isLessonCompleted(lesson, completedLessons, testsPassed),
  ).length;
  const completedRequiredCount = requiredLessons.filter((lesson) =>
    isLessonCompleted(lesson, completedLessons, testsPassed),
  ).length;
  const progress = Math.round((completedCount / allLessons.length) * 100);
  const requiredCompleted =
    requiredLessons.length === 0 ||
    completedRequiredCount === requiredLessons.length;

  return {
    eligible: progress >= threshold && requiredCompleted,
    progress,
    threshold,
    completedCount,
    totalLessons: allLessons.length,
    requiredCompleted,
    completedRequiredCount,
    totalRequired: requiredLessons.length,
  };
}

const courseProgressInclude = {
  parts: {
    where: { deletedAt: null },
    include: {
      lessons: {
        where: { deletedAt: null },
        select: { id: true, type: true, required: true },
      },
    },
  },
} as const;

/**
 * Прогресс по всем урокам + обязательные уроки.
 * Сертификат: progress >= certificateProgress И все required пройдены.
 */
export async function getCertificateEligibility(
  userId: number,
  courseId: number,
): Promise<CertificateEligibility> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: {
      certificateProgress: true,
      ...courseProgressInclude,
    },
  });

  if (!course) {
    return {
      eligible: false,
      progress: 0,
      threshold: 100,
      completedCount: 0,
      totalLessons: 0,
      requiredCompleted: false,
      completedRequiredCount: 0,
      totalRequired: 0,
    };
  }

  const lessons = course.parts.flatMap((part) => part.lessons);
  const { completedLessons, testsPassed } = await loadLessonCompletionMaps(
    userId,
    lessons.map((lesson) => lesson.id),
  );

  return evaluateCertificateEligibility(
    course,
    completedLessons,
    testsPassed,
  );
}

/**
 * Курс пройден до порога сертификата, сертификат ещё не выдан
 * (для уведомления «доступен сертификат»).
 */
export async function isCourseCompleted(
  userId: number,
  courseId: number,
): Promise<boolean> {
  const enrollment = await prisma.userCourse.findFirst({
    where: {
      userId,
      courseId,
      course: { deletedAt: null },
    },
    select: { certificate: { select: { id: true } } },
  });

  if (!enrollment || enrollment.certificate != null) return false;

  const eligibility = await getCertificateEligibility(userId, courseId);
  return eligibility.eligible;
}

/**
 * Курсы, где progress >= certificateProgress и все required-уроки пройдены.
 */
export async function getCompletedCourses(
  userId: number,
): Promise<CompletedCourseDto[]> {
  const enrollments = await prisma.userCourse.findMany({
    where: {
      userId,
      course: { deletedAt: null },
    },
    include: {
      certificate: { select: { id: true } },
      course: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          language: true,
          level: true,
          needEnrollment: true,
          coverFileId: true,
          categoryId: true,
          rating: true,
          ratingCount: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          tags: true,
          durationSeconds: true,
          deadlineDays: true,
          certificateTemplate: true,
          certificateProgress: true,
          ...courseProgressInclude,
        },
      },
    },
  });

  const lessonIds = enrollments.flatMap((enrollment) =>
    enrollment.course.parts.flatMap((part) =>
      part.lessons.map((lesson) => lesson.id),
    ),
  );

  const { completedLessons, testsPassed } = await loadLessonCompletionMaps(
    userId,
    lessonIds,
  );

  return enrollments
    .filter((enrollment) => {
      const eligibility = evaluateCertificateEligibility(
        enrollment.course,
        completedLessons,
        testsPassed,
      );
      return eligibility.eligible;
    })
    .map(({ certificate, course: { parts: _parts, ...course } }) => ({
      ...course,
      hasCertificate: certificate != null,
    }));
}