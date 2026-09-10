import { CourseGrid } from "@/components/courses/CourseGrid";
import { prisma } from "@/app/lib/prisma";

export default async function CourseCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const category = await prisma.category.findUnique({
    where: { slug },
  });

  if (!category) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Категория не найдена</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{category.name}</h1>
      <CourseGrid forceRefresh={true} category={category.slug} />
    </main>
  );
}
