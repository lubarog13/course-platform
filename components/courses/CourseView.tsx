"use client";
import { useParams, useSearchParams } from 'next/navigation'
import { useState, useEffect } from "react";
import { Course } from "@prisma/client";
import { CoursePartDto, LessonDto } from "@/app/lib/courseParts";
import CourseSidebar from "./CourseSidebar";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "../ui/drawer";
import { MenuIcon, XIcon } from 'lucide-react';
import { Button } from '../ui/button';
import LessonView, { LessonViewSkeleton } from "../lessons/LessonView";
import {useRouter} from 'next/navigation';
import NotFound from "../layout/not-found";
import LessonProgress from "../lessons/LessonProgress";
import { useSession } from "next-auth/react";
import { Skeleton } from "../ui/skeleton";

function CourseViewSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row max-w-7xl align-stretch mx-auto px-4 pt-8 min-h-screen relative">
      <div className="hidden lg:flex flex-col w-1/4 min-w-[300px] border-r border-gray-200 p-4 pr-6 gap-4">
        <Skeleton className="h-8 w-48 mb-2" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-md shrink-0" />
          <Skeleton className="h-5 w-36" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 mt-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-28" />
            <div className="flex flex-col gap-2 pl-1">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-[85%] rounded-md" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex lg:hidden gap-3 items-center mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="flex-1">
        <LessonViewSkeleton />
      </div>
    </div>
  );
}

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
    const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(-1);
    const [openedLessonId, setOpenedLessonId] = useState<number | null>(null);
    const [lessonsList, setLessonsList] = useState<LessonDto[]>([]);
    const {data: session} = useSession();
    const user = session?.user;
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
            // Не трогаем openedLessonId здесь: иначе refresh прогресса
            // откатывает выбор на устаревший searchParams до применения router.push.
            setLessonsList(lessons);
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

    // Синхронизация выбранного урока с URL (после клика / назад-вперёд)
    useEffect(() => {
        const raw = searchParams?.get("lessonId");
        if (!raw) return;
        const id = Number.parseInt(raw, 10);
        if (!Number.isFinite(id)) return;
        setOpenedLessonId(id);
        setCurrentLessonIndex((prev) => {
            const idx = lessonsList.findIndex((lesson) => lesson.id === id);
            return idx >= 0 ? idx : prev;
        });
    }, [searchParams]);

    // Первичный выбор / восстановление после загрузки списка уроков
    useEffect(() => {
        if (lessonsList.length === 0) return;
        setOpenedLessonId((prev) => {
            if (prev != null && lessonsList.some((lesson) => lesson.id === prev)) {
                const idx = lessonsList.findIndex((lesson) => lesson.id === prev);
                setCurrentLessonIndex(idx);
                return prev;
            }
            const raw = searchParams?.get("lessonId");
            const rawPartId = searchParams?.get("partId");
            const fromUrl = raw ? Number.parseInt(raw, 10) : NaN;
            const fromUrlPartId = rawPartId ? Number.parseInt(rawPartId, 10) : NaN;
            const urlIdx = lessonsList.findIndex((lesson) => lesson.id === fromUrl);
            if (urlIdx >= 0) {
                setCurrentLessonIndex(urlIdx);
                return lessonsList[urlIdx]!.id;
            }
            const partIdx = courseParts.findIndex((part) => part.id === fromUrlPartId);
            if (partIdx >= 0) {
                const firstLessonId = courseParts[partIdx]!.lessons[0]!.id;
                setCurrentLessonIndex(lessonsList.findIndex((lesson) => lesson.id === firstLessonId));
                return firstLessonId;
            }
            setCurrentLessonIndex(-1);
            return null;
        });
    }, [lessonsList]);

    const selectLesson = (lessonId: number | null) => {
        if (lessonId === null) {
            setOpenedLessonId(null);
            router.push(`/course/${slug}/learn`);
            setIsOpen(false);
            return;
        }
        const idx = lessonsList.findIndex((lesson) => lesson.id === lessonId);
        setCurrentLessonIndex(idx >= 0 ? idx : 0);
        setOpenedLessonId(lessonId);
        router.push(`/course/${slug}/learn?lessonId=${lessonId}`);
        setIsOpen(false);
    };
    if (!slug) {
        return <NotFound text="Курс не найден" />;
    }

    if (loading) return <CourseViewSkeleton />;
    if (error) return <div className="flex flex-col items-center justify-center h-full min-h-screen container mx-auto px-4 pt-8 relative">Ошибка: {error}</div>;
    if (lessonsList.length === 0 && (user?.role === "student" || !user)) {
        return <div className="flex flex-col items-center justify-center h-full min-h-screen container mx-auto px-4 pt-8 relative">В курсе пока нет уроков</div>;
    }
    return  <div className='flex flex-col lg:flex-row max-w-7xl align-stretch mx-auto px-4 pt-8 min-h-screen relative'>
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
            {openedLessonId? (
            <LessonView
              canEdit={canEdit}
              lessonId={openedLessonId ?? lessonsList[0].id}
              prevLesson={currentLessonIndex > 0 ? lessonsList[currentLessonIndex - 1] : undefined}
              nextLesson={currentLessonIndex < lessonsList.length - 1 ? lessonsList[currentLessonIndex + 1] : undefined}
              partDeadline={
                courseParts.find((part) =>
                  part.lessons.some((lesson) => lesson.id === openedLessonId),
                )?.userProgress?.deadline ?? null
              }
              deadlineDays={
                courseParts.find((part) =>
                  part.lessons.some((lesson) => lesson.id === openedLessonId),
                )?.deadlineDays ?? 0
              }
              courseId={courseParts[0].courseId}
              onArrowClick={selectLesson}
              onProgressUpdate={() => {
                fetchCourse(new AbortController().signal);
              }}
            />)
             : (
                <LessonProgress courseParts={courseParts} courseSlug={slug} canEdit={canEdit} onSelectLesson={selectLesson} />
            )}
            </div>
    </div>;
}