"use client";
import { CoursePartDto } from "@/app/lib/courseParts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function CourseSidebar({courseParts, courseName}: {courseParts: CoursePartDto[], courseName: string}) {
    const [openedIndex, setOpenedIndex] = useState<number | null>(null);
    return (
        <div className="md:border-r border-gray-200 p-4 pr-6 flex flex-col w-full md:w-1/3 lg:w-1/4 min-w-[300px]">
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
                                        <div key={lesson.id}>
                                            <h3 className="text-md text-left text-gray-600 dark:text-gray-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">{lesson.name}</h3>
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                ))}
            </div>
        </div>
    );
}