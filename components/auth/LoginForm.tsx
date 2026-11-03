"use client";

import { Input } from "@/components/ui/input";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { signInSchema } from "@/app/lib/auth/form";
import {
  loginAction,
  resendEmailVerificationAction,
} from "@/app/lib/auth/actions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "@/components/ui/toast";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { update } = useSession();
  const [error, setError] = useState<string | null>(
    params.get("registered") === "1"
      ? "Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите."
      : null,
  );
  const [needsVerification, setNeedsVerification] = useState(
    params.get("registered") === "1",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof signInSchema>) {
    setIsLoading(true);
    setError(null);
    setNeedsVerification(false);
    try {
      const result = await loginAction(values);
      if (!result.ok) {
        setError(result.error);
        if (result.code === "email_not_verified") {
          setNeedsVerification(true);
        }
        return;
      }
      await update();
      router.push(params.get("next") ?? "/");
      router.refresh();
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setIsLoading(false);
    }
  }

  async function onResend() {
    const values = form.getValues();
    const parsed = signInSchema.safeParse(values);
    if (!parsed.success) {
      setError("Введите email и пароль, чтобы отправить письмо снова");
      return;
    }
    setIsResending(true);
    try {
      const result = await resendEmailVerificationAction(parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.add({
        description: "Письмо отправлено повторно. Проверьте почту.",
        type: "success",
      });
      setError("Письмо отправлено. Перейдите по ссылке из письма.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <>
      {error && (
        <p
          className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
            needsVerification
              ? "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-100"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {error}
        </p>
      )}
      <form
        className="flex w-full max-w-md flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Пароль</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
          </Field>
        </FieldGroup>
        <div className="align-center flex flex-col flex-wrap gap-3">
          <Button disabled={isLoading} type="submit" className="min-h-10">
            Войти{" "}
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          </Button>
          {needsVerification ? (
            <Button
              type="button"
              variant="outline"
              disabled={isResending}
              className="min-h-10"
              onClick={onResend}
            >
              Отправить письмо снова{" "}
              {isResending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
            </Button>
          ) : null}
          <Link href="/register" className="text-sm text-gray-500">
            Нет аккаунта?{" "}
            <span className="text-md text-gray-800 dark:text-gray-200">
              Зарегистрироваться
            </span>
          </Link>
          <Link href="/forgot-password" className="text-sm text-gray-500">
            Забыли пароль?{" "}
            <span className="text-md text-gray-800 dark:text-gray-200">
              Восстановить
            </span>
          </Link>
        </div>
      </form>
    </>
  );
}
