import Link from "next/link";
import { confirmEmailVerification } from "@/app/lib/auth/email-verification";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <VerifyResult
        title="Нет токена"
        description="В ссылке отсутствует параметр подтверждения. Запросите письмо ещё раз."
        ok={false}
      />
    );
  }

  const result = await confirmEmailVerification(token);

  if (!result.ok) {
    return (
      <VerifyResult
        title="Не удалось подтвердить"
        description={result.error}
        ok={false}
      />
    );
  }

  return (
    <VerifyResult
      title={
        result.alreadyVerified
          ? "Почта уже подтверждена"
          : "Почта подтверждена"
      }
      description={
        result.alreadyVerified
          ? "Этот адрес уже был подтверждён ранее. Можно войти в аккаунт."
          : "Спасибо! Адрес электронной почты успешно подтверждён."
      }
      ok
    />
  );
}

function VerifyResult({
  title,
  description,
  ok,
}: {
  title: string;
  description: string;
  ok: boolean;
}) {
  return (
    <div className="mx-auto flex h-screen w-full max-w-md flex-col items-center justify-center px-4">
      <h1 className="w-full text-2xl font-bold">{title}</h1>
      <p className="mb-6 w-full text-sm text-muted-foreground">{description}</p>
      <div className="flex w-full gap-3">
        <Link href="/login" className={cn(buttonVariants())}>
          Войти
        </Link>
        {!ok ? (
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            На главную
          </Link>
        ) : null}
      </div>
    </div>
  );
}
