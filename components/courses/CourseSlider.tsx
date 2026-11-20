"use client";

import { CourseListResponse } from "@/app/lib/courses";
import { Carousel, CarouselItem } from "@/components/ui/carousel";
import { CourseCard } from "./CourseCard";
import { CourseListQuery } from "@/app/lib/courses";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CarouselContent, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

type CourseSliderProps = {
    courses: CourseListResponse;
    isLoading: boolean;
}

export default function CourseSlider({ courses, isLoading }: CourseSliderProps) {
    const courseItems = courses.items;
    const router = useRouter();
    const updateFiltersFromCard = (localFilters: {tag?: string} & CourseListQuery) => {
        if (localFilters.tag) {
            router.push(`/courses?tag=${localFilters.tag}`);
        } else {
            router.push(`/courses?${new URLSearchParams(localFilters as Record<string, string>).toString()}`);
        }
    };
    if (isLoading) {
        return <div className="w-full h-full grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 rows-1 overflow-hidden justify-center">
            {Array.from({ length: 3 }, (_, index) => (
        <Card key={index} className="w-full max-w-sm mx-auto">
    <CardContent>
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-20 mt-2" />
    </CardContent>
      <CardFooter>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/2" />
      </CardFooter>
    </Card>
    ))}
        </div>
    }
  return (
    <Carousel
        className="w-full max-w-full"
        opts={{
            loop: true,
            align: "start",
        }}
    >
        <CarouselContent className="py-3">
        {courseItems.map((course) => (
            <CarouselItem key={course.id} className="basis-full md:basis-1/2 lg:basis-1/3">
                <CourseCard course={course} updateFilters={updateFiltersFromCard} />
            </CarouselItem>
        ))}
        </CarouselContent>
        <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}