import { Button, Heading, Section, Text } from "react-email";
import { BaseLayout } from "./components/BaseLayout";
import dayjs from "dayjs";
import ru from "dayjs/locale/ru";
dayjs.locale(ru);
import { declOfNum } from "@/lib/utils";

export type DeadlineEmailProps = {
  recipientName: string;
  courseName: string;
  lessonName: string;
  deadlineDate: Date;
  actionUrl?: string;
};

export function DeadlineEmail({
  recipientName,
  courseName,
  lessonName,
  deadlineDate,
  actionUrl,
}: DeadlineEmailProps) {
  const daysBeforeDeadline = dayjs(deadlineDate).startOf("day").diff(dayjs().startOf("day"), "day");
  const daysWord = declOfNum(Math.abs(daysBeforeDeadline), ["день", "дня", "дней"]);
  const daysBeforeDeadlineText = `${Math.abs(daysBeforeDeadline)} ${daysWord}`;
  return (
    <BaseLayout preview={daysBeforeDeadline > 0 ? `${daysBeforeDeadlineText} до дедлайна` : daysBeforeDeadline === 0 ? "Сегодня дедлайн" : "Срок сдачи пропущен"}>
      {daysBeforeDeadline > 0 && <Heading as="h1" className="m-0 mb-4 text-2xl font-bold text-brand">
        До окончания срока сдачи{" "}
        <span className="text-gray-900">
          {lessonName}
        </span>{" "}
        осталось {daysBeforeDeadlineText}
      </Heading>}
      {daysBeforeDeadline === 0 && <Heading as="h1" className="m-0 mb-4 text-2xl font-bold text-brand">
        Сегодня дедлайн для <span className="text-brand-muted">
          {lessonName}
        </span>
      </Heading>}
      {daysBeforeDeadline < 0 && <Heading as="h1" className="m-0 mb-4 text-2xl font-bold text-brand">
        Вы пропустили срок сдачи для{" "}
        <span className="text-brand-muted">
          {lessonName}
        </span>
      </Heading>}

      <Text className="m-0 mb-4 text-base leading-7 text-brand">
        Здравствуйте, <b>{recipientName}</b>!
      </Text>

      {daysBeforeDeadline > 0 && <Text className="m-0 mb-6 text-base leading-7 text-brand">
        У вас осталось {daysBeforeDeadlineText} до дедлайна для сдачи части <b>{lessonName}</b> по курсу <span className="text-brand-muted">
          {courseName}
        </span>. Поторопитесь с выполнением работы, чтобы успеть сдать ее вовремя.
      </Text>}
      {daysBeforeDeadline === 0 && <Text className="m-0 mb-6 text-base leading-7 text-brand">
        Сегодня крайний срок для сдачи части <b>{lessonName}</b> по курсу <span className="text-brand-muted">
          {courseName}
        </span>. Поторопитесь с выполнением работы, чтобы успеть сдать ее вовремя.
        <br />
        <br />
        Если вы не можете сдать работу вовремя, свяжитесь с преподавателем для продления срока сдачи.
      </Text>}
      {daysBeforeDeadline < 0 && <Text className="m-0 mb-6 text-base leading-7 text-brand">
        Вы пропустили срок сдачи для части <b>{lessonName}</b> по курсу <span className="text-brand-muted">
          {courseName}
        </span>. Для продления срока сдачи свяжитесь с преподавателем.
      </Text>}

      {actionUrl && (
      <Section className="mb-2">
        <Button
          href={actionUrl}
          className="bg-brand text-brand-foreground box-border inline-block rounded px-5 py-3 text-center text-sm font-semibold no-underline"
        >
          {daysBeforeDeadline > 0 ? "Перейти к обучению" : daysBeforeDeadline === 0 ? "Перейти к работе" : "Сбросить срок сдачи"}
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

DeadlineEmail.PreviewProps = {
  recipientName: "Анна",
  deadlineDate: new Date(),
  actionUrl: "/courses/rimlyanam/learn?lessonId=1",
  courseName: "Послание к Римлянам",
  lessonName: "Неделя 1. Введение в послание и тема праведности по вере",
} satisfies DeadlineEmailProps;

export default DeadlineEmail;
