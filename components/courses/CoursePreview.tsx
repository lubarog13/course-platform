"use client";
import { CourseDto } from "@/app/lib/courses";
import MarkdownContent from "@/components/base/MarkdownContent";
import { Star, LockIcon, PlayIcon, XIcon, PencilIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { declOfNum } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { UserCourse } from "@prisma/client";
import { useSession } from "next-auth/react";

export function CoursePreview({ course }: { course: CourseDto }) {
  const router = useRouter();
  const {data: session, status} = useSession();
  const duration = useMemo(() => {
    const hours = Math.round(course.durationSeconds / 3600);
    const minutes = Math.round(course.durationSeconds / 60) % 60;
    return `${hours} ${declOfNum(hours, ["час", "часа", "часов"])} ${minutes} ${declOfNum(minutes, ["минута", "минуты", "минут"])}`;
  }, [course.durationSeconds]);
  const [enrollment, setEnrollment] = useState<UserCourse | null>(null);
  useEffect(() => {
    if (course.enrollments && course.enrollments.length > 0) {
      setEnrollment(course.enrollments[0]);
    }
  }, [course.enrollments]);

  const [isInstructor, setIsInstructor] = useState(false);
  useEffect(() => {
    if (session?.user?.id && course.instructors.some(instructor => instructor.userId === Number(session.user.id))) {
      setIsInstructor(true);
    }
  }, [session?.user?.id, course.instructors]);

  const [isDesktop, setIsDesktop] = useState(true);
  const [isEnrollmentDialogOpen, setIsEnrollmentDialogOpen] = useState(false);
  const [isEnrollmentLoading, setIsEnrollmentLoading] = useState(false);
  const [isDroppedDialogOpen, setIsDroppedDialogOpen] = useState(false);
  

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const createEnrollment = async () => {
    if (status === "unauthenticated" ) {
      router.push(`/login?redirect=/courses/${course.slug}`);
      return;
    }
    setIsEnrollmentLoading(true);
    const response = await fetch(`/api/enroll`, {
      method: "POST",
      body: JSON.stringify({ courseId: course.id, userId: session?.user?.id }),
    });
    if (response.ok) {
      if (course.needEnrollment) {
        setIsEnrollmentDialogOpen(true);
        response.json().then(data => {
          setEnrollment(data);
        });
      } else {
        router.push(`/courses/${course.slug}/learn`);
      }
    }
    setIsEnrollmentLoading(false);
  };

  return (
    <>
    <Dialog open={isEnrollmentDialogOpen} onOpenChange={setIsEnrollmentDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Заявка на курс подана</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Ваша заявка на зачисление в курс {course.name} подана. После одобрения вы получите доступ к курсу.
        </DialogDescription>
      </DialogContent>
    </Dialog>
    <Dialog open={isDroppedDialogOpen} onOpenChange={setIsDroppedDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Заявка отклонена</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Ваша заявка на зачисление в курс {course.name} отклонена. Обратитесь к администратору для уточнения причины.
        </DialogDescription>
      </DialogContent>
    </Dialog>
      <div className="container mx-auto max-w-6xl flex-1 px-4 py-8 flex relative">
        <div className="flex-1 pr-8">
          <img
            src={course.coverFile?.url || "/images/course-placeholder.jpeg"}
            alt={course.name}
            className="rounded-lg shadow-md w-full h-auto object-cover md:hidden mb-6 aspect-video"
          />

          {course.instructors?.length && (
            <div className="mb-6 text-xl text-gray-700 dark:text-gray-300">
              <b>Преподаватели:</b>
              <a
                href={`/instructor/${course.instructors[0].user.id}`}
                className="hover:underline"
              >
                {" "}
                {course.instructors
                  .map(
                    (instructor) =>
                      `${instructor.user.surname} ${instructor.user.name} ${instructor.user.patronymic}`,
                  )
                  .join(", ")}
              </a>
            </div>
          )}
          {!isDesktop && course.parts.length > 0 && (
            <h2 className="text-2xl font-bold mb-6 text-gray-700 dark:text-gray-300 mt-3">
              Части курса
            </h2>
          )}
          {!isDesktop &&
            course.parts
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((part, i) => (
                <div key={part.id} className="mb-4">
                  <h3 className="text-lg font-bold mb-2 text-gray-700 dark:text-gray-300">
                    {part.name}
                  </h3>
                  <MarkdownContent nodes={part.description ?? ""} />
                  {i < course.parts.length - 1 && (
                    <hr className="my-4 border-gray-200 dark:border-gray-700" />
                  )}
                </div>
              ))}
          <div className="h-12 md:hidden" />
          <MarkdownContent nodes={course.description ?? ""} />
        </div>
        <div className="grid grid-cols-2 md:block fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm w-full md:static md:border-l border-t md:border-t-0 border-gray-200 md:border-gray-300 dark:border-gray-700 p-4 md:p-0 md:pl-8 md:w-1/3">
          <img
            src={course.coverFile?.url || "/images/course-placeholder.jpeg"}
            alt={course.name}
            className="rounded-lg shadow-md w-full h-auto object-cover mb-8 aspect-video hidden md:block"
          />
          <div className="mb-4">
            <b>Опубликовано:</b>{" "}
            {course.publishedAt
              ? new Date(course.publishedAt).toLocaleDateString()
              : "Неизвестно"}
          </div>
          {course.updatedAt && (
            <div className="mb-4">
              <b>Обновлено:</b>{" "}
              {new Date(course.updatedAt).toLocaleDateString()}
            </div>
          )}
          <div className="mb-4">
            <b>Язык:</b> {course.language === "ru" ? "Русский" : "Английский"}
          </div>
          <a className="mb-4 block" href={`/courses?level=${course.level}`}>
            <b>Уровень:</b>{" "}
            {course.level === "beginner"
              ? "Начальный"
              : course.level === "intermediate"
                ? "Средний"
                : "Продвинутый"}
          </a>
          <a
            className="mb-4 block"
            href={`/courses/${course.category?.slug}`}
            target="_blank"
          >
            <b>Категория:</b> {course.category?.name}
          </a>
          <div className="mb-4 col-span-2">
            <b>Теги:</b>{" "}
            {course.tags.map((tag) => (
              <a
                href={`/courses?tags=${tag}`}
                key={tag}
                className="p-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-md mr-1 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {tag}
              </a>
            ))}
          </div>
          <div className="mb-4">
            <b className="mr-2">Рейтинг:</b>{" "}
            <Star className="w-4 h-4 inline-block " /> {course.rating || 0}
          </div>
          {course.deletedAt && (
            <div className="mb-4 text-red-500 dark:text-red-400">
              <b>Удалено:</b> {new Date(course.deletedAt).toLocaleDateString()}
            </div>
          )}
          {course.createdAt && (
            <div className="mb-4">
              <b>Длительность:</b> {duration}
            </div>
          )}
          {course.deadlineDays && (
            <div className="mb-4">
              <b>Время на прохождение:</b>{" "}
              {course.deadlineDays} {declOfNum(course.deadlineDays, ["день", "дня", "дней"])}
            </div>
          )}
          {!enrollment && !isInstructor && (
          <Button
            className="mb-4 col-span-2 h-12"
            variant={course.needEnrollment ? "default" : "outline"}
            onClick={createEnrollment}
            disabled={isEnrollmentLoading}
          >
            {course.needEnrollment ? (
              <LockIcon className="w-4 h-4 inline-block mr-2" />
            ) : (
              <PlayIcon className="w-4 h-4 inline-block mr-2" />
            )}{" "}
            {course.needEnrollment ? "Зарегестрироваться" : "Начать сейчас"}
            {isEnrollmentLoading && <Loader2 className="w-4 h-4 inline-block ml-2" />}
          </Button>
          )}
          {
            ((enrollment && enrollment.status === "enrolled") || isInstructor) && (
              <Button
                className="mb-4 col-span-2 h-12"
                variant="outline"
                onClick={() => router.push(`/course/${course.slug}/learn`)}
              >
                <PlayIcon className="w-4 h-4 inline-block mr-2" />
                Перейти к обучению
              </Button>
            )
          }
          {
            enrollment && enrollment.status === "pending" && (
              <Button
                className="mb-4 col-span-2 h-12"
                variant="outline"
                disabled={true}
              >
                <Loader2 className="w-4 h-4 inline-block mr-2" />
                Ожидание одобрения
              </Button>
            )
          }
          {
            enrollment && enrollment.status === "dropped" && (
              <Button
                className="mb-4 col-span-2 h-12"
                variant="outline"
                onClick={() => setIsDroppedDialogOpen(true)}
              >
                <XIcon className="w-4 h-4 inline-block mr-2" />
                Заявка отклонена
              </Button>
            )
          }
          {
            isInstructor && (
              <Button
                className="mb-4 col-span-2 h-12"
                variant="outline"
                onClick={() => router.push(`/editor/?courseId=${course.id}`)}
              >
                <PencilIcon className="w-4 h-4 inline-block mr-2" />
                Редактировать курс
              </Button>
            )
          }
          {isDesktop && course.parts.length > 0 && (
            <h2 className="text-2xl font-bold mb-6 text-gray-700 dark:text-gray-300 mt-3">
              Части курса
            </h2>
          )}
          {isDesktop &&
            course.parts
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((part, i) => (
                <div key={part.id}>
                  <h3 className="text-lg font-bold mb-2 text-gray-700 dark:text-gray-300">
                    {part.name}
                  </h3>
                  <MarkdownContent nodes={part.description ?? ""} />
                  {i < course.parts.length - 1 && (
                    <hr className="my-4 border-gray-200 dark:border-gray-700" />
                  )}
                </div>
              ))}
        </div>
      </div>
    </>
  );
}
