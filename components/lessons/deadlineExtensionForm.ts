import { z } from "zod";

export function createDeadlineExtensionFormSchema(maxDays: number) {
  const limit = Math.max(0, maxDays);

  return z.object({
    reason: z
      .string()
      .trim()
      .min(10, "Причина продления должна быть не менее 10 символов")
      .max(500, "Причина продления должна быть не более 500 символов"),
    requestedDays: z.coerce
      .number({
        error: "Укажите количество дней продления",
      })
      .int("Количество дней должно быть целым числом")
      .min(1, "Количество дней продления должно быть не менее 1 дня")
      .max(
        limit,
        limit > 0
          ? `Количество дней продления должно быть не более ${limit} дней`
          : "Продление срока недоступно",
      ),
  });
}

export type DeadlineExtensionFormValues = z.infer<
  ReturnType<typeof createDeadlineExtensionFormSchema>
>;

export const defaultDeadlineExtensionValues: DeadlineExtensionFormValues = {
  reason: "",
  requestedDays: 1,
};
