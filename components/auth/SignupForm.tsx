"use client";

import { Input } from "@/components/ui/input";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { signUpSchema } from "@/app/lib/auth/form";
import { signUpAction, updateUserAction } from "@/app/lib/auth/actions";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, type Ref } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Link, Loader2 } from "lucide-react";
import { IMaskMixin } from "react-imask";
import {User} from '@prisma/client'
import { UserDetails } from "@/app/lib/models";
import { useSession } from "next-auth/react";
import { toast } from "../ui/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
/** IMask даёт inputRef — прокидываем в наш Input как ref */
const PhoneInput = IMaskMixin(({ inputRef, ...props }) => (
  <Input {...props} ref={inputRef as Ref<HTMLInputElement>} />
));
export function SignupForm({editMode = false, user}: {editMode: boolean, user?: User}) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, } = useSession()
  const userRole = session?.user?.role
  const adminEdit = userRole === "admin"
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: user?.email ?? "",
      password: user?.passwordHash ?? "",
      confirmPassword: user?.passwordHash ?? "",
      name: user?.name ?? "",
      surname: user?.surname ?? "",
      patronymic: user?.patronymic ?? null,
      phone: null,
      userDetails: user?.userDetails as UserDetails | null,
      role: user?.role ?? "student",
    },
  });

  async function onSubmit(values: z.infer<typeof signUpSchema>) {
    setIsLoading(true);
    setError(null);
    try {
      const result = editMode ? await updateUserAction({
        id: user?.id ?? 0,
        email: values.email,
        name: values.name,
        surname: values.surname,
        patronymic: values.patronymic,
        phone: values.phone,
        userDetails: values.userDetails as UserDetails | undefined,
        role: values.role as "student" | "teacher" | "admin",
      }) : await signUpAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (editMode) {
        toast.add({
          description: "Пользователь успешно обновлен",
          type: "success",
        });
      } else {
        toast.add({
          description: "Пользователь успешно зарегистрирован",
          type: "success",
        });
      }
      if (!editMode) {
        router.push(params.get("next") ?? "/");
        router.refresh();
      }
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
            <Input disabled={editMode} id="email" type="email" autoComplete="email" {...form.register("email")} />
          </Field>
          {!editMode && (
            <>
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
          </>
          )}
          {editMode && adminEdit && (
            <>
            <Field>
              <FieldLabel htmlFor="role">Роль</FieldLabel>
              <Select id="role" value={form.getValues("role")} onValueChange={(value) => form.setValue("role", value as "student" | "teacher" | "admin")}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Студент</SelectItem>
                  <SelectItem value="teacher">Преподаватель</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>  
                </SelectContent>
              </Select>
            </Field>
            <h2>Доп. информация</h2>
            <Field>
              <FieldLabel htmlFor="position">Должность</FieldLabel>
              <Input id="position" type="text" {...form.register("userDetails.position")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="achievements">Достижения</FieldLabel>
              <Input id="achievements" type="text" {...form.register("userDetails.achievements")} />
            </Field>
            </>
          )}
        </FieldGroup>
        {editMode? (
          <div className="flex flex-col gap-2 align-center flex-wrap">
            <Button disabled={isLoading} className="min-h-10" type="submit">
              Сохранить {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            </Button>
          </div>
        ) : (
        <div className="flex flex-col gap-2 align-center flex-wrap">
          <Button disabled={isLoading} className="min-h-10" type="submit">
            Зарегистрироваться {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          </Button>
          <Link href="/login" className="text-sm text-gray-500">
            Уже есть аккаунт? <span className="text-gray-800 dark:text-gray-200 text-lg">Войти</span>
          </Link>
        </div>
        )}
      </form>
    </>
  );
}
