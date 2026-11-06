import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { prisma } from "@/app/lib/prisma";
import { getUploadsDir } from "@/app/lib/uploads";
import { getCertificateTemplatesList } from "./courses";
import { Certificate } from "@prisma/client";

const execFileAsync = promisify(execFile);

export type CertificateDto = Certificate & {
    file: File;
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

function resolveTemplatePath(templateName: string | null | undefined) {
  const dir = path.join(process.cwd(), "public", "images", "pdf_templates");
  const raw = templateName?.trim() || getCertificateTemplatesList()[0];
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
    const { stdout } = await execFileAsync(
      "magick",
      ["-background", "none", svgPath, "-trim", "+repage", "png:-"],
      { encoding: "buffer", maxBuffer: 12 * 1024 * 1024 },
    );
    return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "magick";
    throw new Error(`Не удалось наложить подпись: ${detail}`, { cause: "generate" });
  }
}

export async function renderCertificatePdf(input: {
  templatePath: string;
  studentName: string;
  courseName: string;
  issuedAt: Date;
}) {
  const [templateBytes, regularBytes, boldBytes, signaturePng] = await Promise.all([
    readFile(input.templatePath),
    readFirstExisting(FONT_CANDIDATES.regular),
    readFirstExisting(FONT_CANDIDATES.bold),
    rasterizeSignature(SIGNATURE_SVG),
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
    height * 0.548,
    width * 0.62,
  );
  drawFittedText(
    page,
    input.courseName,
    bold,
    26,
    width / 2,
    height * 0.418,
    width * 0.42,
  );
  drawFittedText(
    page,
    formatIssuedAt(input.issuedAt),
    regular,
    16,
    width * 0.255,
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
      include: { certificate: { include: { file: true } } },
    });
    if (!enrollment) {
      throw new Error("Студент не записан на курс", { cause: "not_found" });
    }

    const issuedAt = enrollment.certificate?.issuedAt ?? new Date();
    const pdfBytes = await renderCertificatePdf({
      templatePath: resolveTemplatePath(course.certificateTemplate),
      studentName: studentName(user),
      courseName: course.name,
      issuedAt,
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
      (error.cause === "not_found" || error.cause === "generate")
    ) {
      throw error;
    }
    console.error(error);
    throw new Error("Ошибка при генерации сертификата", { cause: "generate" });
  }
}
