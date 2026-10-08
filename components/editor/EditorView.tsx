"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { LessonFullDto } from "@/app/lib/lessons";
import LessonEdit from "../lessons/LessonEdit";
import Loading from "../layout/loading";
import NotFound from "../layout/not-found";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { CourseFullDto } from "@/app/lib/courses";
import CourseEdit from "../courses/CourseEdit";

export default function EditorView() {
    const [lesson, setLesson] = useState<LessonFullDto | null>(null);
    const [course, setCourse] = useState<CourseFullDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const lessonId = searchParams?.get("lessonId") ?? -1;
    const courseId = parseInt(searchParams?.get("courseId") ?? "-1");
    const type = searchParams?.get("type") ?? "";
    const [userId, setuserId] = useState<number | null>(null);
    const {data: session, status} = useSession();
    //ToDo Получение userId из пользователя
    useEffect(() => {
        if (status === "authenticated") {
            setuserId(parseInt(session?.user?.id ?? "0"));
        }
    }, [status]);
    const defaultLesson: LessonFullDto = {
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
        createdAt: new Date(),
        updatedAt: new Date(),
        testQuestions: [],
    };

    const defaultCourse: CourseFullDto = {
        id: -1,
        name: "",
        description: "",
        tags: [],
        categoryId: null,
        deadlineDays: null,
        needEnrollment: false,
        durationSeconds: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
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
    const fetchCourse = async (signal: AbortSignal) => {
        if (courseId === -1) {
            setLoading(false);
            setError("Нечего редактировать");
            return;
        }
        if (status!== "authenticated") {
            router.push("/auth/signin");
            return;
        }
        await fetch(`/api/course/${courseId}`)
            .then(res => {
                if (res.status === 401) {
                    setError("Этот курс доступен только для преподавателей");
                    return;
                }
                return res.json();
            })
            .then(data => {
                setCourse(data);
            })
            .catch(error => {
                setError(error.message);
            }).finally(() => {
                if (!signal.aborted) setLoading(false);
            });
        };
    if (searchParams?.get("coursePartId")) {
        try {
            defaultLesson.coursePartId = parseInt(searchParams.get("coursePartId") ?? "0");
        } catch (error) {
            
        }
    }
    if (searchParams.get("sortOrder")) {
        try {
            defaultLesson.sortOrder = parseInt(searchParams.get("sortOrder") ?? "0");
        } catch (error) {
        }
    }

    const fetchLesson = async (signal: AbortSignal) => {
        if (lessonId === -1 && courseId === -1) {
            if (type === "lesson") {
                setLesson(defaultLesson);
                setTimeout(() => {
                    setLoading(false);
                }, 200);
                return;
            } 
            if (type === "course") {
                setCourse(defaultCourse);
                setTimeout(() => {
                    setLoading(false);
                }, 200);
                return;
            }
            setLoading(false);
            setError("Нечего редактировать");
            return;
        } else if (lessonId === -1) {
            await fetchCourse(signal);
            return;
        }
        if (status!== "authenticated") {
            router.push("/auth/signin");
            return;
        }
        await fetch(`/api/lesson/${lessonId}?includeCorrect=1&testIsTeacher=1`)
            .then(res => {
                if (res.status === 401) {
                    setError("Этот раздел доступен только для преподавателей");
                    return;
                }
                return res.json();
            })
            .then(data => {
                setLesson(data);
            })
            .catch(error => {
                setError(error.message);
            }).finally(() => {
                if (!signal.aborted) setLoading(false);
            });
        };
    useEffect(() => {
            const controller = new AbortController();
            fetchLesson(controller.signal);
            return () => controller.abort();
    }, [lessonId, courseId]);
    if (loading) {
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
          <LessonEdit lesson={lesson} isNew={lessonId == -1} onSaved={setLesson} userId={userId} />
        ) : course ? (
          <CourseEdit course={course} isNew={courseId == -1} onSaved={setCourse} userId={userId} />
        ) : (
          <NotFound text="Материал не найден" showHomeButton={true} />
        )}
      </div>
    );
}