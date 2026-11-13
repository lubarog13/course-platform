import { NextRequest } from "next/server";
import { jsonError } from "@/app/lib/courses";
import { auth } from "@/auth";
import { generateCertificate, getCertificates } from "@/app/lib/certificate";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return jsonError("Не авторизован", 401);
    }
    const { courseId, userId } = await request.json();
    if (typeof courseId !== "number" || typeof userId !== "number") {
        return jsonError("Некорректные данные", 400);
    }
    if (Number(session.user.id) !== userId && session.user.role !== "admin") {
        return jsonError("Нет доступа к генерации сертификата", 403);
    }
    try {
        const certificate = await generateCertificate(courseId, userId);
        return NextResponse.json(certificate);
    } catch (error) {
        console.error(error);
        if (error instanceof Error && error.cause === "not_found") {
            return jsonError(error.message || "Курс или пользователь не найден", 404);
        }
        if (error instanceof Error && error.cause === "no_access") {
            return jsonError(error.message, 403);
        }
        if (error instanceof Error && error.cause === "generate") {
            return jsonError("Ошибка при генерации сертификата", 500);
        }
        return jsonError("Ошибка при генерации сертификата", 500);
    }
}


export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return jsonError("Не авторизован", 401);
    }
    try {
        const certificates = await getCertificates(Number(session.user.id));
        return NextResponse.json(certificates);
    } catch (error) {
        console.error(error);
        return jsonError("Ошибка при получении сертификатов", 500);
    }
}