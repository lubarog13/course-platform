"use client";

import { Input } from "@/components/ui/input";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { signInSchema } from "@/app/lib/auth/form";
import { loginAction } from "@/app/lib/auth/actions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogInIcon } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
    try {
      const result = await loginAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(params.get("next") ?? "/");
      router.refresh();
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {error && (
        <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <form
        className="flex flex-col gap-4 w-full max-w-md"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
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
        <div className="flex flex-col gap-3 align-center flex-wrap">
        <Button disabled={isLoading} type="submit" className="min-h-10">
          Войти {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        </Button>
        <Link href="/register" className="text-sm text-gray-500">
          Нет аккаунта? <span className="text-gray-800 dark:text-gray-200 text-md">Зарегистрироваться</span>
        </Link>
        <Link href="/forgot-password" className="text-sm text-gray-500">
          Забыли пароль? <span className="text-gray-800 dark:text-gray-200 text-md">Восстановить</span>
        </Link>
        </div>
      </form>
    </>
  );
}
