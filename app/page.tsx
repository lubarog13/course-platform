import { CourseGrid } from "@/components/courses/CourseGrid";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Курсы</h1>
      <CourseGrid forceRefresh={true} />
    </main>
  );
}
