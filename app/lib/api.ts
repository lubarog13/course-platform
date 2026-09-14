import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function prismaErrorResponse(error: unknown, entity = "Запись") {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return jsonError(`${entity}: конфликт уникальности`, 409);
    }
    if (error.code === "P2003") {
      return jsonError(`${entity}: некорректная ссылка`, 400);
    }
    if (error.code === "P2025") {
      return jsonError(`${entity} не найдена`, 404);
    }
  }
  if (error instanceof Error && (error.message.startsWith("Поле") || error.message.startsWith("Ожидается"))) {
    return jsonError(error.message, 400);
  }
  console.error(error);
  return jsonError("Внутренняя ошибка сервера", 500);
}

export function asOptionalString(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`Поле ${field} должно быть строкой`);
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function asRequiredString(value: unknown, field: string): string {
  const result = asOptionalString(value, field);
  if (!result) {
    throw new Error(`Поле ${field} обязательно`);
  }
  return result;
}

export function asBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(`Поле ${field} должно быть boolean`);
  }
  return value;
}

export function asOptionalId(
  value: unknown,
  field: string,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Поле ${field} должно быть положительным целым числом`);
  }
  return value;
}

export function asRequiredId(value: unknown, field: string): number {
  const result = asOptionalId(value, field);
  if (result === undefined || result === null) {
    throw new Error(`Поле ${field} обязательно`);
  }
  return result;
}

export function asOptionalInt(
  value: unknown,
  field: string,
  min = 0,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    throw new Error(`Поле ${field} должно быть целым числом ≥ ${min}`);
  }
  return value;
}

export function asRequiredInt(value: unknown, field: string, min = 0): number {
  const result = asOptionalInt(value, field, min);
  if (result === undefined || result === null) {
    throw new Error(`Поле ${field} обязательно`);
  }
  return result;
}

export function parseNumericId(id: string): number {
  if (!/^\d+$/.test(id)) {
    throw new Error("Некорректный id");
  }
  return Number(id);
}

export function requireObject(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Ожидается JSON-объект");
  }
  return body as Record<string, unknown>;
}
