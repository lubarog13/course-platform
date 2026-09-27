/*
  Warnings:

  - You are about to drop the column `text_answer` on the `TestQuestionOption` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TestQuestion" ADD COLUMN     "text_answer" TEXT;

-- AlterTable
ALTER TABLE "TestQuestionOption" DROP COLUMN "text_answer";
