import { auth } from "@/auth";
import { type NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/lib/courses";
import { prisma } from "@/app/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Не авторизован", 401);
  }

  const { id } = await params;
  const fileId = Number(id);
  if (!Number.isFinite(fileId) || fileId < 1) {
    return jsonError("Некорректный id файла", 400);
  }

  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    return jsonError("Файл не найден", 404);
  }

  return NextResponse.json(file);
}
