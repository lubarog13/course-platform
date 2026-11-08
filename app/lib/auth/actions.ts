"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { signInSchema } from "@/app/lib/auth/form";
import { Prisma, User } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { UserDetails } from "@/app/lib/models";
import { hashPassword, verifyPassword } from "@/app/lib/auth/password";
import { sendEmailVerification } from "@/app/lib/auth/email-verification";
export type SignUpParams = {
  email: string;
  password: string;
  name: string;
  surname: string;
  patronymic: string | null;
  phone: string | null;
  acceptEmailNotifications: boolean;
  acceptEmailPromotions: boolean;
};

export type UpdateUserParams = {
  id: number;
  email: string;
  name: string;
  surname: string;
  patronymic: string | null;
  phone: string | null;
  userDetails: UserDetails | undefined;
  role: "student" | "teacher" | "admin";
  acceptEmailNotifications: boolean;
  acceptEmailPromotions: boolean;
  signatureId: number | null;
};

export type AgreementParams = {
  userId: number;
  acceptEmailNotifications: boolean;
  acceptEmailPromotions: boolean;
};

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<
  | { ok: true }
  | { ok: false; error: string; code?: "email_not_verified" }
> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Неверный email или пароль" };
  }

  const user = await prisma.user.findFirst({
    where: { email: parsed.data.email, deletedAt: null },
  });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { ok: false, error: "Неверный email или пароль" };
  }
  if (!user.emailVerifiedAt) {
    return {
      ok: false,
      code: "email_not_verified",
      error:
        "Подтвердите email по ссылке из письма. Без этого вход недоступен.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Неверный email или пароль" };
    }
    throw error;
  }
}

export async function logoutAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await signOut();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: "Не удалось выйти" };
  }
}

export async function signUpAction(params: SignUpParams): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const hashedPassword = hashPassword(params.password); 
    const userData: Prisma.UserCreateInput = {
      email: params.email,
      passwordHash: hashedPassword,
      name: params.name,
      surname: params.surname,
      patronymic: params.patronymic,
      phone: params.phone,
      userDetails: {},
      role: "student",
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const user = await prisma.user.create({
      data: userData as Prisma.UserCreateInput,
    });
    await prisma.agreement.create({
      data: {
        userId: user.id,
        accept_email_notifications: params.acceptEmailNotifications,
        accept_email_promotions: params.acceptEmailPromotions,
      },
    });

    const emailResult = await sendEmailVerification({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    if (!emailResult.ok) {
      console.error(
        "Не удалось отправить письмо подтверждения:",
        emailResult.error,
      );
      return {
        ok: false,
        error:
          "Аккаунт создан, но письмо не отправилось. Войдите и запросите письмо снова.",
      };
    }

    // Вход только после подтверждения почты
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { ok: false, error: "Пользователь с таким email уже существует" };
      } else {
        return { ok: false, error: "Не удалось зарегистрироваться" };
      }
    }
    throw error;
  }
}

/** Повторная отправка: email + пароль (сессии ещё нет). */
export async function resendEmailVerificationAction(input: {
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Неверный email или пароль" };
  }

  const user = await prisma.user.findFirst({
    where: { email: parsed.data.email, deletedAt: null },
  });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { ok: false, error: "Неверный email или пароль" };
  }
  if (user.emailVerifiedAt) {
    return { ok: false, error: "Почта уже подтверждена — можно войти" };
  }

  return sendEmailVerification({
    id: user.id,
    email: user.email,
    name: user.name,
  });
}

export async function updateUserAction(params: UpdateUserParams): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    type UserData = Omit<UpdateUserParams, "acceptEmailNotifications" | "acceptEmailPromotions">;
    const userData: UserData = {
      id: params.id,
      email: params.email,
      name: params.name,
      surname: params.surname,
      patronymic: params.patronymic,
      phone: params.phone,
      userDetails: params.userDetails,
      role: params.role,
      signatureId: params.signatureId,
    };
    const user = await prisma.user.update({
      where: { id: params.id },
      data: userData,
    });
    await updateAgreementAction({
      userId: user.id,
      acceptEmailNotifications: params.acceptEmailNotifications,
      acceptEmailPromotions: params.acceptEmailPromotions,
    });
    return { ok: true };
  } catch (error) {
    throw error;
  }
}

export async function updateAgreementAction(params: AgreementParams): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    let agreement = await prisma.agreement.findUnique({
      where: { userId: params.userId },
    });
    if (!agreement) {
      agreement = await prisma.agreement.create({
        data: {
          userId: params.userId,
          accept_email_notifications: params.acceptEmailNotifications,
          accept_email_promotions: params.acceptEmailPromotions,
        },
      });
    } else {
      agreement = await prisma.agreement.update({
        where: { userId: params.userId },
        data: {
          accept_email_notifications: params.acceptEmailNotifications,
          accept_email_promotions: params.acceptEmailPromotions,
          updatedAt: new Date(),
        },
      });
    }
    return { ok: true };
  } catch (error) {
    throw error;
  }
}