"use client";
import { useParams } from 'next/navigation'
import { useState, useEffect } from "react";
import { Course } from "@prisma/client";
import { CoursePartDto } from "@/app/lib/courseParts";
import CourseSidebar from "./CourseSidebar";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "../ui/drawer";
import { MenuIcon, XIcon } from 'lucide-react';
import { Button } from '../ui/button';

export default function CourseView() {
    const params = useParams();
    const slug = params.slug as string;
    if (!slug) {
        return <div>Курс не найден</div>;
    }
    const [courseName, setCourseName] = useState<string | null>(null);
    const [courseParts, setCourseParts] = useState<CoursePartDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDesktop, setIsDesktop] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 768);
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
    if (loading) return <div>Загрузка курса...</div>;
    if (error) return <div>Ошибка: {error}</div>;
    return  <div className='flex container align-stretch mx-auto px-4 pt-8 min-h-screen relative'>
        {!isDesktop && (<Drawer  swipeDirection='left' modal={true} open={isOpen} onOpenChange={setIsOpen}>
            <DrawerTrigger className={`transition-all duration-300 absolute top-4 left-4 z-10"`} render={
                <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">
                    <MenuIcon className="w-4 h-4" />
                </Button>}>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{courseName}</DrawerTitle>
                </DrawerHeader>
                <DrawerContent>
                    <div className="flex-1 overflow-y-auto p-4">
                    <CourseSidebar courseParts={courseParts} courseName={courseName ?? ""} />
                    </div>
                    <DrawerFooter>
                        <DrawerClose render={<Button className="cursor-pointer bg-black text-white hover:bg-gray-800 dark:hover:bg-gray-200 dark:bg-white dark:text-black">
                            Закрыть
                        </Button>} />
                    </DrawerFooter>
                </DrawerContent>
            </DrawerContent>
        </Drawer>)}
        {isDesktop && (<CourseSidebar courseParts={courseParts} courseName={courseName ?? ""} />)}
        <div className='flex-1'>
            </div>
    </div>;
}