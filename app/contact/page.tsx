import type { Metadata } from "next";
import StaticInfoPage from "@/components/layout/StaticInfoPage";

export const metadata: Metadata = {
  title: "Контакты",
};

export default function ContactPage() {
  return (
    <StaticInfoPage
      title="Контакты"
      description="Как связаться с командой платформы."
      sections={[
        {
          heading: "Электронная почта",
          body: "support@example.com — по вопросам доступа к курсам, аккаунта и технических проблем.",
        },
        {
          heading: "Время ответа",
          body: "Обычно отвечаем в рабочие дни в течение 1–2 суток. Срочность и формат связи будут уточнены позже.",
        },
        {
          heading: "Обратная связь по контенту",
          body: "Замечания по материалам курсов можно направлять на тот же адрес с темой «Контент курса».",
        },
      ]}
    />
  );
}
