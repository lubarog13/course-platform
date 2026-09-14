import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

export default function NotFound({text, showHomeButton = true}: {text?: string, showHomeButton?: boolean}) {
    return <div className="flex flex-col items-center justify-center h-full container mx-auto px-4 pt-8 relative">
        <Image src="/images/404.png" alt="404" width={300} height={300} />
        <h1 className="text-4xl font-bold">404 - Страница не найдена</h1>
        <p className="text-lg mt-4">{text ?? "Данный раздел или страница не существует."}</p>
        {showHomeButton && (
            <Link href="/">
            <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                На главную
            </Button>
        </Link>
        )}
    </div>
}