import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewDto } from "@/app/lib/reviews";
import { Rating } from "../ui/rating";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Trash2Icon, FlagIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

/** Sample для skullet — форма карточки отзыва при загрузке. */
export const SAMPLE_REVIEW: ReviewDto = {
  id: -1,
  courseId: -1,
  userId: -1,
  rating: 5,
  comment:
    "Пример текста отзыва о курсе. Здесь будет реальный комментарий студента после загрузки.",
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    id: -1,
    name: "Имя",
    surname: "Фамилия",
    patronymic: null,
    role: "student",
  },
};

export const CourseReviewCard = ({
  review,
  modal,
  canDelete,
  onClick,
  setReportOpen,
  hideReport = false,
}: {
  review: ReviewDto;
  modal: boolean;
  canDelete: boolean;
  onClick: () => void;
  setReportOpen: () => void;
  hideReport?: boolean;
}) => {
  return (
    <>
      <Card
        className={cn(
          "w-full mx-auto p-4 rounded-3xl ring-0 border",
          modal ? "border-none" : "",
        )}
        onClick={modal ? undefined : onClick}
      >
        <CardContent className="flex flex-col gap-10 p-0">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-7!">
                <AvatarImage src="/images/profile.svg" className="dark:hidden" />
                <AvatarImage
                  src="/images/profile-white.svg"
                  className="hidden dark:block"
                />
                <AvatarFallback>{review.user.name}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg text-foreground">{review.user.name}</p>
                <p className="text-sm text-muted-foreground">
                  {review.user.role === "student"
                    ? "Студент курса"
                    : "Преподаватель курса"}
                </p>
              </div>
            </div>
            <p
              className={cn(
                "text-base text-foreground",
                modal ? "" : "line-clamp-3",
              )}
            >
              {review.comment}
            </p>
          </div>
          <div className="flex items-center lg:items-center gap-2">
            <Rating value={review.rating} size={14} readOnly />
            <p className="text-sm text-muted-foreground">
              {review.rating} из 5
            </p>
            {!hideReport && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      className="ml-auto"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setReportOpen();
                      }}
                    >
                      <FlagIcon className="w-10 h-10" />
                    </Button>
                  }
                />
                <TooltipContent>Пожаловаться на отзыв</TooltipContent>
              </Tooltip>
            )}
          </div>
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClick();
              }}
            >
              <Trash2Icon className="w-4 h-4" /> Удалить отзыв
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  );
};
