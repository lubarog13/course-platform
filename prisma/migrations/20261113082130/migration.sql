-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "certificate_progress" INTEGER DEFAULT 100;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "required" BOOLEAN NOT NULL DEFAULT false;
