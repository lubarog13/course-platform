import { declOfNum } from "@/lib/utils";

export type PlatformStatsData = {
  courses: number;
  teachers: number;
  students: number;
  certificates: number;
};

export default function PlatformStats({ stats }: { stats: PlatformStatsData }) {
  const items = [
    {
      value: stats.courses,
      label: declOfNum(stats.courses, ["курс", "курса", "курсов"]),
    },
    {
      value: stats.teachers,
      label: declOfNum(stats.teachers, [
        "преподаватель",
        "преподавателя",
        "преподавателей",
      ]),
    },
    {
      value: stats.students,
      label: declOfNum(stats.students, ["слушатель", "слушателя", "слушателей"]),
    },
    {
      value: stats.certificates,
      label: declOfNum(stats.certificates, [
        "сертификат",
        "сертификата",
        "сертификатов",
      ]),
    },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <h2 className="text-center text-2xl font-semibold tracking-tight">
        Платформа в цифрах
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
        Актуальные показатели обучения на «Библейских курсах»
      </p>
      <dl className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <dt className="sr-only">{item.label}</dt>
            <dd className="font-lora text-4xl font-semibold text-[#10375d] dark:text-foreground">
              {item.value}
            </dd>
            <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}
