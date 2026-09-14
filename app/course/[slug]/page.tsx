import { findCourse, serializeCourse } from "@/app/lib/courses";
import { CoursePreview } from "@/components/courses/CoursePreview";
import NotFound from "@/components/layout/not-found";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;
  const course = await findCourse(slug);
    if (!course) {
        return <NotFound text="Курс не найден" />;
    }
    return <>
    <div className="container mx-auto max-w-6xl px-4 pt-8 ">
        <h1 className="text-3xl font-bold mb-4">{course.name}</h1>
    </div>
    <CoursePreview course={serializeCourse(course)} />
    </>;
}