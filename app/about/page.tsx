import type { Metadata } from "next";
import StaticInfoPage from "@/components/layout/StaticInfoPage";

export const metadata: Metadata = {
  title: "О проекте",
};

export default function AboutPage() {
  return (
    <StaticInfoPage
      title="О проекте"
      description="Кратко о платформе библейских онлайн-курсов."
      sections={[
        {
          heading: "Миссия",
          body: "Платформа помогает изучать Библию через структурированные курсы, уроки, тесты и сертификаты — в удобном онлайн-формате.",
        },
        {
          heading: "Для кого",
          body: "Для самостоятельных слушателей, групп и преподавателей, которым нужна единая среда для обучения, прогресса и общения.",
        },
        {
          heading: "Возможности",
          body: "Каталог курсов, личный кабинет, записи на обучение, сообщения, уведомления и выдача сертификатов по завершении программы.",
        },
      ]}
    />
  );
}
