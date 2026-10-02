"use client";
import { useParams, useSearchParams } from 'next/navigation'
import { useState, useEffect } from "react";
import { Course } from "@prisma/client";
import { CoursePartDto, LessonDto } from "@/app/lib/courseParts";
import CourseSidebar from "./CourseSidebar";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "../ui/drawer";
import { MenuIcon, XIcon } from 'lucide-react';
import { Button } from '../ui/button';
import LessonView from "../lessons/LessonView";
import {useRouter} from 'next/navigation';
import NotFound from "../layout/not-found";
import Loading from '../layout/loading';

export default function CourseView() {
    const params = useParams();
    const slug = params?.slug as string;
    const router = useRouter();
    const searchParams = useSearchParams();
    const [courseName, setCourseName] = useState<string | null>(null);
    const [courseParts, setCourseParts] = useState<CoursePartDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDesktop, setIsDesktop] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(0);
    const [lessonsList, setLessonsList] = useState<LessonDto[]>([]);
    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
    handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    const fetchCourse = async (signal: AbortSignal) => {
        try {
            const res = await fetch(`/api/course/${slug}/parts`, { signal });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error ?? "Не удалось загрузить курс");
            }
            if (!Array.isArray(data.parts)) {
                throw new Error("Некорректный ответ сервера");
            }
            setCourseName(data.courseName);
            setCourseParts(data.parts);
            setCanEdit(Boolean(data.canEdit));
            const lessons = (data.parts as CoursePartDto[]).flatMap(
                (part) => part.lessons,
            );
            setLessonsList(lessons);
            if (searchParams?.get("lessonId")) {
                const idx = lessons.findIndex(
                    (lesson: LessonDto) =>
                        lesson.id === parseInt(searchParams.get("lessonId") as string, 10),
                );
                setCurrentLessonIndex(idx >= 0 ? idx : 0);
            }
        } catch (err) {
            if (signal.aborted) return;
            const message = err instanceof Error ? err.message : "Ошибка загрузки";
            setError(message);
            if (message === "Не записан на курс") {
                router.push(`/courses/${slug}`);
            }
        } finally {
            if (!signal.aborted) setLoading(false);
        }
    };
    useEffect(() => {
        const controller = new AbortController();
        fetchCourse(controller.signal);
        return () => controller.abort();
    }, [slug]);
    const selectLesson = (lessonId: number) => {
        setCurrentLessonIndex(lessonsList.findIndex(lesson => lesson.id === lessonId));
        router.push(`/course/${slug}/learn?lessonId=${lessonId}`);
    };
    if (!slug) {
        return <NotFound text="Курс не найден" />;
    }

    if (loading) return <Loading text="Загрузка курса..." />;
    if (error) return <div className="flex flex-col items-center justify-center h-full min-h-screen container mx-auto px-4 pt-8 relative">Ошибка: {error}</div>;
    if (lessonsList.length === 0) {
        return <div className="flex flex-col items-center justify-center h-full min-h-screen container mx-auto px-4 pt-8 relative">В курсе пока нет уроков</div>;
    }
    const openedLessonId = lessonsList[currentLessonIndex]?.id ?? lessonsList[0].id;
    return  <div className='flex flex-col lg:flex-row container align-stretch mx-auto px-4 pt-8 min-h-screen relative'>
        {!isDesktop && (<Drawer  swipeDirection='left' modal={true} open={isOpen} onOpenChange={setIsOpen}>
            <DrawerTrigger className={`transition-all duration-300"`} render={
                <div className='flex gap-3 items-center'>
                <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">
                    <MenuIcon className="w-4 h-4" />
                </Button>
                <div className='text-xl font-bold'>Меню курса</div>
                </div>
                }>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{courseName}</DrawerTitle>
                </DrawerHeader>
                <DrawerContent>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
                    <CourseSidebar  courseParts={courseParts} courseName={courseName ?? ""} openedLessonId={openedLessonId} canEdit={canEdit} onLessonClick={selectLesson} />
                    </div>
                    <DrawerFooter>
                        <DrawerClose render={<Button className="cursor-pointer bg-black text-white hover:bg-gray-800 dark:hover:bg-gray-200 dark:bg-white dark:text-black">
                            Закрыть
                        </Button>} />
                    </DrawerFooter>
                </DrawerContent>
            </DrawerContent>
        </Drawer>)}
        {isDesktop && (<CourseSidebar courseParts={courseParts} courseName={courseName ?? ""} openedLessonId={openedLessonId} canEdit={canEdit} onLessonClick={selectLesson} />)}
        <div className='flex-1'>
            <LessonView
              canEdit={canEdit}
              lessonId={openedLessonId}
              prevLesson={currentLessonIndex > 0 ? lessonsList[currentLessonIndex - 1] : undefined}
              nextLesson={currentLessonIndex < lessonsList.length - 1 ? lessonsList[currentLessonIndex + 1] : undefined}
              partDeadline={
                courseParts.find((part) =>
                  part.lessons.some((lesson) => lesson.id === openedLessonId),
                )?.userProgress?.deadline ?? null
              }
              onArrowClick={selectLesson}
              onProgressUpdate={() => {
                fetchCourse(new AbortController().signal);
              }}
            />
            </div>
    </div>;
}