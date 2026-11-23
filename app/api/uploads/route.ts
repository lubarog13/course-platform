import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { File as PrismaFile } from "@prisma/client";
import path from "path";
import { getUploadsDir, } from "@/app/lib/uploads";
import fs from "node:fs/promises";
import {auth} from "@/auth";
import { jsonError } from "@/app/lib/api";

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


function isAuthorizedCron(request: NextRequest): boolean {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) return false;
  
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${secret}`) return true;
  
    const cronHeader = request.headers.get("x-cron-secret");
    return cronHeader === secret;
  }
  


export async function POST(request: NextRequest) {
    const formData = await request.formData();
    const fileData = formData.get("file") as unknown as File;
    const usedInMarkdown = formData.get("used_in_markdown") === "true";
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
    const filename = `${crypto.randomUUID()}${extension? "." + extension : ""}`;
    const type = fileData.type || "application/octet-stream";

    const imagesDir = getUploadsDir();
    await fs.mkdir(imagesDir, { recursive: true });

    const buffer = Buffer.from(await fileData.arrayBuffer());
    await fs.writeFile(path.join(imagesDir, filename), buffer);
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
      }
      const currentUser = Number(session.user.id);
    const fileRecord = await prisma.file.create({
        data: {
            originalName: filename,
            url: path.join(imagesDir, filename),
            sizeBytes: fileData.size,
            mimeType: type,
            createdAt: new Date(),
            uploadedBy: currentUser,
            usedInMarkdown: usedInMarkdown,
        }
    });
    return NextResponse.json(fileRecord);
}

export async function DELETE(request: NextRequest) {
    if (!isAuthorizedCron(request)) {
        return jsonError("Не авторизован", 401);
      }

    const files = await prisma.file.findMany({
        where: {
            createdAt: {
                lt: new Date(Date.now() - 1000 * 60 * 60 * 24),
            },
            usedInMarkdown: false,
        },
        include: {
            certificates: {
                select: {
                    id: true,
                }
            },
            messageAttachments: {
                select: {
                    id: true,
                }
            },
            courseCovers: {
                select: {
                    id: true,
                }
            },
            userSignatures: {
                select: {
                    id: true,
                }
            },
            attachments: {
                select: {
                    id: true,
                }
            },
            userTestAnswers: {
                select: {
                    id: true,
                }
            },
        }
        
    });
    for (const file of files) {
        if (file.certificates.length === 0 && file.messageAttachments.length === 0 && file.courseCovers.length === 0 && file.userSignatures.length === 0 && file.attachments.length === 0 && file.userTestAnswers.length === 0) {
            await fs.unlink(file.url);
            await prisma.file.delete({
                where: {
                    id: file.id,
                }
            });
        }
    }
    return NextResponse.json({ message: "Файлы удалены" });
}