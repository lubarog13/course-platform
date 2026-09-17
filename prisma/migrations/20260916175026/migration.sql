-- AlterTable
ALTER TABLE "UserTestAnswer" ADD COLUMN     "answer_file_id" INTEGER;

-- AddForeignKey
ALTER TABLE "UserTestAnswer" ADD CONSTRAINT "UserTestAnswer_answer_file_id_fkey" FOREIGN KEY ("answer_file_id") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
