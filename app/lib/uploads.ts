import fs from "node:fs/promises";
import path from "node:path";
import type { Role } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";
import { isCourseStaff } from "@/app/lib/enrollment";

/** Directory where admin uploads are stored on disk. */
export function getUploadsDir() {
  return path.join(process.cwd(), "public", "uploads");
}

/** Public URL for an uploaded photo (served at runtime, not via Next public map). */
export function uploadedImageUrl(filename: string) {
  return `/api/uploads/${encodeURIComponent(filename)}`;
}

/** Resolve a safe absolute path inside the uploads dir (blocks path traversal). */
export function resolveUploadPath(filename: string) {
  const safeName = path.basename(filename);
  if (!safeName || safeName === "." || safeName === "..") {
    return null;
  }

  const uploadsDir = getUploadsDir();
  const fullPath = path.join(uploadsDir, safeName);
  if (!fullPath.startsWith(uploadsDir + path.sep) && fullPath !== uploadsDir) {
    return null;
  }

  return fullPath;
}

const fileUsageInclude = {
  certificates: { select: { id: true } },
  messageAttachments: { select: { id: true } },
  courseCovers: { select: { id: true } },
  userSignatures: { select: { id: true } },
  attachments: { select: { id: true } },
  userTestAnswers: { select: { id: true } },
} as const;

function hasFileRelations(file: {
  certificates: { id: number }[];
  messageAttachments: { id: number }[];
  courseCovers: { id: number }[];
  userSignatures: { id: number }[];
  attachments: { id: number }[];
  userTestAnswers: { id: number }[];
}) {
  return (
    file.certificates.length > 0 ||
    file.messageAttachments.length > 0 ||
    file.courseCovers.length > 0 ||
    file.userSignatures.length > 0 ||
    file.attachments.length > 0 ||
    file.userTestAnswers.length > 0
  );
}

/** Удаляет загруженный файл с диска и из БД (для картинок из markdown и т.п.). */
export async function deleteUploadedFileByFilename(
  rawFilename: string,
  actor: { id: number; role: Role },
  options: { lessonId?: number; courseId?: number } = {},
): Promise<void> {
  const filename = path.basename(decodeURIComponent(rawFilename));
  const filePath = resolveUploadPath(filename);
  if (!filePath) {
    throw new Error("Некорректное имя файла", { cause: "invalid" });
  }

  const file = await prisma.file.findFirst({
    where: { originalName: filename },
    include: fileUsageInclude,
  });
  if (!file) {
    throw new Error("Файл не найден", { cause: "not_found" });
  }

  if (hasFileRelations(file)) {
    throw new Error(
      "Файл используется (обложка, вложение, сертификат и т.п.) и не может быть удалён",
      { cause: "conflict" },
    );
  }

  const isUploader = file.uploadedBy === actor.id;
  let isStaff = actor.role === "admin";

  if (!isStaff && options.lessonId != null) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: options.lessonId },
      select: { coursePart: { select: { courseId: true } } },
    });
    if (!lesson) {
      throw new Error("Урок не найден", { cause: "not_found" });
    }
    isStaff = await isCourseStaff(
      lesson.coursePart.courseId,
      actor.id,
      actor.role,
    );
  }

  if (!isStaff && options.courseId != null) {
    isStaff = await isCourseStaff(options.courseId, actor.id, actor.role);
  }

  if (!isUploader && !isStaff) {
    throw new Error("Нет прав на удаление файла", { cause: "no_access" });
  }

  try {
    await fs.unlink(file.url);
  } catch (error) {
    if (
      !(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      )
    ) {
      throw error;
    }
  }

  await prisma.file.delete({ where: { id: file.id } });
}
