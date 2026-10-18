import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, LogIn, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { signIn } from "next-auth/react";

export default function ErrorView({title, text, type = "error", showReloadButton = true, showBackButton = true, showLoginButton = true}: {title?: string, text?: string, type?: "error" | "access_denied", showReloadButton?: boolean, showBackButton?: boolean, showLoginButton?: boolean}) {
    return <div className="flex flex-col items-center justify-center h-full min-h-screen container mx-auto px-4 pt-8 relative">
        <Image src={type === "access_denied" ? "/images/access_denied.png" : "/images/error.png"} alt={type === "access_denied" ? "Доступ запрещен" : "Ошибка"} width={300} height={300} />
        <h1 className="text-4xl font-bold">{title ?? "Произошла ошибка"}</h1>
        <p className="text-lg mt-4">{text ?? "Пожалуйста, попробуйте позже."}</p>
        <div className="flex flex-row gap-4 mt-4">
        {showReloadButton && (
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                Обновить страницу
            </Button>
        )}
        {showBackButton && (
            <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
            </Button>
        )}
        {showLoginButton && (
            <Button variant="outline" className="mt-4" onClick={() => signIn("credentials")}>
                <LogIn className="w-4 h-4 mr-2" />
                Войти
            </Button>
        )}
        </div>
    </div>
}