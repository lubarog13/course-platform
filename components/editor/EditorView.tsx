"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { LessonFullDto } from "@/app/lib/lessons";
import LessonEdit from "../lessons/LessonEdit";
import Loading from "../layout/loading";
import NotFound from "../layout/not-found";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { CourseFullDto } from "@/app/lib/courses";
import CourseEdit from "../courses/CourseEdit";

function createDefaultLesson(overrides?: Partial<LessonFullDto>): LessonFullDto {
  return {
    id: -1,
    name: "",
    description: "",
    textContent: "",
    type: "text",
    video: null,
    attachment: null,
    attachmentId: null,
    coursePartId: null,
    sortOrder: 1,
    videoId: null,
    points: 0,
    durationSeconds: null,
    timeLimitSeconds: null,
    passingScore: null,
    reviewEnabled: true,
    manualGrading: false,
    maxAttempts: null,
    publishedAt: null,
    deletedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    testQuestions: [],
    ...overrides,
  };
}

function createDefaultCourse(): CourseFullDto {
  return {
    id: -1,
    name: "",
    description: "",
    tags: [],
    categoryId: null,
    deadlineDays: null,
    needEnrollment: false,
    durationSeconds: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    publishedAt: null,
    deletedAt: null,
    slug: "",
    language: "ru",
    level: "beginner",
    coverFile: null,
    coverFileId: null,
    rating: null,
    ratingCount: 0,
    courseParts: [],
  };
}

export default function EditorView() {
  const [lesson, setLesson] = useState<LessonFullDto | null>(null);
  const [course, setCourse] = useState<CourseFullDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const lessonIdParam = searchParams?.get("lessonId");
  const courseIdParam = searchParams?.get("courseId");
  const type = searchParams?.get("type") ?? "";
  const lessonId = lessonIdParam && /^\d+$/.test(lessonIdParam) ? Number(lessonIdParam) : -1;
  const courseId = courseIdParam && /^\d+$/.test(courseIdParam) ? Number(courseIdParam) : -1;

  const userId = useMemo(() => {
    if (status !== "authenticated" || !session?.user?.id) return null;
    const parsed = Number(session.user.id);
    return Number.isFinite(parsed) ? parsed : null;
  }, [session?.user?.id, status]);

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated") {
      router.push("/auth/signin");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setLesson(null);
    setCourse(null);

    const run = async () => {
      try {
        if (lessonId === -1 && courseId === -1) {
          if (type === "lesson") {
            const coursePartIdRaw = searchParams?.get("coursePartId");
            const sortOrderRaw = searchParams?.get("sortOrder");
            setLesson(
              createDefaultLesson({
                coursePartId:
                  coursePartIdRaw && /^\d+$/.test(coursePartIdRaw)
                    ? Number(coursePartIdRaw)
                    : null,
                sortOrder:
                  sortOrderRaw && /^\d+$/.test(sortOrderRaw)
                    ? Number(sortOrderRaw)
                    : 1,
              }),
            );
            return;
          }
          if (type === "course") {
            setCourse(createDefaultCourse());
            return;
          }
          setError("Нечего редактировать");
          return;
        }

        if (lessonId === -1 && courseId > 0) {
          const res = await fetch(`/api/course/${courseId}`, {
            signal: controller.signal,
          });
          if (res.status === 401) {
            setError("Этот курс доступен только для преподавателей");
            return;
          }
          if (!res.ok) {
            throw new Error("Не удалось загрузить курс");
          }
          const data = (await res.json()) as CourseFullDto & {
            parts?: CourseFullDto["courseParts"];
          };
          setCourse({
            ...data,
            courseParts: data.courseParts ?? data.parts ?? [],
          });
          return;
        }

        const res = await fetch(
          `/api/lesson/${lessonId}?includeCorrect=1&testIsTeacher=1`,
          { signal: controller.signal },
        );
        if (res.status === 401) {
          setError("Этот раздел доступен только для преподавателей");
          return;
        }
        if (!res.ok) {
          throw new Error("Не удалось загрузить урок");
        }
        setLesson((await res.json()) as LessonFullDto);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void run();
    return () => controller.abort();
  }, [lessonId, courseId, type, status, router, searchParams]);

  if (status === "loading" || loading) {
    return <Loading text="Загрузка материала..." />;
  }

  if (error) {
    return <NotFound text={error} showHomeButton={true} />;
  }

  if (userId === null) {
    return <NotFound text="Этот раздел доступен только для преподавателей" />;
  }

  return (
    <div className="py-2">
      {lesson ? (
        <LessonEdit
          key={`lesson-${lesson.id < 1 ? "new" : lesson.id}`}
          lesson={lesson}
          isNew={lesson.id < 1}
          onSaved={(saved) => {
            setLesson(saved);
            if (saved.id > 0) {
              router.replace(`/editor?lessonId=${saved.id}`);
            }
          }}
          userId={userId}
        />
      ) : course ? (
        <CourseEdit
          key={`course-${course.id < 1 ? "new" : course.id}`}
          course={course}
          isNew={course.id < 1}
          onSaved={(saved) => {
            setCourse(saved);
            if (saved.id > 0) {
              router.replace(`/editor?courseId=${saved.id}`);
            }
          }}
          userId={userId}
        />
      ) : (
        <NotFound text="Материал не найден" showHomeButton={true} />
      )}
    </div>
  );
}
