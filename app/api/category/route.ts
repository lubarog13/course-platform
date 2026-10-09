import { type NextRequest, NextResponse } from "next/server";

import { jsonError, prismaErrorResponse } from "@/app/lib/api";
import { slugify } from "@/app/lib/courses";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json(
      { error: "Необходимо передать slug категории" },
      { status: 400 },
    );
  }
  const category = await prisma.category.findUnique({
    where: {
      slug: slug,
    },
  });
  if (!category) {
    return NextResponse.json({ error: "Нет такой категории" }, { status: 404 });
  }
  return NextResponse.json(category);
}

/** POST /api/category — создать категорию { name, slug? } */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Не авторизован", 401);
  }
  if (session.user.role !== "teacher" && session.user.role !== "admin") {
    return jsonError("Нет прав на создание категории", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный JSON", 400);
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Ожидается JSON-объект", 400);
  }

  const raw = body as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) {
    return jsonError("Поле name обязательно", 400);
  }

  const slugInput =
    typeof raw.slug === "string" && raw.slug.trim()
      ? raw.slug.trim().toLowerCase()
      : slugify(name);
  if (!slugInput) {
    return jsonError("Не удалось сформировать slug", 400);
  }

  try {
    const existing = await prisma.category.findUnique({ where: { slug: slugInput } });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: slugInput,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Категория");
  }
}
