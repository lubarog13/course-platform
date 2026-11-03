import { Button, Heading, Section, Text } from "react-email";
import { BaseLayout } from "./components/BaseLayout";

export type VerifyEmailProps = {
  recipientName: string;
  verifyUrl: string;
  expiresInHours?: number;
};

export function VerifyEmail({
  recipientName,
  verifyUrl,
  expiresInHours = 24,
}: VerifyEmailProps) {
  return (
    <BaseLayout preview="Подтвердите адрес электронной почты">
      <Heading as="h1" className="m-0 mb-4 text-2xl font-bold text-brand">
        Подтверждение почты
      </Heading>

      <Text className="m-0 mb-4 text-base leading-7 text-brand">
        Здравствуйте, {recipientName}!
      </Text>

      <Text className="m-0 mb-6 text-base leading-7 text-brand">
        Чтобы завершить регистрацию на Course Platform, подтвердите адрес
        электронной почты. Ссылка действует {expiresInHours}{" "}
        {expiresInHours === 1 ? "час" : "часа"}.
      </Text>

      <Section className="mb-2">
        <Button
          href={verifyUrl}
          className="bg-brand text-brand-foreground box-border inline-block rounded px-5 py-3 text-center text-sm font-semibold no-underline"
        >
          Подтвердить почту
        </Button>
      </Section>

      <Text className="mt-6 mb-0 text-sm leading-5 text-brand-muted">
        Если кнопка не работает, скопируйте ссылку в браузер:
        <br />
        {verifyUrl}
      </Text>

      <Text className="mt-4 mb-0 text-sm leading-5 text-brand-muted">
        Если вы не регистрировались на платформе, просто проигнорируйте это
        письмо.
      </Text>
    </BaseLayout>
  );
}

VerifyEmail.PreviewProps = {
  recipientName: "Анна",
  verifyUrl: "https://example.com/verify-email?token=preview-token",
  expiresInHours: 24,
} satisfies VerifyEmailProps;

export default VerifyEmail;
