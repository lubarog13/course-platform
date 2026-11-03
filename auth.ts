import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/app/lib/prisma";
import { verifyPassword } from "@/app/lib/auth/password";
import { authConfig } from "./auth.config";
import { signInSchema } from "@/app/lib/auth/form";

class InvalidLoginError extends CredentialsSignin {
  code = "invalid_credentials";
}

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new InvalidLoginError();
        }

        const user = await prisma.user.findFirst({
          where: {
            email: parsed.data.email,
            deletedAt: null,
          },
        });

        if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
          throw new InvalidLoginError();
        }

        if (!user.emailVerifiedAt) {
          throw new EmailNotVerifiedError();
        }

        return {
          id: String(user.id),
          email: user.email,
          name: [user.name, user.surname].filter(Boolean).join(" "),
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.emailVerified = true;
        return token;
      }

      // Сбрасываем сессии, выданные до жёсткой проверки почты
      if (token.id && token.emailVerified !== true) {
        const dbUser = await prisma.user.findFirst({
          where: { id: Number(token.id), deletedAt: null },
          select: { emailVerifiedAt: true, role: true },
        });
        if (!dbUser?.emailVerifiedAt) {
          return {};
        }
        token.emailVerified = true;
        token.role = dbUser.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (!token.id) {
        return session;
      }
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
