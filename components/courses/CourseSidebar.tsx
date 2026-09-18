"use client";
import { CoursePartDto } from "@/app/lib/courseParts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { LessonDto } from "@/app/lib/courseParts";
import { useRouter } from "next/navigation";
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
  } from "@/components/ui/item";
import { BookOpenText, SquarePlay, PenLine, CircleDashedCheck } from "lucide-react";
export default function CourseSidebar({courseParts, courseName, openedLessonId, onLessonClick}: {courseParts: CoursePartDto[], courseName: string, openedLessonId: number | null, onLessonClick: (lessonId: number) => void}) {
    const [openedIndex, setOpenedIndex] = useState<number | null>(null);
    const router = useRouter();
    const openLessonChange = () => {
        setOpenedIndex(courseParts.findIndex((coursePart) => coursePart.lessons.some((lesson) => lesson.id === openedLessonId)));
    }
    useEffect(() => {
        console.log(openedLessonId);
        setTimeout(() => {
            openLessonChange();
        }, 0);
    }, [openedLessonId, courseParts]);
    const lessonIcon = (lesson: LessonDto) => {
        if (lesson.type === "video") {
            return <SquarePlay className="w-4 h-4" />;
        }
        if (lesson.type === "text") {
            return <BookOpenText className="w-4 h-4" />;
        }
        return <PenLine className="w-4 h-4" />;
    };
    const lessonDuration = (lesson: LessonDto) => {
        const hours = Math.floor((lesson.durationSeconds ?? 0) / 3600);
        const minutes = Math.floor(((lesson.durationSeconds ?? 0) % 3600) / 60);
        const seconds = (lesson.durationSeconds ?? 0) % 60;
        if (hours > 0) {
            return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };
    const handleAddLesson = (coursePartId: number, sortOrder: number) => {
        router.push(`/editor?type=lesson&coursePartId=${coursePartId}&sortOrder=${sortOrder}`);
    }
    return (
        <div className="lg:border-r border-gray-200 p-4 pr-6 flex flex-col w-full lg:w-1/4 min-w-[300px]">
            <h1 className="mb-6 text-2xl font-bold">{courseName}</h1>
            <div className="flex flex-col gap-2">
                {courseParts.map((coursePart, index) => (
                        <Collapsible className="mb-4" key={coursePart.id} open={openedIndex === index} onOpenChange={(open) => setOpenedIndex(open ? index : null)}>
                            <CollapsibleTrigger className="flex items-center gap-3 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                                <h2 className="text-lg text-left">{coursePart.name}</h2>
                                <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform ${openedIndex === index ? "rotate-180" : ""}`} />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="flex flex-col gap-2 mt-4">
                                    {coursePart.lessons.map((lesson) => (
                                        <Item className="cursor-pointer items-start" key={lesson.id} onClick={() => onLessonClick(lesson.id)}>
                                            <ItemMedia variant="icon">
                                                {lessonIcon(lesson)}
                                            </ItemMedia>
                                            <ItemContent>
                                                <ItemTitle className={lesson.id === openedLessonId ? 'font-bold' : ''}>{lesson.name}</ItemTitle>
                                                <ItemDescription>{lesson.description}</ItemDescription>
                                            </ItemContent>
                                            <ItemContent>
                                                <ItemDescription>{lessonDuration(lesson)}</ItemDescription>
                                                <ItemDescription>
                                                    <span className="flex items-center gap-2"><CircleDashedCheck className="w-4 h-4" />
                                                    {lesson.points ?? 0}</span>
                                                </ItemDescription>
                                            </ItemContent>
                                        </Item>
                                    ))}
                                    <Item className="cursor-pointer items-start bg-gray-100 dark:bg-gray-800 rounded-lg p-2" onClick={() => handleAddLesson(coursePart.id, coursePart.lessons.length + 1)}>
                                        <ItemMedia variant="icon">
                                            <PlusCircle className="w-10 h-10" />
                                        </ItemMedia>
                                        <ItemContent>
                                            <ItemTitle>Добавить урок</ItemTitle>
                                        </ItemContent>
                                    </Item>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                ))}
            </div>
        </div>
    );
}