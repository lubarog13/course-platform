import { findCourse, serializeCourse } from "@/app/lib/courses";
import { CoursePreview } from "@/components/courses/CoursePreview";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;
  const course = await findCourse(slug);
    if (!course) {
        return <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">Курс не найден</div>;
    }
    return <>
    <div className="container mx-auto max-w-6xl px-4 pt-8 ">
        <h1 className="text-3xl font-bold mb-4">{course.name}</h1>
    </div>
    <CoursePreview course={serializeCourse(course)} />
    </>;
}