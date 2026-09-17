/*
  Warnings:

  - You are about to drop the column `external_id` on the `Video` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "attachment_id" INTEGER;

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "external_id";

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
