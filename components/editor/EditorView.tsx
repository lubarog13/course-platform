"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LessonFullDto } from "@/app/lib/lessons";
import LessonEdit from "../lessons/LessonEdit";
import Loading from "../layout/loading";
import NotFound from "../layout/not-found";

export default function EditorView() {
    const [lesson, setLesson] = useState<LessonFullDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const lessonId = searchParams?.get("lessonId") ?? -1;
    const type = searchParams?.get("type") ?? "";
    const [userId, setuserId] = useState<number | null>(null);
    //ToDo Получение userId из пользователя
    useEffect(() => {
        setuserId(1);
    }, []);
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
        if (lessonId === -1) {
            setLoading(false);
            if (type === "lesson") {
                setLesson(defaultLesson);
                setLoading(false);
                return;
            } 
            setError("Нечего редактировать");
            return;
        }
        await fetch(`/api/lesson/${lessonId}`)
            .then(res => res.json())
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
    }, [lessonId]);
    if (loading) {
        return <Loading text="Загрузка урока..." />;
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
        ) : (
          <NotFound text="Урок не найден" showHomeButton={true} />
        )}
      </div>
    );
}