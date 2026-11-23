import { z } from "zod";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import type { TestQuestion } from "@prisma/client";
import type { TestQuestionOption } from "@prisma/client";
import type { TestQuestionDto, TestQuestionOptionDto } from "@/app/lib/lessons";

export const testOptionFormSchema = z.object({
  text: z.string().min(1, "Введите текст опции"),
  isCorrect: z.boolean().default(false),
  sortOrder: z.number().min(0, "Порядок должен быть больше 0"),
});

export const testQuestionFormSchema = z.object({
  question: z.string().min(1, "Введите вопрос"),
  type: z.enum(["single_choice", "multiple_choice", "text"]),
  sortOrder: z.number().min(0, "Порядок должен быть больше 0"),
  required: z.boolean().default(true),
  attachmentNeeded: z.boolean().default(false),
  textAnswer: z.string().nullable().optional(),
  lessonId: z.number().int().positive("Выберите урок"),
  score: z.number().min(0, "Баллы должны быть больше или равен 0"),
});

export type TestOptionFormValues = z.infer<typeof testOptionFormSchema>;
export type TestQuestionFormValues = z.infer<typeof testQuestionFormSchema>;

/** Вопрос + варианты для CSV/XLSX импорта и экспорта */
export type TestQuestionTransfer = TestQuestionFormValues & {
  options: TestOptionFormValues[] | null;
};

export function toTestQuestionFormValues(question: TestQuestion): TestQuestionFormValues {
  return {
    question: question.question,
    type: question.type,
    sortOrder: question.sortOrder,
    required: question.required,
    attachmentNeeded: question.attachmentNeeded,
    lessonId: question.lessonId,
    score: question.score,
    textAnswer: question.textAnswer ?? null,
  };
}

export function toTestOptionFormValues(option: TestQuestionOption): TestOptionFormValues {
  return {
    text: option.text,
    isCorrect: option.isCorrect,
    sortOrder: option.sortOrder,
  };
}

export function toTestQuestion(values: TestQuestionFormValues, id: number): TestQuestion {
  return {
    id: id,
    question: values.question,
    type: values.type,
    sortOrder: values.sortOrder,
    required: values.required,
    attachmentNeeded: values.attachmentNeeded,
    lessonId: values.lessonId,
    score: values.score,
    textAnswer: values.textAnswer ?? null,
  };
}

export function toTestQuestionDto(
  values: TestQuestionFormValues,
  id: number,
  options: TestQuestionOptionDto[],
): TestQuestionDto {
  return {
    id: id,
    question: values.question,
    type: values.type,
    sortOrder: values.sortOrder,
    required: values.required,
    attachmentNeeded: values.attachmentNeeded,
    lessonId: values.lessonId,
    score: values.score,
    textAnswer: values.textAnswer ?? null,
    options: options,
  };
}

export function toTestOption(
  values: TestOptionFormValues,
  id: number,
  questionId: number,
): TestQuestionOption {
  return {
    id: id,
    questionId: questionId,
    text: values.text,
    isCorrect: values.isCorrect,
    sortOrder: values.sortOrder,
  };
}

export function toTestQuestionOptionDto(option: TestQuestionOption): TestQuestionOptionDto {
  return {
    id: option.id,
    text: option.text,
    isCorrect: option.isCorrect,
    sortOrder: option.sortOrder,
  };
}

export function toTestQuestionTransfer(question: TestQuestionDto): TestQuestionTransfer {
  return {
    ...toTestQuestionFormValues(question),
    options: question.options.map((option) => ({
      text: option.text,
      isCorrect: option.isCorrect ?? false,
      sortOrder: option.sortOrder,
    })),
  };
}

export function transferToTestQuestionDto(
  values: TestQuestionTransfer,
  id: number,
): TestQuestionDto {
  return {
    id,
    question: values.question,
    type: values.type,
    sortOrder: values.sortOrder,
    required: values.required,
    attachmentNeeded: values.attachmentNeeded,
    lessonId: values.lessonId,
    score: values.score,
    textAnswer: values.textAnswer ?? null,
    options: (values.options ?? []).map((option, index) => ({
      id: -(index + 1),
      text: option.text,
      isCorrect: option.isCorrect,
      sortOrder: option.sortOrder || index + 1,
    })),
  };
}

const CSV_HEADERS = [
  "question",
  "type",
  "sortOrder",
  "required",
  "attachmentNeeded",
  "textAnswer",
  "lessonId",
  "score",
  "options",
] as const;

/** Русские заголовки в выгружаемом файле (для преподавателей) */
const EXPORT_HEADERS: Record<(typeof CSV_HEADERS)[number], string> = {
  question: "вопрос",
  type: "тип",
  sortOrder: "порядок",
  required: "обязательный",
  attachmentNeeded: "вложение",
  textAnswer: "текстовый ответ",
  lessonId: "урок",
  score: "баллы",
  options: "варианты",
};

const TYPE_EXPORT_LABELS: Record<TestQuestionFormValues["type"], string> = {
  single_choice: "один вариант",
  multiple_choice: "несколько вариантов",
  text: "текст",
};

export const DEFAULT_QUESTIONS: TestQuestionTransfer[] = [
    {
      "question": "Вопрос 1",
      "type": "single_choice",
      "sortOrder": 1,
      "required": true,
      "attachmentNeeded": false,
      "lessonId": 0,
      "score": 2,
      "textAnswer": null,
      "options": [
        {
          "text": "Неверная опция",
          "isCorrect": false,
          "sortOrder": 1
        },
        {
          "text": "Верная опция",
          "isCorrect": true,
          "sortOrder": 2
        },
        {
          "text": "Неверная опция",
          "isCorrect": false,
          "sortOrder": 3
        },
        {
          "text": "Неверная опция",
          "isCorrect": false,
          "sortOrder": 4
        }
      ]
    },
    {
      "question": "Вопрос 2",
      "type": "single_choice",
      "sortOrder": 2,
      "required": true,
      "attachmentNeeded": false,
      "lessonId": 0,
      "score": 2,
      "textAnswer": null,
      "options": [
        {
          "text": "Неверная опция",
          "isCorrect": false,
          "sortOrder": 1
        },
        {
          "text": "Верная опция",
          "isCorrect": true,
          "sortOrder": 2
        },
        {
          "text": "Неверная опция",
          "isCorrect": false,
          "sortOrder": 3
        },
        {
          "text": "Неверная опция",
          "isCorrect": false,
          "sortOrder": 4
        }
      ]
    },
    {
      "question": "Вопрос 3",
      "type": "multiple_choice",
      "sortOrder": 3,
      "required": true,
      "attachmentNeeded": false,
      "lessonId": 0,
      "score": 3,
      "textAnswer": null,
      "options": [
        {
          "text": "Верная опция",
          "isCorrect": true,
          "sortOrder": 1
        },
        {
          "text": "Верная опция",
          "isCorrect": true,
          "sortOrder": 2
        },
        {
          "text": "Неверная опция",
          "isCorrect": false,
          "sortOrder": 3
        }
      ]
    },
    {
      "question": "Вопрос 4",
      "type": "single_choice",
      "sortOrder": 4,
      "required": true,
      "attachmentNeeded": false,
      "lessonId": 0,
      "score": 2,
      "textAnswer": null,
      "options": [
        {
          "text": "Неверная опция",
          "isCorrect": false,
          "sortOrder": 1
        },
        {
          "text": "Верная опция",
          "isCorrect": true,
          "sortOrder": 2
        }
      ]
    },
    {
      "question": "Вопрос 5",
      "type": "text",
      "sortOrder": 5,
      "required": false,
      "attachmentNeeded": false,
      "lessonId": 0,
      "score": 1,
      "textAnswer": "Ответ на вопрос",
      "options": []
    }
]
type CsvHeader = (typeof CSV_HEADERS)[number];

const HEADER_ALIASES: Record<CsvHeader, string[]> = {
  question: ["question", "вопрос", "текст вопроса"],
  type: ["type", "тип"],
  sortOrder: ["sortorder", "sort_order", "порядок"],
  required: ["required", "обязательный", "обязателен"],
  attachmentNeeded: [
    "attachmentneeded",
    "attachment_needed",
    "вложение",
    "нужно вложение",
  ],
  textAnswer: ["textanswer", "text_answer", "текстовый ответ", "ответ"],
  lessonId: ["lessonid", "lesson_id", "урок"],
  score: ["score", "баллы", "балл"],
  options: ["options", "варианты", "варианты ответа"],
};

const QUESTION_TYPES = new Set(["single_choice", "multiple_choice", "text"]);

type TransferRow = Record<string, unknown>;

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function mapHeaders(fields: string[]): Partial<Record<CsvHeader, string>> {
  const mapping: Partial<Record<CsvHeader, string>> = {};
  for (const field of fields) {
    const normalized = normalizeHeader(field);
    for (const header of CSV_HEADERS) {
      if (HEADER_ALIASES[header].some((alias) => alias === normalized)) {
        mapping[header] = field;
      }
    }
  }
  return mapping;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "да", "истина"].includes(raw)) return true;
  if (["0", "false", "no", "n", "нет", "ложь"].includes(raw)) return false;
  throw new Error(`Некорректное логическое значение: ${value}`);
}

function parseNumber(value: unknown, field: string, fallback?: number): number {
  if (value === undefined || value === null || value === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Поле ${field} обязательно`);
  }
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(num)) {
    throw new Error(`Поле ${field} должно быть числом`);
  }
  return num;
}

function serializeOptions(options: TestOptionFormValues[]): string {
  if (!options.length) return "";
  return options
    .map((option) => {
      const text = option.text.replace(/\|/g, "\\|").replace(/;/g, "\\;");
      return `${text}|${option.isCorrect ? 1 : 0}`;
    })
    .join(";");
}

function unescapeOptionPart(value: string): string {
  return value.replace(/\\\|/g, "|").replace(/\\;/g, ";");
}

/** Разбивает строку по separator, учитывая `\`-экранирование. */
function splitEscaped(value: string, separator: ";" | "|"): string[] {
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === "\\" && i + 1 < value.length) {
      current += char + value[i + 1];
      i += 1;
      continue;
    }
    if (char === separator) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}

function parseOptionsCell(value: unknown): TestOptionFormValues[] {
  if (value === undefined || value === null) return [];
  const raw = String(value).trim();
  if (!raw) return [];

  if (raw.startsWith("[")) {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("options: ожидается JSON-массив");
    }
    return parsed.map((item, index) => {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        throw new Error(`options[${index}]: ожидается объект`);
      }
      const row = item as Record<string, unknown>;
      const text = String(row.text ?? "").trim();
      if (!text) throw new Error(`options[${index}].text обязателен`);
      return {
        text,
        isCorrect: parseBoolean(row.isCorrect, false),
        sortOrder: parseNumber(row.sortOrder, `options[${index}].sortOrder`, index + 1),
      };
    });
  }

  return splitEscaped(raw, ";").map((part, index) => {
    const [textPart, correctPart] = splitEscaped(part, "|");
    const text = unescapeOptionPart((textPart ?? "").trim());
    if (!text) throw new Error(`options[${index}]: пустой текст варианта`);
    return {
      text,
      isCorrect: parseBoolean(correctPart ?? "0", false),
      sortOrder: index + 1,
    };
  });
}

function parseQuestionType(value: unknown): TestQuestionFormValues["type"] {
  const type = String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
  const aliases: Record<string, TestQuestionFormValues["type"]> = {
    single_choice: "single_choice",
    single: "single_choice",
    один: "single_choice",
    одиночный: "single_choice",
    один_вариант: "single_choice",
    один_ответ: "single_choice",
    multiple_choice: "multiple_choice",
    multiple: "multiple_choice",
    несколько: "multiple_choice",
    множественный: "multiple_choice",
    несколько_вариантов: "multiple_choice",
    несколько_ответов: "multiple_choice",
    text: "text",
    текст: "text",
    текстовый: "text",
    текстовый_ответ: "text",
  };
  const resolved = aliases[type];
  if (!resolved || !QUESTION_TYPES.has(resolved)) {
    throw new Error(
      `Неизвестный тип вопроса: «${value}». Укажите: «один вариант», «несколько вариантов» или «текст»`,
    );
  }
  return resolved;
}

function rowToTransfer(
  row: TransferRow,
  headerMap: Partial<Record<CsvHeader, string>>,
  fallbackLessonId: number,
  rowIndex: number,
): TestQuestionTransfer {
  const get = (key: CsvHeader) => {
    const sourceKey = headerMap[key];
    return sourceKey ? row[sourceKey] : undefined;
  };

  const question = String(get("question") ?? "").trim();
  if (!question) {
    throw new Error(`Строка ${rowIndex}: пустой вопрос`);
  }

  const type = parseQuestionType(get("type"));
  const options = parseOptionsCell(get("options"));

  if (type !== "text" && options.length === 0) {
    throw new Error(`Строка ${rowIndex}: для choice-вопроса нужны варианты (options)`);
  }
  if (type === "text" && options.length > 0) {
    throw new Error(`Строка ${rowIndex}: для type=text варианты не нужны`);
  }
  if (type !== "text" && !options.some((option) => option.isCorrect)) {
    throw new Error(`Строка ${rowIndex}: нужен хотя бы один правильный вариант`);
  }

  const textAnswerRaw = get("textAnswer");
  const textAnswer =
    textAnswerRaw === undefined || textAnswerRaw === null || textAnswerRaw === ""
      ? null
      : String(textAnswerRaw);

  return {
    question,
    type,
    sortOrder: parseNumber(get("sortOrder"), "sortOrder", rowIndex),
    required: parseBoolean(get("required"), true),
    attachmentNeeded: parseBoolean(get("attachmentNeeded"), false),
    textAnswer,
    lessonId: parseNumber(get("lessonId"), "lessonId", fallbackLessonId),
    score: parseNumber(get("score"), "score", 1),
    options: type === "text" ? [] : options,
  };
}

function transfersToRows(
  questions: TestQuestionTransfer[],
): Record<CsvHeader, string>[] {
  return questions.map((question) => ({
    question: question.question,
    type: TYPE_EXPORT_LABELS[question.type],
    sortOrder: String(question.sortOrder),
    required: question.required ? "да" : "нет",
    attachmentNeeded: question.attachmentNeeded ? "да" : "нет",
    // Пустые поля как "" — иначе CSV без завершающей запятой ломает импорт
    textAnswer: question.textAnswer ?? "",
    lessonId: String(question.lessonId),
    score: String(question.score),
    options: serializeOptions(question.options ?? []),
  }));
}

function parseObjectRows(
  rows: TransferRow[],
  fields: string[],
  lessonId: number,
): TestQuestionTransfer[] {
  if (!rows.length) return [];
  const headerMap = mapHeaders(fields);
  if (!headerMap.question || !headerMap.type) {
    throw new Error(
      "В файле нужны столбцы «вопрос» и «тип» (или question и type)",
    );
  }

  const questions = rows
    .filter((row) =>
      Object.values(row).some(
        (value) => value !== undefined && value !== null && String(value).trim() !== "",
      ),
    )
    .map((row, index) => rowToTransfer(row, headerMap, lessonId, index + 1));

  const sortOrders = questions.map((question) => question.sortOrder);
  if (new Set(sortOrders).size !== sortOrders.length) {
    throw new Error("У вопросов sortOrder должен быть уникальным");
  }

  return questions;
}

/**
 * Импорт вопросов из CSV.
 * options: `Текст|1;Другой|0` или JSON `[{"text":"...","isCorrect":true,"sortOrder":1}]`
 */
export async function fromCsv(
  file: File,
  lessonId: number,
): Promise<TestQuestionTransfer[]> {
  const text = await file.text();
  const parsed = Papa.parse<TransferRow>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  // Excel/LibreOffice часто обрезают пустой последний столбец (options у text) —
  // TooFewFields / TooManyFields не мешают разбору строки.
  const fatal = parsed.errors.filter(
    (error) => error.code !== "TooFewFields" && error.code !== "TooManyFields",
  );
  if (fatal.length > 0) {
    const first = fatal[0];
    throw new Error(
      `CSV: ${first.message}${first.row != null ? ` (строка ${first.row + 1})` : ""}`,
    );
  }

  const fields = parsed.meta.fields ?? [];
  return parseObjectRows(parsed.data, fields, lessonId);
}

export function toCsv(questions: TestQuestionTransfer[]): File {
  const rows = transfersToRows(questions);
  const exportFields = CSV_HEADERS.map((header) => EXPORT_HEADERS[header]);
  // Массив массивов + quotes: сохраняет пустой последний столбец «варианты»
  const csv = Papa.unparse(
    {
      fields: exportFields,
      data: rows.map((row) => CSV_HEADERS.map((header) => row[header])),
    },
    { quotes: true },
  );
  const bom = "\uFEFF";
  return new File([bom + csv], "test-questions.csv", {
    type: "text/csv;charset=utf-8",
  });
}

export async function fromXlsx(
  file: File,
  lessonId: number,
): Promise<TestQuestionTransfer[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("В XLSX нет листов");
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<TransferRow>(sheet, {
    defval: "",
    raw: false,
  });
  if (!rows.length) return [];

  const fields = Object.keys(rows[0] ?? {});
  return parseObjectRows(rows, fields, lessonId);
}

export function toXlsx(questions: TestQuestionTransfer[]): File {
  const workbook = XLSX.utils.book_new();
  const rows = transfersToRows(questions).map((row) => {
    const labeled: Record<string, string> = {};
    for (const header of CSV_HEADERS) {
      labeled[EXPORT_HEADERS[header]] = row[header];
    }
    return labeled;
  });
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: CSV_HEADERS.map((header) => EXPORT_HEADERS[header]),
  });
  XLSX.utils.book_append_sheet(workbook, sheet, "Вопросы");
  const data = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;
  return new File([data], "test-questions.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
