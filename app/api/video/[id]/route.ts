import { type NextRequest, NextResponse } from "next/server";

import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import { findVideo, parseVideoBody } from "@/app/lib/lessons";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const videoId = parseNumericId(id);
    const existing = await findVideo(videoId);
    if (!existing) {
      return jsonError("Видео не найдено", 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Некорректный JSON", 400);
    }

    const data = parseVideoBody(body, "update");
    await prisma.video.update({
      where: { id: videoId },
      data,
    });

    const full = await findVideo(videoId);
    return NextResponse.json(full);
  } catch (error) {
    return prismaErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return PATCH(request, context);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const videoId = parseNumericId(id);
    const existing = await findVideo(videoId);
    if (!existing) {
      return jsonError("Видео не найдено", 404);
    }

    await prisma.video.update({
      where: { id: videoId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ id: videoId, deletedAt: new Date() });
  } catch (error) {
    return prismaErrorResponse(error);
  }
}
