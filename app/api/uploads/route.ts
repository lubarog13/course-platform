import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { File as PrismaFile } from "@prisma/client";
import path from "path";
import { getUploadsDir, } from "@/app/lib/uploads";
import fs from "node:fs/promises";


export async function POST(request: NextRequest) {
    const formData = await request.formData();
    const fileData = formData.get("file") as unknown as File;
    if (!fileData) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
