import { type NextRequest, NextResponse } from "next/server";

import { jsonError, parseNumericId, prismaErrorResponse } from "@/app/lib/api";
import {
  findCoursePart,
  parseCoursePartBody,
} from "@/app/lib/courseParts";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const showDeleted = _request.nextUrl.searchParams.get("showDeleted") === "true";
    const showDrafts = _request.nextUrl.searchParams.get("showDrafts") === "true";
    const part = await findCoursePart(parseNumericId(id), showDeleted, showDrafts);
    if (!part) {
      return jsonError("Часть курса не найдена", 404);
    }
    return NextResponse.json(part);
  } catch (error) {
    return prismaErrorResponse(error, "Часть курса");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const partId = parseNumericId(id);
    const existing = await findCoursePart(partId);
    if (!existing) {
      return jsonError("Часть курса не найдена", 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Некорректный JSON", 400);
    }

    const data = parseCoursePartBody(body, "update");
    await prisma.coursePart.update({
      where: { id: partId },
      data,
    });

    const full = await findCoursePart(partId);
    return NextResponse.json(full);
  } catch (error) {
    return prismaErrorResponse(error, "Часть курса");
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return PATCH(request, context);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const partId = parseNumericId(id);
    const existing = await findCoursePart(partId);
    if (!existing) {
      return jsonError("Часть курса не найдена", 404);
    }

    await prisma.coursePart.update({
      where: { id: partId },
      data: { deletedAt: new Date() },
    });
    await prisma.lesson.updateMany({
      where: { coursePartId: partId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    const full = await findCoursePart(partId);
    return NextResponse.json(full ?? { id: partId, deletedAt: new Date() });
  } catch (error) {
    return prismaErrorResponse(error, "Часть курса");
  }
}
