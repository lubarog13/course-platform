import { CourseReview } from "@prisma/client";
import { z } from "zod";

export const reviewFormSchema = z.object({
  rating: z
    .number()
    .min(1, "Поставьте оценку от 1 до 5")
    .max(5, "Поставьте оценку от 1 до 5"),
  comment: z
    .string()
    .trim()
    .min(1, "Напишите комментарий")
    .max(500, "Комментарий должен быть не более 500 символов"),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

export function toReviewFormValues(review: Pick<CourseReview, "rating" | "comment">): ReviewFormValues {
  return {
    rating: review.rating,
    comment: review.comment ?? "",
  };
}
