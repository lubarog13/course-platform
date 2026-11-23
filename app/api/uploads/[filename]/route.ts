import { NextResponse, type NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

import { auth } from "@/auth";
import { jsonError } from "@/app/lib/api";
import {
  deleteUploadedFileByFilename,
  resolveUploadPath,
} from "@/app/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-ms-wmv",
  ".flv": "video/x-flv",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".7z": "application/x-7z-compressed",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
  ".bz2": "application/x-bzip2",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".json": "application/json",
  ".xml": "application/xml",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
};

type RouteContext = { params: Promise<{ filename: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { filename: rawFilename } = await context.params;
    const filename = decodeURIComponent(rawFilename);
    const filePath = resolveUploadPath(filename);

    if (!filePath) {
      return NextResponse.json({ error: "Не найден файл" }, { status: 400 });
    }

    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    }

    console.error("Failed to serve upload:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить файл" },
      { status: 500 },
    );
  }
}

/**
 * Удаление файла (диск + БД). Query: lessonId / courseId — для проверки staff.
 * Вызывается из редактора при удалении картинки из markdown.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Не авторизован", 401);
  }
  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    return jsonError("Нет прав", 403);
  }

  const { filename } = await context.params;
  const lessonIdRaw = request.nextUrl.searchParams.get("lessonId");
  const courseIdRaw = request.nextUrl.searchParams.get("courseId");
  const lessonId =
    lessonIdRaw && /^\d+$/.test(lessonIdRaw) ? Number(lessonIdRaw) : undefined;
  const courseId =
    courseIdRaw && /^\d+$/.test(courseIdRaw) ? Number(courseIdRaw) : undefined;

  try {
    await deleteUploadedFileByFilename(
      filename,
      { id: Number(session.user.id), role: session.user.role },
      { lessonId, courseId },
    );
    return NextResponse.json({ message: "Файл удалён" });
  } catch (error) {
    if (error instanceof Error) {
      if (error.cause === "invalid") return jsonError(error.message, 400);
      if (error.cause === "not_found") return jsonError(error.message, 404);
      if (error.cause === "no_access") return jsonError(error.message, 403);
      if (error.cause === "conflict") return jsonError(error.message, 409);
    }
    console.error("DELETE /api/uploads/[filename]:", error);
    return jsonError("Не удалось удалить файл", 500);
  }
}
