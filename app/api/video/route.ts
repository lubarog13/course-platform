import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/lib/courses";
import { findVideo, parseVideoBody } from "@/app/lib/lessons";
import { prisma } from "@/app/lib/prisma";
import { prismaErrorResponse } from "@/app/lib/courses";

export async function POST(request: NextRequest) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Некорректный JSON", 400);
    }
  
    try {
      const data = parseVideoBody(body, "create");
      if (!data.url || !data.platform) {
        return jsonError("Нужны url и platform", 400);
      }
  
      const video = await prisma.video.create({
        data: {
            url: data.url,
            platform: data.platform,
            durationSeconds: data.durationSeconds,
            thumbnailUrl: data.thumbnailUrl,
        },
      });
  
      const full = await findVideo(video.id);
      return NextResponse.json(full, { status: 201 });
    } catch (error) {
      return prismaErrorResponse(error);
    }
  }