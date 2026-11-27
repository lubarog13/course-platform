import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomeCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="rounded-2xl bg-[#10375d] px-6 py-12 text-center text-white sm:px-12">
        <h2 className="font-lora text-2xl font-semibold sm:text-3xl">
          Завершите курс — получите сертификат
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-white/85">
          Учитесь онлайн и подтверждайте знания официальным сертификатом
          платформы «Библейские курсы».
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/courses">
            <Button className="rounded-full bg-yellow-500 px-6 py-6 text-base font-medium text-white hover:bg-yellow-600">
              Смотреть курсы <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/register">
            <Button
              variant="outline"
              className="rounded-full border-white/40 bg-transparent px-6 py-6 text-base text-white hover:bg-white/10 hover:text-white"
            >
              Зарегистрироваться
            </Button>
          </Link>
        </div>
        <Link
          href="/about"
          className="mt-6 inline-block text-sm text-white/70 underline-offset-4 hover:text-white hover:underline"
        >
          О проекте
        </Link>
      </div>
    </section>
  );
}
