-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signature_id" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_signature_id_fkey" FOREIGN KEY ("signature_id") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
