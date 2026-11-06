"use client";

import PointsTable from "./PointsTable";
import StudentPointsTable from "./StudentPointsTable";
import { CoursePartDto } from "@/app/lib/courseParts";
import CertificateBanner from "../certificates/CertificateBanner";

export default function LessonProgress({
  courseParts,
  courseSlug,
  canEdit,
  onSelectLesson,
}: {
  courseParts: CoursePartDto[];
  courseSlug: string;
  canEdit: boolean;
  onSelectLesson?: (lessonId: number) => void;
}) {
  return (
    <div className="p-8 py-4">
      <h2 className="text-xl mb-4 font-semibold">Прогресс курса</h2>
      <CertificateBanner courseId={courseParts[0].courseId} bannerTitle="Сертификат" bannerDescription="Сертификат" buttonText="Скачать сертификат" />
      {canEdit ? (
        <StudentPointsTable courseSlug={courseSlug} className="mt-4" />
      ) : (
        <PointsTable courseParts={courseParts} className="mt-4" onSelectLesson={onSelectLesson} />
      )}
    </div>
  );
}
