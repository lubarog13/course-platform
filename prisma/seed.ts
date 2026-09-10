import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Священное Писание", slug: "pisanie" },
  { name: "Ветхий Завет", slug: "vetkhiy-zavet" },
  { name: "Новый Завет", slug: "novyy-zavet" },
  { name: "Богословие", slug: "bogoslovie" },
  { name: "История Церкви", slug: "istoriya-tserkvi" },
];

const courses = [
  {
    name: "Введение в Священное Писание",
    slug: "vvedenie-v-pisanie",
    description:
      "Обзор структуры Библии, жанров книг и правил внимательного чтения текста.",
    level: "beginner" as const,
    needEnrollment: false,
    publishedAt: new Date("2026-01-15T10:00:00Z"),
    tags: ["библия", "введение", "чтение"],
    categorySlug: "pisanie",
  },
  {
    name: "Евангелия: жизнь и учение Христа",
    slug: "evangeliya",
    description:
      "Сравнение четырёх Евангелий, ключевые события земной жизни Иисуса и главные темы Его проповеди.",
    level: "intermediate" as const,
    needEnrollment: true,
    publishedAt: new Date("2026-03-01T10:00:00Z"),
    tags: ["евангелия", "новый-завет"],
    categorySlug: "novyy-zavet",
  },
  {
    name: "Основы христианского богословия",
    slug: "osnovy-bogosloviya",
    description:
      "Систематический курс о Боге, человеке, спасении и Церкви. Для тех, кто уже знаком с библейским текстом.",
    level: "advanced" as const,
    needEnrollment: true,
    publishedAt: new Date("2026-04-10T10:00:00Z"),
    tags: ["богословие", "систематика"],
    categorySlug: "bogoslovie",
  },
  {
    name: "Псалтирь: молитва и поэзия",
    slug: "psaltir",
    description:
      "Как читать псалмы: жанры, исторический контекст и практика личной молитвы.",
    level: "beginner" as const,
    needEnrollment: false,
    publishedAt: new Date("2026-05-01T10:00:00Z"),
    tags: ["псалтирь", "молитва"],
    categorySlug: "vetkhiy-zavet",
  },
  {
    name: "Деяния апостолов и ранняя Церковь",
    slug: "deyaniya",
    description:
      "Рождение Церкви, миссия Павла и распространение Евангелия в первом веке.",
    level: "intermediate" as const,
    needEnrollment: true,
    publishedAt: new Date("2026-05-20T10:00:00Z"),
    tags: ["деяния", "церковь"],
    categorySlug: "istoriya-tserkvi",
  },
  {
    name: "Послание к Римлянам",
    slug: "rimlyanam",
    description:
      "Разбор ключевых тем послания: грех, оправдание, закон, благодать и жизнь по Духу.",
    level: "advanced" as const,
    needEnrollment: true,
    publishedAt: new Date("2026-06-08T10:00:00Z"),
    tags: ["павел", "новый-завет"],
    categorySlug: "novyy-zavet",
  },
];

async function main() {
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@example.com" },
    update: {},
    create: {
      email: "teacher@example.com",
      passwordHash: "dev-only-not-a-real-hash",
      name: "Иван",
      surname: "Петров",
      patronymic: "Сергеевич",
      role: "teacher",
    },
  });

  const categoryBySlug = new Map<string, number>();
  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
    categoryBySlug.set(saved.slug, saved.id);
    console.log(`category #${saved.id} ${saved.name} (${saved.slug})`);
  }

  for (const course of courses) {
    const { categorySlug, ...data } = course;
    const categoryId = categoryBySlug.get(categorySlug);
    const payload = { ...data, categoryId };

    const saved = await prisma.course.upsert({
      where: { slug: course.slug },
      update: payload,
      create: payload,
    });

    await prisma.courseInstructor.upsert({
      where: {
        courseId_userId: { courseId: saved.id, userId: teacher.id },
      },
      update: { role: "owner" },
      create: {
        courseId: saved.id,
        userId: teacher.id,
        role: "owner",
      },
    });

    console.log(`#${saved.id} ${saved.name} (${saved.slug})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
