import { randomBytes, scryptSync } from "node:crypto";
import {
  LessonType,
  PrismaClient,
  type QuestionType,
} from "@prisma/client";

const TEACHER_EMAIL = "teacher@example.com";
const TEACHER_PASSWORD = "teacher123";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${key}`;
}

const prisma = new PrismaClient();

const categories = [
  { name: "Священное Писание", slug: "pisanie" },
  { name: "Ветхий Завет", slug: "vetkhiy-zavet" },
  { name: "Новый Завет", slug: "novyy-zavet" },
  { name: "Богословие", slug: "bogoslovie" },
  { name: "История Церкви", slug: "istoriya-tserkvi" },
];

const rimlyanamDescription = `

## Общее описание курса

Настоящий онлайн-курс посвящён углублённому изучению Послания апостола Павла к Римлянам — одного из самых значимых и богословски насыщенных текстов Нового Завета. Послание занимает центральное место в христианском богословии, поскольку именно в нём наиболее полно и систематично изложено учение об оправдании по вере, о грехе и благодати, о роли закона, о предопределении и о практической жизни верующего человека.

Курс рассчитан на четыре недели и проводится на онлайн-платформе. Каждая неделя включает видеолекции, текстовые материалы для самостоятельного чтения и тесты для самопроверки. Особое внимание уделяется не только академическому изучению текста, но и его применению в повседневной жизни.

**Формат:** 4 недели, онлайн-платформа, видеолекции + текстовые материалы + тесты.
**Целевая аудитория:** студенты богословских курсов, служители церкви, а также все, кто желает глубже понять содержание и значение Послания к Римлянам.
**Предварительные требования:** базовое знакомство с текстом Нового Завета и основами христианского вероучения.
**Нагрузка:** примерно 3–5 часов в неделю.

## Итоги курса

По завершении курса участники:

- понимают исторический контекст, структуру и главные богословские идеи Послания к Римлянам;
- умеют различать понятия закона, благодати, веры, оправдания и освящения;
- знакомы с ключевыми спорными вопросами (предопределение, судьба Израиля, свобода совести) и различными подходами к их толкованию;
- применяют практические принципы послания в повседневной жизни и служении;
- приобретают навыки самостоятельного анализа библейского текста.

## Рекомендуемая литература

- Библейский текст: Послание к Римлянам (синодальный перевод).
- Джон Стотт. «Послание к Римлянам» (серия «Библия говорит сегодня»).
- Дуглас Му. «Послание к Римлянам» (серия «Новый Библейский комментарий»).
- Томас Шрайнер. «Послание к Римлянам» (серия Baker Exegetical Commentary).
- Дополнительно: конспекты лекций, рабочие тетради с вопросами для размышления.

## Методы оценки на онлайн-платформе

- Прохождение еженедельных тестов для самопроверки.
- Итоговый тест по всему курсу.

## Технические требования

- Стабильное интернет-соединение.
- Браузер последней версии (Chrome, Firefox, Edge).
- Возможность просмотра видеолекций.
- Доступ к личному кабинету на онлайн-платформе.

## Структура онлайн-платформы

- **Видеолекции** — основные учебные материалы по каждой неделе.
- **Текстовые конспекты** — краткое изложение ключевых идей.
- **Тесты** — проверка усвоения материала.
- **Библиотека** — дополнительные статьи, комментарии и ссылки на литературу.`;

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
    description: rimlyanamDescription,
    level: "advanced" as const,
    needEnrollment: true,
    publishedAt: new Date("2026-06-08T10:00:00Z"),
    tags: ["павел", "новый-завет"],
    categorySlug: "novyy-zavet",
  },
];

type QuestionOptionSeed = {
  text: string;
  isCorrect?: boolean;
  sortOrder: number;
};

type QuestionSeed = {
  question: string;
  type: QuestionType;
  score: number;
  sortOrder: number;
  options?: QuestionOptionSeed[];
};

type LessonSeed = {
  name: string;
  description?: string;
  sortOrder: number;
  type: LessonType;
  textContent?: string;
  points?: number;
  durationSeconds?: number;
  timeLimitSeconds?: number;
  passingScore?: number;
  maxAttempts?: number;
  videoTitle?: string;
  questions?: QuestionSeed[];
  publishedAt?: Date;
};

type PartSeed = {
  name: string;
  description: string;
  sortOrder: number;
  lessons: LessonSeed[];
};

const rimlyanamParts: PartSeed[] = [
  {
    sortOrder: 1,
    name: "Неделя 1. Введение в послание и тема праведности по вере",
    description:
      "**Ключевые отрывки:** Рим. 1:1–17\n\nЗнакомство с посланием: исторический контекст, авторство, структура и тезис Рим. 1:16–17 о праведности по вере.",
    lessons: [
      {
        sortOrder: 1,
        type: "video",
        name: "Вводная видеолекция: контекст и тезис послания",
        description:
          "Авторство Павла, ситуация в римской церкви, цель послания и ключевой тезис Рим. 1:16–17.",
        durationSeconds: 25 * 60,
        videoTitle: "Римлянам — неделя 1: введение",
      },
      {
        sortOrder: 2,
        type: "text",
        name: "Конспект: автор, адресаты и структура",
        description: "Краткое изложение ключевых идей первой недели.",
        durationSeconds: 20 * 60,
        textContent: `## Конспект недели 1

**Ключевые отрывки:** Рим. 1:1–17

### Темы занятия
- Автор, адресаты и исторический контекст.
- Цель и структура послания.
- Понятие Евангелия как силы Божией.
- Праведность по вере как главная тема.

### Центральный тезис
«Ибо я не стыжусь благовествования Христова, потому что оно есть сила Божия ко спасению всякому верующему... В нём открывается правда Божия от веры в веру, как написано: праведный верою жив будет» (Рим. 1:16–17).

### Для самостоятельного изучения
1. Прочитать Рим. 1.
2. Ответить на вопросы для размышления.
3. Сформулировать собственное понимание выражения «праведный верою жив будет».`,
      },
      {
        sortOrder: 3,
        type: "text",
        name: "Карта Римской империи и исторический контекст",
        description: "Справка о времени и месте написания послания.",
        durationSeconds: 15 * 60,
        textContent: `## Исторический контекст

Послание к Римлянам написано апостолом Павлом, вероятно, в Коринфе около 57 г. н. э., перед планируемым путешествием в Иерусалим и далее в Рим и Испанию.

### Ситуация римской церкви
- Смешанная община из иудеев и язычников.
- Необходимость единства и общего понимания Евангелия.
- Павел ещё не посещал римскую церковь лично, но желал укрепить верующих.

### Место в корпусе Павловых писаний
Римлянам — наиболее систематичное изложение Павлова богословия: грех, закон, оправдание, освящение, предопределение и практическая жизнь.`,
      },
      {
        sortOrder: 4,
        type: "test",
        name: "Тест: знание контекста послания",
        description: "Самопроверка по историческому контексту и тезису Рим. 1:16–17.",
        points: 10,
        passingScore: 7,
        durationSeconds: 15 * 60,
        timeLimitSeconds: 15 * 60,
        maxAttempts: 3,
        questions: [
          {
            sortOrder: 1,
            type: "single_choice",
            score: 2,
            question: "Кто является автором Послания к Римлянам?",
            options: [
              { sortOrder: 1, text: "Апостол Пётр", isCorrect: false },
              { sortOrder: 2, text: "Апостол Павел", isCorrect: true },
              { sortOrder: 3, text: "Евангелист Лука", isCorrect: false },
              { sortOrder: 4, text: "Апостол Иоанн", isCorrect: false },
            ],
          },
          {
            sortOrder: 2,
            type: "single_choice",
            score: 2,
            question: "Где, по наиболее распространённой датировке, Павел написал это послание?",
            options: [
              { sortOrder: 1, text: "В Риме", isCorrect: false },
              { sortOrder: 2, text: "В Иерусалиме", isCorrect: false },
              { sortOrder: 3, text: "В Коринфе", isCorrect: true },
              { sortOrder: 4, text: "В Эфесе", isCorrect: false },
            ],
          },
          {
            sortOrder: 3,
            type: "multiple_choice",
            score: 3,
            question:
              "Какие утверждения верны относительно центрального тезиса Рим. 1:16–17? (выберите все подходящие)",
            options: [
              {
                sortOrder: 1,
                text: "Евангелие — сила Божия ко спасению",
                isCorrect: true,
              },
              {
                sortOrder: 2,
                text: "Праведность открывается от веры в веру",
                isCorrect: true,
              },
              {
                sortOrder: 3,
                text: "Спасение даётся только по делам закона",
                isCorrect: false,
              },
              {
                sortOrder: 4,
                text: "«Праведный верою жив будет»",
                isCorrect: true,
              },
            ],
          },
          {
            sortOrder: 4,
            type: "single_choice",
            score: 2,
            question: "Какой была римская церковь по составу?",
            options: [
              { sortOrder: 1, text: "Только из иудеев", isCorrect: false },
              { sortOrder: 2, text: "Только из язычников", isCorrect: false },
              {
                sortOrder: 3,
                text: "Смешанная община иудеев и язычников",
                isCorrect: true,
              },
              { sortOrder: 4, text: "Только из римских граждан", isCorrect: false },
            ],
          },
          {
            sortOrder: 5,
            type: "text",
            score: 1,
            question:
              "Кратко сформулируйте своими словами, что означает выражение «праведный верою жив будет».",
          },
        ],
      },
    ],
  },
  {
    sortOrder: 2,
    name: "Неделя 2. Грех, закон и оправдание",
    description:
      "**Ключевые отрывки:** Рим. 1:18 – 5:21\n\nВсеобщность греха, оправдание по вере, пример Авраама и плоды оправдания: мир с Богом, надежда и примирение.",
    lessons: [
      {
        sortOrder: 1,
        type: "video",
        name: "Видеолекция 1: всеобщность греха (гл. 1–3)",
        description: "Божий гнев, нечестие язычников и иудеев, нужда всех людей в спасении.",
        durationSeconds: 30 * 60,
        videoTitle: "Римлянам — неделя 2: грех (гл. 1–3)",
      },
      {
        sortOrder: 2,
        type: "video",
        name: "Видеолекция 2: оправдание по вере (гл. 3–5)",
        description: "Оправдание не по делам закона, пример Авраама, мир и примирение с Богом.",
        durationSeconds: 30 * 60,
        videoTitle: "Римлянам — неделя 2: оправдание (гл. 3–5)",
      },
      {
        sortOrder: 3,
        type: "text",
        name: "Сравнительная таблица: закон и благодать",
        description: "Различия понятий закона и благодати в Рим. 3–5.",
        durationSeconds: 25 * 60,
        textContent: `## Закон и благодать (Рим. 3–5)

| Закон | Благодать |
| --- | --- |
| Открывает грех | Дарует прощение |
| Требует дел | Принимает веру |
| Обвиняет | Оправдывает |
| Ведёт к осознанию нужды | Даёт праведность во Христе |

### Темы занятия
- Всеобщность греха: язычники и иудеи (гл. 1–3).
- Оправдание по вере, а не по делам закона (гл. 3–4).
- Пример Авраама как образец веры.
- Мир с Богом, надежда и примирение (гл. 5).

### Для самостоятельного изучения
Сравнить понятия «закон» и «благодать» в Рим. 3–5 и составить собственную таблицу различий.`,
      },
      {
        sortOrder: 4,
        type: "text",
        name: "Дополнительная статья: Авраам как образец веры",
        description: "Разбор Рим. 4 и значения вменения праведности.",
        durationSeconds: 20 * 60,
        textContent: `## Авраам как образец веры

Павел приводит Авраама в доказательство того, что оправдание даётся по вере, а не по делам закона: «Авраам поверил Богу, и это вменилось ему в праведность».

Вера Авраама предшествует обрезанию и закону Моисея. Таким образом, он становится отцом всех верующих — и иудеев, и язычников.

Оправдание приводит к плодам: миру с Богом, доступу к благодати, надежде и радости даже в страданиях (Рим. 5).`,
      },
      {
        sortOrder: 5,
        type: "test",
        name: "Интерактивный тест: грех и оправдание",
        description: "Проверка усвоения тем Рим. 1–5.",
        points: 15,
        passingScore: 10,
        durationSeconds: 20 * 60,
      },
    ],
  },
  {
    sortOrder: 3,
    name: "Неделя 3. Освящение, предопределение и судьба Израиля",
    description:
      "**Ключевые отрывки:** Рим. 6:1 – 11:36\n\nЖизнь в Духе, борьба плоти и духа, вопросы предопределения и место Израиля в Божьем замысле спасения.",
    lessons: [
      {
        sortOrder: 1,
        type: "video",
        name: "Видеолекция 1: освобождение от греха (гл. 6–7)",
        description: "Соединение со Христом в смерти и воскресении; борьба плоти и духа.",
        durationSeconds: 28 * 60,
        videoTitle: "Римлянам — неделя 3: гл. 6–7",
      },
      {
        sortOrder: 2,
        type: "video",
        name: "Видеолекция 2: жизнь в Духе (гл. 8)",
        description: "Уверенность верующего: ничто не отлучит нас от любви Божией.",
        durationSeconds: 28 * 60,
        videoTitle: "Римлянам — неделя 3: гл. 8",
      },
      {
        sortOrder: 3,
        type: "video",
        name: "Видеолекция 3: Израиль и избрание (гл. 9–11)",
        description: "Предопределение, призвание, судьба Израиля и Божий замысел спасения.",
        durationSeconds: 35 * 60,
        videoTitle: "Римлянам — неделя 3: гл. 9–11",
      },
      {
        sortOrder: 4,
        type: "text",
        name: "Схемы по главам 9–11",
        description: "Структурный обзор трудных глав о предопределении и Израиле.",
        durationSeconds: 25 * 60,
        textContent: `## Схемы Рим. 9–11

### Темы занятия
- Освобождение от греха и жизнь в Духе (гл. 6–8).
- Борьба плоти и духа, уверенность верующего (гл. 8).
- Предопределение, призвание и избрание (гл. 9–11).
- Судьба Израиля и Божий замысел спасения.

### Логика глав 9–11
1. **Гл. 9** — верность Бога и свобода избрания.
2. **Гл. 10** — ответственность человека и необходимость проповеди.
3. **Гл. 11** — остаток Израиля, привитие язычников и будущая полнота.

Разные богословские традиции по-разному толкуют эти главы; важно удерживать вместе суверенитет Бога и призыв к вере.`,
      },
      {
        sortOrder: 5,
        type: "text",
        name: "Разбор трудных мест Рим. 9–11",
        description: "Текстовый комментарий к ключевым спорным отрывкам.",
        durationSeconds: 30 * 60,
        textContent: `## Трудные места Рим. 9–11

### Вопросы для размышления
- Как совместить Божье избрание и человеческую ответственность?
- Что Павел говорит об «остатке» Израиля?
- Как образ маслины помогает понять отношения Израиля и Церкви?

### Для самостоятельного изучения
Разобрать трудные места Рим. 9–11 и написать краткое эссе (1–2 страницы) по одной из тем выше.`,
      },
      {
        sortOrder: 6,
        type: "test",
        name: "Тест по неделе 3",
        description: "Самопроверка по темам освящения, предопределения и Израиля.",
        points: 15,
        passingScore: 10,
        durationSeconds: 20 * 60,
      },
    ],
  },
  {
    sortOrder: 4,
    name: "Неделя 4. Практическая жизнь и заключение послания",
    description:
      "**Ключевые отрывки:** Рим. 12:1 – 16:27\n\nЖертва живая, отношения с властями и ближними, свобода совести, единство церкви и итоговое славословие.",
    lessons: [
      {
        sortOrder: 1,
        type: "video",
        name: "Видеолекция 1: жизнь как жертва живая (гл. 12–13)",
        description: "Преобразование ума, любовь к ближнему и отношение к властям.",
        durationSeconds: 30 * 60,
        videoTitle: "Римлянам — неделя 4: гл. 12–13",
      },
      {
        sortOrder: 2,
        type: "video",
        name: "Видеолекция 2: свобода совести и заключение (гл. 14–16)",
        description: "Немощные в вере, взаимное принятие, приветствия и славословие.",
        durationSeconds: 28 * 60,
        videoTitle: "Римлянам — неделя 4: гл. 14–16",
      },
      {
        sortOrder: 3,
        type: "text",
        name: "Чек-лист практического применения Рим. 12–15",
        description: "Пункты для применения принципов послания в повседневной жизни.",
        durationSeconds: 20 * 60,
        textContent: `## Чек-лист практического применения

### Темы занятия
- Жизнь как «жертва живая» (гл. 12).
- Отношения с властями и ближними (гл. 13).
- Свобода совести и немощные в вере (гл. 14–15).
- Личные приветствия и итоговое славословие (гл. 16).

### Чек-лист
- [ ] Представляю ли я свою жизнь Богу ежедневно?
- [ ] Обновляю ли ум через Писание и молитву?
- [ ] Проявляю ли любовь к ближнему на деле?
- [ ] Уважаю ли власти без идолопоклонства перед ними?
- [ ] Берегу ли совесть другого верующего?
- [ ] Стремлюсь ли к единству и взаимному принятию?

### Для самостоятельного изучения
Составить личный план применения принципов Рим. 12–15 на ближайший месяц.`,
      },
      {
        sortOrder: 4,
        type: "test",
        name: "Итоговый тест по всему курсу",
        description: "Финальная проверка по ключевым темам Послания к Римлянам.",
        points: 30,
        passingScore: 20,
        durationSeconds: 40 * 60,
      },
    ],
  },
];

async function seedLessonQuestions(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  lessonId: number,
  questions: QuestionSeed[],
) {
  for (const question of questions) {
    const createdQuestion = await tx.testQuestion.create({
      data: {
        lessonId,
        question: question.question,
        type: question.type,
        score: question.score,
        sortOrder: question.sortOrder,
      },
    });

    if (question.options?.length) {
      await tx.testQuestionOption.createMany({
        data: question.options.map((option) => ({
          questionId: createdQuestion.id,
          text: option.text,
          isCorrect: option.isCorrect ?? false,
          sortOrder: option.sortOrder,
        })),
      });
    }
  }
}

async function seedRimlyanamParts(courseId: number) {
  const existingParts = await prisma.coursePart.count({
    where: { courseId, deletedAt: null },
  });
  if (existingParts > 0) {
    console.log(
      `rimlyanam #${courseId}: parts already exist (${existingParts}), seeding missing questions only`,
    );
    await seedMissingTestQuestions(courseId);
    return;
  }

  let totalDuration = 0;

  await prisma.$transaction(async (tx) => {
    for (const part of rimlyanamParts) {
      const createdPart = await tx.coursePart.create({
        data: {
          courseId,
          name: part.name,
          description: part.description,
          sortOrder: part.sortOrder,
        },
      });

      for (const lesson of part.lessons) {
        let videoId: number | undefined;
        if (lesson.type === "video") {
          const video = await tx.video.create({
            data: {
              url: "https://example.com/video-placeholder",
              platform: "youtube",
              title: lesson.videoTitle ?? lesson.name,
              durationSeconds: lesson.durationSeconds,
            },
          });
          videoId = video.id;
        }

        const createdLesson = await tx.lesson.create({
          data: {
            coursePartId: createdPart.id,
            name: lesson.name,
            description: lesson.description,
            sortOrder: lesson.sortOrder,
            type: lesson.type,
            textContent: lesson.textContent,
            videoId,
            points: lesson.points ?? 0,
            durationSeconds: lesson.durationSeconds,
            timeLimitSeconds: lesson.timeLimitSeconds,
            passingScore: lesson.passingScore,
            maxAttempts: lesson.maxAttempts,
            publishedAt: new Date(),
          },
        });

        if (lesson.type === "test" && lesson.questions?.length) {
          await seedLessonQuestions(tx, createdLesson.id, lesson.questions);
          console.log(
            `  test lesson #${createdLesson.id}: ${lesson.questions.length} questions`,
          );
        }

        totalDuration += lesson.durationSeconds ?? 0;
      }

      console.log(
        `part #${createdPart.id} "${createdPart.name}" — ${part.lessons.length} lessons`,
      );
    }

    await tx.course.update({
      where: { id: courseId },
      data: { durationSeconds: totalDuration },
    });
  });

  console.log(
    `rimlyanam #${courseId}: seeded parts, durationSeconds=${totalDuration}`,
  );
}

async function seedMissingTestQuestions(courseId: number) {
  const testLessons = await prisma.lesson.findMany({
    where: {
      type: "test",
      deletedAt: null,
      coursePart: { courseId, deletedAt: null },
    },
    include: {
      questions: { select: { id: true } },
      coursePart: { select: { sortOrder: true } },
    },
  });

  for (const lesson of testLessons) {
    if (lesson.questions.length > 0) {
      console.log(
        `test lesson #${lesson.id} already has ${lesson.questions.length} questions, skipping`,
      );
      continue;
    }

    const partSeed = rimlyanamParts.find(
      (part) => part.sortOrder === lesson.coursePart.sortOrder,
    );
    const lessonSeed = partSeed?.lessons.find(
      (item) => item.sortOrder === lesson.sortOrder && item.type === "test",
    );

    if (!lessonSeed?.questions?.length) {
      console.log(`test lesson #${lesson.id}: no question seed defined`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await seedLessonQuestions(tx, lesson.id, lessonSeed.questions!);
      await tx.lesson.update({
        where: { id: lesson.id },
        data: {
          timeLimitSeconds: lessonSeed.timeLimitSeconds,
          maxAttempts: lessonSeed.maxAttempts,
          passingScore: lessonSeed.passingScore,
          points: lessonSeed.points ?? lesson.points,
        },
      });
    });

    console.log(
      `test lesson #${lesson.id}: added ${lessonSeed.questions.length} questions`,
    );
  }
}

async function main() {
  const teacherData = {
    email: TEACHER_EMAIL,
    passwordHash: hashPassword(TEACHER_PASSWORD),
    name: "Иван",
    surname: "Петров",
    patronymic: "Сергеевич",
    phone: "+7 900 123-45-67",
    role: "teacher" as const,
    emailVerifiedAt: new Date("2026-01-01T10:00:00Z"),
    userDetails: {
      position: "Преподаватель библейских дисциплин",
      achievements: [
        "Кандидат богословия",
        "Автор курса «Послание к Римлянам»",
      ],
    },
  };

  const teacher = await prisma.user.upsert({
    where: { email: TEACHER_EMAIL },
    update: teacherData,
    create: teacherData,
  });
  console.log(
    `teacher #${teacher.id} ${teacher.email} (пароль: ${TEACHER_PASSWORD})`,
  );

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

  let rimlyanamCourseId: number | undefined;

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

    if (saved.slug === "rimlyanam") {
      rimlyanamCourseId = saved.id;
    }

    console.log(`#${saved.id} ${saved.name} (${saved.slug})`);
  }

  if (rimlyanamCourseId !== undefined) {
    await seedRimlyanamParts(rimlyanamCourseId);
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
