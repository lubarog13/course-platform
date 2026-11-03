import { SignJWT, jwtVerify } from "jose";
import { createElement } from "react";
import { prisma } from "@/app/lib/prisma";
import { getAppBaseUrl, sendTransactionalEmail } from "@/app/lib/email";
import { VerifyEmail } from "@/emails/verify-email";

const TOKEN_PURPOSE = "email-verify";
const EXPIRES_IN_HOURS = 24;

function getSecretKey() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET не задан");
  }
  return new TextEncoder().encode(secret);
}

export async function createEmailVerificationToken(params: {
  userId: number;
  email: string;
}): Promise<string> {
  return new SignJWT({
    purpose: TOKEN_PURPOSE,
    email: params.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(params.userId))
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_IN_HOURS}h`)
    .sign(getSecretKey());
}

export async function verifyEmailVerificationToken(
  token: string,
): Promise<{ userId: number; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.purpose !== TOKEN_PURPOSE) return null;
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    const userId = Number(payload.sub);
    if (!Number.isFinite(userId)) return null;
    return { userId, email: payload.email };
  } catch {
    return null;
  }
}

export async function sendEmailVerification(user: {
  id: number;
  email: string;
  name: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = await createEmailVerificationToken({
    userId: user.id,
    email: user.email,
  });
  const verifyUrl = `${getAppBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;

  return sendTransactionalEmail({
    to: user.email,
    subject: "Подтвердите адрес электронной почты",
    react: createElement(VerifyEmail, {
      recipientName: user.name,
      verifyUrl,
      expiresInHours: EXPIRES_IN_HOURS,
    }),
  });
}

export async function confirmEmailVerification(
  token: string,
): Promise<
  | { ok: true; alreadyVerified?: boolean }
  | { ok: false; error: string }
> {
  const parsed = await verifyEmailVerificationToken(token);
  if (!parsed) {
    return { ok: false, error: "Ссылка недействительна или устарела" };
  }

  const user = await prisma.user.findFirst({
    where: { id: parsed.userId, deletedAt: null },
  });
  if (!user || user.email !== parsed.email) {
    return { ok: false, error: "Ссылка недействительна или устарела" };
  }
  if (user.emailVerifiedAt) {
    return { ok: true, alreadyVerified: true };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });
  return { ok: true };
}
