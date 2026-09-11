"use client";
import {CourseDto} from "@/app/lib/courses";
import MarkdownContent from "@/components/base/MarkdownContent";
import { Star, LockIcon, PlayIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { declOfNum } from "@/lib/utils";

export function CoursePreview({ course }: { course: CourseDto }) {
    const duration = useMemo(() => {
        const hours = Math.round(course.durationSeconds / 3600);
        const minutes = Math.round(course.durationSeconds / 60) % 60;
        return `${hours} ${declOfNum(hours, ["час", "часа", "часов"])} ${minutes} ${declOfNum(minutes, ["минута", "минуты", "минут"])}`;
    }, [course.durationSeconds]);

    const [isDesktop, setIsDesktop] = useState(true);
    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return <>
    <div className="container mx-auto max-w-6xl flex-1 px-4 py-8 flex relative">
        <div className="flex-1 pr-8">
        <img src={course.coverFile?.url || "/images/course-placeholder.jpeg"} alt={course.name} className="rounded-lg shadow-md w-full h-auto object-cover md:hidden mb-6 aspect-video" />

        {course.instructors?.length &&
        <div className="mb-6 text-xl text-gray-700 dark:text-gray-300"><b>Преподаватели:</b> 
        <a href={`/instructor/${course.instructors[0].user.id}`} className="hover:underline"> {course.instructors.map((instructor) => `${instructor.user.surname} ${instructor.user.name} ${instructor.user.patronymic}`).join(", ")}</a></div>}
        {!isDesktop && course.parts.length > 0 && <h2 className="text-2xl font-bold mb-6 text-gray-700 dark:text-gray-300 mt-3">Части курса</h2>}
        {!isDesktop && course.parts.sort((a, b) => a.sortOrder - b.sortOrder).map((part, i) => (
            <div key={part.id} className="mb-4">
                <h3 className="text-lg font-bold mb-2 text-gray-700 dark:text-gray-300">{part.name}</h3>
                <MarkdownContent nodes={part.description ?? ""} />
                {i < course.parts.length - 1 && <hr className="my-4 border-gray-200 dark:border-gray-700" />}
            </div> 
        ))}
        <div className="h-12 md:hidden" />
        <MarkdownContent nodes={course.description ?? ""} />
        </div>
        <div className="grid grid-cols-2 md:block fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm w-full md:static md:border-l border-t md:border-t-0 border-gray-200 md:border-gray-300 dark:border-gray-700 p-4 md:p-0 md:pl-8 md:w-1/3">
            <img src={course.coverFile?.url || "/images/course-placeholder.jpeg"} alt={course.name} 
            className="rounded-lg shadow-md w-full h-auto object-cover mb-8 aspect-video hidden md:block" />
            <div className="mb-4"><b>Опубликовано:</b> {course.publishedAt ? new Date(course.publishedAt).toLocaleDateString() : "Неизвестно"}</div>
            {course.updatedAt && <div className="mb-4"><b>Обновлено:</b> {new Date(course.updatedAt).toLocaleDateString()}</div>}
            <div className="mb-4"><b>Язык:</b> {course.language === "ru" ? "Русский" : "Английский"}</div>
            <a className="mb-4 block" href={`/courses?level=${course.level}`}><b>Уровень:</b> {course.level === "beginner" ? "Начальный" : course.level === "intermediate" ? "Средний" : "Продвинутый"}</a>
            <a className="mb-4 block" href={`/courses/${course.category?.slug}`} target="_blank"><b>Категория:</b> {course.category?.name}</a>
            <div className="mb-4 col-span-2"><b>Теги:</b> {course.tags.map((tag) => <a href={`/courses?tags=${tag}`} key={tag} className="p-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-md mr-1 hover:bg-gray-200 dark:hover:bg-gray-700">{tag}</a>)}</div>
            <div className="mb-4"><b className="mr-2">Рейтинг:</b> <Star className="w-4 h-4 inline-block " /> {course.rating || 0}</div>
            {course.deletedAt && <div className="mb-4 text-red-500 dark:text-red-400"><b>Удалено:</b> {new Date(course.deletedAt).toLocaleDateString()}</div>}
            {course.createdAt && <div className="mb-4"><b>Длительность:</b> {duration}</div>}
            <Button className="mb-4 col-span-2 h-12" variant={course.needEnrollment? "default" : "outline"}>{course.needEnrollment ? <LockIcon className="w-4 h-4 inline-block mr-2" /> : <PlayIcon className="w-4 h-4 inline-block mr-2" />} {course.needEnrollment? 'Зарегестрироваться' : 'Начать сейчас'}</Button>
            {isDesktop && course.parts.length > 0 && <h2 className="text-2xl font-bold mb-6 text-gray-700 dark:text-gray-300 mt-3">Части курса</h2>}
            {isDesktop && course.parts.sort((a, b) => a.sortOrder - b.sortOrder).map((part, i) => (
                <div key={part.id}>
                    <h3 className="text-lg font-bold mb-2 text-gray-700 dark:text-gray-300">{part.name}</h3>
                    <MarkdownContent nodes={part.description ?? ""} />
                    {i < course.parts.length - 1 && <hr className="my-4 border-gray-200 dark:border-gray-700" />}
                </div>
            ))}
        </div>
    </div>
    </>
}