"use client";

import PointsTable from "./PointsTable";
import StudentPointsTable from "./StudentPointsTable";
import { CoursePartDto } from "@/app/lib/courseParts";

export default function LessonProgress({
  courseParts,
  courseSlug,
  canEdit,
}: {
  courseParts: CoursePartDto[];
  courseSlug: string;
  canEdit: boolean;
}) {
  return (
    <div className="p-8 py-4">
      <h2 className="text-xl mb-4 font-semibold">Прогресс курса</h2>
      {canEdit ? (
        <StudentPointsTable courseSlug={courseSlug} className="mt-4" />
      ) : (
        <PointsTable courseParts={courseParts} className="mt-4" />
      )}
    </div>
  );
}
