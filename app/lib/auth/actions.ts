"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { signInSchema } from "@/app/lib/auth/form";
import { Prisma, User } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { hashPassword } from "@/app/lib/auth/password";
export type SignUpParams = {
  email: string;
  password: string;
  name: string;
  surname: string;
  patronymic: string | null;
  phone: string | null;
};

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Неверный email или пароль" };
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
    await signIn("credentials", {
      email: params.email,
      password: params.password,
      redirect: false,
    });
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