import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { File as PrismaFile } from "@prisma/client";
import path from "path";
import { getUploadsDir, } from "@/app/lib/uploads";
import fs from "node:fs/promises";

// Возможные MIME-типы файлов для File (js):
const FILE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/x-flv",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/x-tar",
  "application/gzip",
  "application/x-bzip2",
  "text/plain",
  "text/csv",
  "text/tab-separated-values",
  "application/json",
  "application/xml",
  "text/html",
  "text/css",
  "application/javascript",
];
const videoTypes = [
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-ms-wmv",
    "video/x-flv",
    "video/webm",
];


export async function POST(request: NextRequest) {
    const formData = await request.formData();
    const fileData = formData.get("file") as unknown as File;
    if (!fileData) {
        return NextResponse.json({ error: "Не загружен файл" }, { status: 400 });
    }
    if (!FILE_MIME_TYPES.includes(fileData.type)) {
        return NextResponse.json({ error: "Неизвестный тип файла" }, { status: 400 });
    }
    if (!videoTypes.includes(fileData.type) && fileData.size > 1024 * 1024 * 10) {
        return NextResponse.json({ error: "Размер файла превышает 10 МБ" }, { status: 400 });
    } else if (videoTypes.includes(fileData.type) && fileData.size > 1024 * 1024 * 100) {
        return NextResponse.json({ error: "Размер файла превышает 100 МБ" }, { status: 400 });
    }
    const extension = fileData.name.split(".").pop();
    const filename = `${crypto.randomUUID()}${extension || ""}`;
    const type = fileData.type || "application/octet-stream";

    const imagesDir = getUploadsDir();
    await fs.mkdir(imagesDir, { recursive: true });

    const buffer = Buffer.from(await fileData.arrayBuffer());
    await fs.writeFile(path.join(imagesDir, filename), buffer);

    // TODO: get current user id
    const currentUser = 1;
    const fileRecord = await prisma.file.create({
        data: {
            originalName: filename + "." + extension,
            url: path.join(imagesDir, filename),
            sizeBytes: fileData.size,
            mimeType: type,
            createdAt: new Date(),
            uploadedBy: currentUser,
        }
    });
    return NextResponse.json(fileRecord);
}
