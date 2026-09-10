import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Необходимо передать slug категории" }, { status: 400 });
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