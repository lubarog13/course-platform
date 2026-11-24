-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar_file_id" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatar_file_id_fkey" FOREIGN KEY ("avatar_file_id") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
