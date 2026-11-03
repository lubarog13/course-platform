import { Resend } from "resend";
import { pretty, render } from "react-email";
import type { ReactElement } from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

export function getAppBaseUrl(): string {
  return (
    process.env.AUTH_URL ??
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  );
}

/** Транзакционные письма (подтверждение почты и т.п.) — без проверки agreement. */
export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    return { ok: false, error: "EMAIL_FROM не задан" };
  }
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY не задан" };
  }

  try {
    const html = await pretty(await render(options.react));
    const { error } = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html,
    });
    if (error) {
      console.error("Resend error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    console.error("sendTransactionalEmail:", error);
    return { ok: false, error: "Не удалось отправить письмо" };
  }
}
