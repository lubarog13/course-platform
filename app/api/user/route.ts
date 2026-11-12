import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { jsonError } from "@/app/lib/courses";
import { prisma } from "@/app/lib/prisma";
import { signUpAction } from "@/app/lib/auth/actions";

export const dynamic = "force-dynamic";

/** Список пользователей (для выбора соавторов — role=teacher). */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return jsonError("Не авторизован", 401);
  }
  if (session.user.role !== "teacher" && session.user.role !== "admin") {
    return jsonError("Нет прав", 403);
  }

  const role = request.nextUrl.searchParams.get("role");

  const users = await prisma.user.findMany({
    where:
      role === "teacher"
        ? { role: { in: ["teacher", "admin"] }, deletedAt: null }
        : { deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      surname: true,
      patronymic: true,
      role: true,
      phone: true,
      signatureId: true,
    },
    orderBy: [{ surname: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await signUpAction(body);
  return NextResponse.json(result);
}
