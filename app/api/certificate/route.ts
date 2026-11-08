import { NextRequest } from "next/server";
import { jsonError } from "@/app/lib/courses";
import { auth } from "@/auth";
import { generateCertificate } from "@/app/lib/certificate";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return jsonError("Не авторизован", 401);
    }
    // ToDo - добавить проверку, что пользователь закончил курс
    const { courseId, userId } = await request.json();
    if (typeof courseId !== "number" || typeof userId !== "number") {
        return jsonError("Некорректные данные", 400);
    }
    try {
        const certificate = await generateCertificate(courseId, userId);
        return NextResponse.json(certificate);
    } catch (error) {
        console.error(error);
        if (error instanceof Error && error.cause === "not_found") {
            return jsonError("Курс или пользователь не найден", 400);
        }
        if (error instanceof Error && error.cause === "generate") {
            return jsonError("Ошибка при генерации сертификата", 500);
        }
        return jsonError("Ошибка при генерации сертификата", 500);
    }
}