"use client";

import type { ReviewDto } from "@/app/lib/reviews";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { CourseReviewCard, SAMPLE_REVIEW } from "@/components/courses/CourseReviewCard";

const SAMPLE_REVIEWS: ReviewDto[] = [
  { ...SAMPLE_REVIEW, id: -1 },
  {
    ...SAMPLE_REVIEW,
    id: -2,
    rating: 4,
    comment:
      "Структура курса понятная, уроки короткие и содержательные. Удобно заниматься вечерами.",
    user: { ...SAMPLE_REVIEW.user, name: "Анна", surname: "Иванова" },
  },
  {
    ...SAMPLE_REVIEW,
    id: -3,
    rating: 5,
    comment:
      "Понравились тесты и обратная связь преподавателя. После курса получил сертификат.",
    user: { ...SAMPLE_REVIEW.user, name: "Пётр", surname: "Смирнов" },
  },
];

export default function HomeReviews({ reviews }: { reviews: ReviewDto[] }) {
  const items = reviews.length > 0 ? reviews : SAMPLE_REVIEWS;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <h2 className="text-center text-2xl font-semibold tracking-tight">
        Отзывы слушателей
      </h2>
      <p className="mx-auto mt-2 mb-8 max-w-2xl text-center text-muted-foreground">
        Что говорят те, кто уже проходит курсы на платформе
      </p>
      <Carousel opts={{ align: "start" }} className="w-full max-w-full">
        <CarouselContent>
          {items.map((review) => (
            <CarouselItem
              key={review.id}
              className="basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <div className="p-1">
                <CourseReviewCard
                  review={review}
                  modal={false}
                  canDelete={false}
                  hideReport
                  onClick={() => {}}
                  setReportOpen={() => {}}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {items.length > 3 && <CarouselPrevious />}
        {items.length > 3 && <CarouselNext />}
      </Carousel>
    </section>
  );
}
