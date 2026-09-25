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
        await fetch(`/api/course/${slug}/parts`)
            .then(res => res.json())
            .then(data => {
                setCourseName(data.courseName);
                setCourseParts(data.parts);
                setCanEdit(data.canEdit);
                const lessons = data.parts.flatMap((part: CoursePartDto) => part.lessons);
                setLessonsList(lessons);
                if (searchParams && searchParams.get('lessonId')) {
                    setCurrentLessonIndex(lessons.findIndex(lesson => lesson.id === parseInt(searchParams.get('lessonId') as string)) || 0);
                }
            })
            .catch(error => {
                setError(error.message);
            }).finally(() => {
                if (!signal.aborted) setLoading(false);
            });
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
    if (error) return <div>Ошибка: {error}</div>;
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
                    <CourseSidebar  courseParts={courseParts} courseName={courseName ?? ""} openedLessonId={lessonsList[currentLessonIndex].id} canEdit={canEdit} onLessonClick={selectLesson} />
                    </div>
                    <DrawerFooter>
                        <DrawerClose render={<Button className="cursor-pointer bg-black text-white hover:bg-gray-800 dark:hover:bg-gray-200 dark:bg-white dark:text-black">
                            Закрыть
                        </Button>} />
                    </DrawerFooter>
                </DrawerContent>
            </DrawerContent>
        </Drawer>)}
        {isDesktop && (<CourseSidebar courseParts={courseParts} courseName={courseName ?? ""} openedLessonId={lessonsList[currentLessonIndex].id} canEdit={canEdit} onLessonClick={selectLesson} />)}
        <div className='flex-1'>
            <LessonView canEdit={canEdit} lessonId={lessonsList[currentLessonIndex].id} prevLesson={currentLessonIndex > 0 ? lessonsList[currentLessonIndex - 1] : undefined} nextLesson={currentLessonIndex < lessonsList.length - 1 ? lessonsList[currentLessonIndex + 1] : undefined} onArrowClick={selectLesson} />
            </div>
    </div>;
}