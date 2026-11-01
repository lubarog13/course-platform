import { Button, Heading, Section, Text } from "react-email";
import { BaseLayout } from "./components/BaseLayout";

export type NotificationEmailProps = {
  recipientName: string;
  title: string;
  body: string;
  actionUrl: string;
  actionLabel?: string;
};

export default function NotificationEmail({
  recipientName,
  title,
  body,
  actionUrl,
  actionLabel = "Открыть",
}: NotificationEmailProps) {
  return (
    <BaseLayout preview={title}>
      <Heading as="h1" className="m-0 mb-4 text-2xl font-bold text-brand">
        {title}
      </Heading>

      <Text className="m-0 mb-4 text-base leading-7 text-brand">
        Здравствуйте, {recipientName}!
      </Text>

      <Text className="m-0 mb-6 text-base leading-7 text-brand">{body}</Text>

      {actionUrl && (
      <Section className="mb-2">
        <Button
          href={actionUrl}
          className="bg-brand text-brand-foreground box-border inline-block rounded px-5 py-3 text-center text-sm font-semibold no-underline"
        >
          {actionLabel}
        </Button>
      </Section>
      )}

      {actionUrl && (
      <Text className="mt-6 mb-0 text-sm leading-5 text-brand-muted">
        Если кнопка не работает, скопируйте ссылку в браузер:
          <br />
          {actionUrl}
        </Text>
      )}
    </BaseLayout>
  );
}

NotificationEmail.PreviewProps = {
  recipientName: "Анна",
  title: "Запрос на запись на курс",
  body: "Пользователь Иван Иванов запросил запись на курс «Основы TypeScript».",
  actionUrl: "https://example.com/courses/typescript-basics",
  actionLabel: "Открыть курс",
} satisfies NotificationEmailProps;

export { NotificationEmail };
