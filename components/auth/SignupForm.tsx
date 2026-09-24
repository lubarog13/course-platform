"use client";

import { Input } from "@/components/ui/input";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { signUpSchema } from "@/app/lib/auth/form";
import { signUpAction } from "@/app/lib/auth/actions";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, type Ref } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Link, Loader2 } from "lucide-react";
import { IMaskMixin } from "react-imask";

/** IMask даёт inputRef — прокидываем в наш Input как ref */
const PhoneInput = IMaskMixin(({ inputRef, ...props }) => (
  <Input {...props} ref={inputRef as Ref<HTMLInputElement>} />
));
export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      surname: "",
      patronymic: null,
      phone: null,
    },
  });

  async function onSubmit(values: z.infer<typeof signUpSchema>) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signUpAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(params.get("next") ?? "/");
      router.refresh();
    } catch {
      setError("Не удалось зарегистрироваться");
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
        className="flex flex-col gap-4 w-full"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FieldGroup className="grid sm:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="name">
              Имя <span className="text-destructive">*</span>
            </FieldLabel>
            <Input id="name" type="text" autoComplete="given-name" {...form.register("name")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="surname">
              Фамилия <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="surname"
              type="text"
              autoComplete="family-name"
              {...form.register("surname")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="patronymic">Отчество</FieldLabel>
            <Input
              id="patronymic"
              type="text"
              autoComplete="additional-name"
              {...form.register("patronymic")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">Телефон</FieldLabel>
            <Controller
              name="phone"
              control={form.control}
              render={({ field }) => (
                <PhoneInput
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+7 (___) ___-__-__"
                  mask="+{7} (000) 000-00-00"
                  lazy={false}
                  unmask
                  // в форме храним +79991234567 (как в signUpSchema)
                  value={field.value?.replace(/^\+/, "") ?? ""}
                  onAccept={(value: string) => {
                    field.onChange(value ? `+${value}` : null);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  inputRef={field.ref}
                />
              )}
            />
            {form.formState.errors.phone && (
              <p className="text-destructive text-sm">{form.formState.errors.phone.message}</p>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="email">
              Email <span className="text-destructive">*</span>
            </FieldLabel>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">
              Пароль <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirmPassword">
              Подтверждение пароля <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
            />
          </Field>
        </FieldGroup>
        <div className="flex items-center gap-2">
          <Button disabled={isLoading} className="flex-1" type="submit">
            Зарегистрироваться {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          </Button>
          <Link href="/login" className="nowrap">
            Уже есть аккаунт? Войти
            <ArrowRight className="w-4 h-4" />  
          </Link>
        </div>
      </form>
    </>
  );
}
