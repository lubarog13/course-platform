"use client";

import { Input } from "@/components/ui/input";
import { FieldGroup, Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { signUpSchema } from "@/app/lib/auth/form";
import { signUpAction, updateUserAction } from "@/app/lib/auth/actions";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, type Ref } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { IMaskMixin } from "react-imask";
import Link from "next/link";
import { User } from "@prisma/client";
import { UserDetails, UserWithAgreement } from "@/app/lib/models";
import { useSession } from "next-auth/react";
import { toast } from "../ui/toast";
import FileUploader from "../base/FileUploader";
import { File as FileModel } from "@/app/lib/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "../ui/switch";


/** IMask даёт inputRef — прокидываем в наш Input как ref */
const PhoneInput = IMaskMixin(({ inputRef, ...props }) => (
  <Input {...props} ref={inputRef as Ref<HTMLInputElement>} />
));

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-sm">{message}</p>;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  // только код страны / пустое — считаем, что телефон не указан
  if (!digits || digits === "7") return null;
  return `+${digits}`;
}

export function SignupForm({
  editMode = false,
  user,
}: {
  editMode: boolean;
  user?: UserWithAgreement;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const adminEdit = userRole === "admin";
  const teacherEdit = userRole === "teacher";
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: user?.email ?? "",
      // в режиме редактирования пароль не меняется — подставляем валидный placeholder
      password: editMode ? "Password1" : "",
      confirmPassword: editMode ? "Password1" : "",
      name: user?.name ?? "",
      surname: user?.surname ?? "",
      patronymic: user?.patronymic ?? null,
      phone: user?.phone ?? null,
      userDetails: (user?.userDetails as UserDetails | null) ?? null,
      role: user?.role ?? "student",
      acceptEmailNotifications: user?.agreement.accept_email_notifications ?? true,
      acceptEmailPromotions: user?.agreement.accept_email_promotions ?? true,
      signatureId: user?.signatureId ?? null,
    },
  });

  async function onSubmit(values: z.infer<typeof signUpSchema>) {
    setIsLoading(true);
    setError(null);
    try {
      const result = editMode
        ? await updateUserAction({
            id: user?.id ?? 0,
            email: values.email,
            name: values.name,
            surname: values.surname,
            patronymic: values.patronymic,
            phone: values.phone,
            userDetails: values.userDetails as UserDetails | undefined,
            role: values.role as "student" | "teacher" | "admin",
            acceptEmailNotifications: values.acceptEmailNotifications,
            acceptEmailPromotions: values.acceptEmailPromotions,
            signatureId: values.signatureId ?? null,
          })
        : await signUpAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.add({
        description: editMode
          ? "Пользователь успешно обновлен"
          : "Аккаунт создан. Подтвердите email — без этого вход недоступен.",
        type: "success",
      });
      if (!editMode) {
        router.push("/login?registered=1");
        router.refresh();
      }
    } catch {
      setError(
        editMode
          ? "Не удалось сохранить изменения"
          : "Не удалось зарегистрироваться",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const errors = form.formState.errors;

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
        noValidate
      >
        <FieldGroup className="grid sm:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="name">
              Имя <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="name"
              type="text"
              autoComplete="given-name"
              {...form.register("name")}
            />
            <FieldError message={errors.name?.message} />
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
            <FieldError message={errors.surname?.message} />
          </Field>
          <Field>
            <FieldLabel htmlFor="patronymic">Отчество</FieldLabel>
            <Input
              id="patronymic"
              type="text"
              autoComplete="additional-name"
              {...form.register("patronymic")}
            />
            <FieldError message={errors.patronymic?.message} />
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
                  lazy
                  unmask
                  value={field.value?.replace(/^\+/, "") ?? ""}
                  onAccept={(value: string) => {
                    field.onChange(normalizePhone(value));
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  inputRef={field.ref}
                />
              )}
            />
            <FieldError message={errors.phone?.message} />
          </Field>
          {editMode && (adminEdit || teacherEdit) && (
        <Field>
          <FieldLabel>Подпись для сертификата</FieldLabel>
          <FieldDescription>Прикрепите файл с подписью в формате svg. Если вы не хотите использовать подпись, оставьте поле пустым, тогда будет использоваться стандартная подпись платформы.</FieldDescription>
          <FileUploader
            onUploaded={(files: FileModel[]) => {
              form.setValue("signatureId", files[0]?.id ?? null);
            }}
            accept={{
              "image/svg+xml": [".svg"],
            }}
          />
        </Field>
      )}
          <Field>
            <FieldLabel htmlFor="email">
              Email <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              disabled={editMode}
              id="email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
            <FieldError message={errors.email?.message} />
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
                <FieldError message={errors.password?.message} />
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
                <FieldError message={errors.confirmPassword?.message} />
              </Field>
            </>
          )}
          <Field className="sm:col-span-2 flex items-center gap-2 flex-row-reverse">
                <FieldLabel htmlFor="acceptEmailNotifications">
                  Я согласен на получение email уведомлений
                </FieldLabel>
                  <Switch
                  id="acceptEmailNotifications"
                  checked={form.watch("acceptEmailNotifications")}
                  onCheckedChange={(checked) =>
                    form.setValue("acceptEmailNotifications", checked)
                  }
                />
              </Field>
              <Field className="sm:col-span-2 flex items-center gap-2 flex-row-reverse">
                <FieldLabel htmlFor="acceptEmailPromotions">
                  Я согласен на получение рассылки с новостями платформы
                </FieldLabel>
                <Switch
                  id="acceptEmailPromotions"
                  checked={form.watch("acceptEmailPromotions")}
                  onCheckedChange={(checked) =>
                    form.setValue("acceptEmailPromotions", checked)
                  }
                />
              </Field>
          {editMode && adminEdit && (
            <>
              <Field>
                <FieldLabel htmlFor="role">Роль</FieldLabel>
                <Select
                  value={form.watch("role")}
                  onValueChange={(value) =>
                    form.setValue(
                      "role",
                      value as "student" | "teacher" | "admin",
                    )
                  }
                >
                  <SelectTrigger id="role">
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
                <Input
                  id="position"
                  type="text"
                  {...form.register("userDetails.position")}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="achievements">Достижения</FieldLabel>
                <Input
                  id="achievements"
                  type="text"
                  {...form.register("userDetails.achievements")}
                />
              </Field>
            </>
          )}
        </FieldGroup>
        {editMode ? (
          <div className="flex flex-col gap-2 align-center flex-wrap">
            <Button disabled={isLoading} className="min-h-10" type="submit">
              Сохранить{" "}
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 align-center flex-wrap">
            <Button disabled={isLoading} className="min-h-10" type="submit">
              Зарегистрироваться{" "}
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            </Button>
            <Link
              href="/login"
              className="cursor-pointer flex items-center gap-2 text-sm text-gray-500"
            >
              Уже есть аккаунт?{" "}
              <span className="text-gray-800 dark:text-gray-200 text-lg">
                Войти
              </span>
            </Link>
          </div>
        )}
      </form>
    </>
  );
}
