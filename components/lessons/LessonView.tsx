"use client";

import { useEffect, useState } from "react";
import { LessonFullDto } from "@/app/lib/lessons";
import { LessonDto } from "@/app/lib/courseParts";
import { Button } from "../ui/button";
import { ArrowLeftIcon, ArrowRightIcon, EditIcon, FileIcon } from "lucide-react";
import MarkdownContent from "../base/MarkdownContent";
import TestView from "./TestView";
import VideoView from "./VideoView";
import NotFound from "../layout/not-found";
import Loading from "../layout/loading";
import { useRouter } from "next/navigation";

type LessonViewProps = {
    canEdit: boolean;
    lessonId: number;
    prevLesson?: LessonDto,
    nextLesson? : LessonDto,
    onArrowClick: (lessonId: number) => void;
}

export default function LessonView({lessonId, prevLesson, nextLesson, canEdit, onArrowClick}: LessonViewProps) {
    const [lesson, setLesson] = useState<LessonFullDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const fetchLesson = async (signal: AbortSignal) => {
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
    if (!lesson) {
        return <NotFound text="Урок не найден" showHomeButton={false} />;
    }
    if (loading) {
        return <Loading text="Загрузка урока..." />;
    }
    if (error) {
        return <div>Ошибка: {error}</div>;
    }
    const handleEdit = () => {
        router.push(`/editor?lessonId=${lessonId}`);
    }
    return (
        <div className="flex flex-col gap-4 container mx-auto sm:px-4 pt-8 min-h-screen relative">
            <div className="flex lg:flex-nowrap flex-wrap justify-between gap-4  border-b border-gray-200 dark:border-gray-800 pb-4">
                {
                    prevLesson? <div className="flex items-center gap-2 h-10">
                        <Button variant="outline" onClick={() => onArrowClick(prevLesson?.id || 0)} className="rounded-full h-10 w-10 cursor-pointer">
                    <ArrowLeftIcon className="w-4 h-4" />
                </Button>
                <div className="hidden sm:block max-w-48 text-left overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {prevLesson.name}
                            </div>
                </div> : <div className="flex items-center h-10"><Button variant="outline" disabled className="rounded-full h-10 w-10"> <ArrowLeftIcon className="w-4 h-4" /></Button></div>}
                {
                    nextLesson? 
                    <div className="flex items-center gap-2 h-10 lg:order-last  ml-auto">
                        <div className="hidden sm:block max-w-48 text-left overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {nextLesson.name}
                            </div>
                         <Button variant="outline" onClick={() => onArrowClick(nextLesson?.id || 0)} className="rounded-full h-10 w-10 cursor-pointer">
                    <ArrowRightIcon className="w-4 h-4" />
                </Button></div> : <div className="h-10"><Button variant="outline" disabled className="rounded-full h-10 w-10"> <ArrowRightIcon className="w-4 h-4" /></Button></div>}
                <div className="text-2xl font-bold lg:flex-1 text-center w-full lg:w-auto flex-shrink-0  order-first lg:order-none">{lesson.name}</div>
            </div>
            <div className="flex-1 p-6 relative">
                <div className="text-gray-700 dark:text-gray-300 mb-4">
                    {lesson.description}
                </div>
                {lesson.attachment && (
                    <div className="flex items-center gap-2">
                        <FileIcon className="w-4 h-4" />
                        <a href={lesson.attachment.url} target="_blank" className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-500">
                            {lesson.attachment.originalName}
                        </a>
                    </div>
                )
                }
                {
                    lesson.type === "text" && <MarkdownContent nodes={lesson.textContent || ""} />
                }
                {
                    lesson.type === "test" && <TestView lesson={lesson} />
                }
                {lesson.type === "video" && <VideoView lesson={lesson} />}
            
            {canEdit && <Button variant="secondary" size="icon-lg" className="absolute right-4 top-4 cursor-pointer rounded-full" onClick={handleEdit}>
                <EditIcon className="w-10 h-10" />
                </Button>}
            </div>
            
            </div>
    );
}