import { BookOpen, GraduationCap, Award } from "lucide-react";
import Link from "next/link";
const STEPS = [
  {
    icon: BookOpen,
    title: "Выберите курс",
    link: "/courses",
    body: "Найдите тему в каталоге и запишитесь на обучение в один клик.",
  },
  {
    icon: GraduationCap,
    title: "Учитесь в своём темпе",
    link: "/courses/user",
    body: "Проходите уроки, тесты и задания — с прогрессом и дедлайнами.",
  },
  {
    icon: Award,
    title: "Получите сертификат",
    link: "/user/certificates",
    body: "Завершите программу и получите сертификат о прохождении курса.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <h2 className="text-center text-2xl font-semibold tracking-tight">
        Как проходит обучение
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
        От выбора курса до сертификата — простой путь на платформе
      </p>

      <ol className="mt-10 grid gap-10 md:grid-cols-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#10375d]/10 text-[#10375d] dark:bg-primary/15 dark:text-foreground">
                <Icon className="h-6 w-6 sm:h-8 sm:w-8" aria-hidden />
              </div>
              <span className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Шаг {index + 1}
              </span>
              <Link href={step.link} className="hover:scale-105 hover:opacity-80">
                <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
              </Link>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
