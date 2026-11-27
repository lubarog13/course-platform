import { Teacher } from "@/app/lib/courses";
import Image from "next/image";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { declOfNum, filePublicUrl, getFio } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem } from "../ui/carousel";
import { Award } from "lucide-react";

export function CourseTeachers({ teachers }: { teachers: Teacher[] }) {
    
    const TeachersCard = ({ teacher }: { teacher: Teacher }) => {
        const position = teacher.user.userDetails?.position;
        const achievements = teacher.user.userDetails?.achievements?.filter(Boolean) ?? [];
              return (
            <Card className="pt-0">
                <div className="flex p-4 justify-center items-center z-30 aspect-video dark:bg-black/35 bg-white/35 relative">
                
                <Image src="/images/avatar-bg.png" alt="Avatar background" width={500} height={500} className="absolute z-[0] w-full h-full object-cover top-0 left-0 opacity-40 hidden dark:block" />
                <Image src="/images/avatar-bg-light.png" alt="Avatar background" width={500} height={500} className="absolute z-[0] w-full h-full object-cover top-0 left-0 opacity-80 dark:hidden" />

                <Image
                    src={filePublicUrl(teacher.user.avatarFile?.url) || ""}
                    alt={teacher.user.name}
                    width={100}
                    height={100}
                    className="relative z-20 w-30 h-30 object-cover rounded-full"
                />
                </div>
                <CardHeader>
                    <Link href={`/user/profile/${teacher.user.id}`}><CardTitle>{getFio(teacher.user.surname, teacher.user.name, teacher.user.patronymic)}</CardTitle></Link>
                    <CardDescription className="mt-2">
                        {position ? <span className="text-sm text-gray-700 dark:text-gray-300">{position}</span> : null}
                    {achievements.length > 0 ? (
                        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700 dark:text-gray-300">
                            {achievements.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    ) : null}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                <CardDescription>{teacher.courses?.slice(0, 3).map((course) => 
                        <Link className="hover:underline px-1 first:pl-0 last:pr-0" href={`/courses/${course.slug}`} key={course.slug}>{course.name}<span className="ml-1">·</span></Link> 
                    )}
                    {teacher.courses?.length && teacher.courses.length > 3 && <br />}
                    <Link href={`/user/profile/${teacher.user.id}#taught-courses`} className="underline">{((teacher.courses?.length ?? 0) > 3 ? `+ ${teacher.courses?.length ?? 0 - 4} ${declOfNum(teacher.courses?.length ?? 0 - 4, ["курс", "курса", "курсов"])}` : "")}</Link></CardDescription>
                </CardContent>
            </Card>
        )
    }
    
    return (
        <div className="relative py-8">
            <h2 className="text-center text-2xl font-bold mb-3 z-10 container mx-auto">Наши лучшие преподаватели</h2>
            <p className="text-center text-gray-700 mb-8 dark:text-gray-300 container mx-auto max-w-5xl">Наши преподаватели - это профессионалы, которые помогут вам достичь своих целей</p>
            <div className="w-full container mx-auto max-w-5xl">
                <Image src="/images/stars-teachers.svg" alt="Наши лучшие преподаватели" width={1000} height={1000} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:w-full sm:h-auto h-full w-[200%] max-w-[2000px] object-cover z-[-1] rotate-90 sm:rotate-0" />
                <Carousel
                className="w-full max-w-full"
                opts={{
                    loop: true,
                    align: "start",
                }}>
                    <CarouselContent className="px-3 py-3">
                        {teachers.map((teacher) => (
                            <CarouselItem key={teacher.id} className="basis-full md:basis-1/2 lg:basis-1/3">
                                <TeachersCard teacher={teacher} />
                            </CarouselItem>
                        ))}
                    </CarouselContent>  
                </Carousel>
            </div>
        </div>
    )
}