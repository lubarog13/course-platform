"use client";

import { ReviewDto } from "@/app/lib/reviews";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { CourseReviewCard } from "./CourseReviewCard";
import { useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { useSession } from "next-auth/react";

export function CourseReviewCarousel({
  reviews,
  onDeleted,
}: {
  reviews: ReviewDto[];
  onDeleted?: (reviewId: number) => void;
}) {
  const [modalItem, setModalItem] = useState<ReviewDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data: session } = useSession();

  const canDelete =
    modalItem != null &&
    (session?.user?.role === "admin" ||
      modalItem.user.id.toString() === session?.user?.id);

  const handleDelete = async () => {
    if (!modalItem || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/review?id=${modalItem.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось удалить отзыв");
      }
      onDeleted?.(modalItem.id);
      setModalItem(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <hr className="my-6" />
      <h2 className="text-2xl font-bold mb-3 text-gray-700 dark:text-gray-300">
        Отзывы о курсе
      </h2>
      <Carousel
        opts={{
          align: "start",
        }}
        className="w-full max-w-full"
      >
        <CarouselContent>
          {reviews.map((review) => (
            <CarouselItem
              key={review.id}
              className="basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <div className="p-1">
                <CourseReviewCard
                  review={review}
                  modal={false}
                  canDelete={false}
                  onClick={() => setModalItem(review)}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {reviews.length > 3 && <CarouselPrevious />}
        {reviews.length > 3 && <CarouselNext />}
      </Carousel>
      {modalItem && (
        <Dialog
          open={modalItem !== null}
          onOpenChange={(open) => {
            if (!open) {
              setModalItem(null);
              setDeleteError(null);
            }
          }}
        >
          <DialogContent>
            <CourseReviewCard
              review={modalItem}
              modal={true}
              canDelete={canDelete}
              onClick={() => {
                void handleDelete();
              }}
            />
            {deleting && (
              <p className="text-sm text-muted-foreground">Удаление…</p>
            )}
            {deleteError && (
              <p className="text-sm text-destructive" role="alert">
                {deleteError}
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
