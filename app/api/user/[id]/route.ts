import { auth } from "@/auth";
import { type NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/lib/courses";
import { prisma } from "@/app/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
        return jsonError("Не авторизован", 401);
    }
    if (session.user.id !== id) {
        return jsonError("Не авторизован", 401);
    }
    const user = await prisma.user.findUnique({
        where: {
            id: Number(id),
        },
    });
    if (!user) {
        return jsonError("Пользователь не найден", 404);
    }
    return NextResponse.json(user);
  }