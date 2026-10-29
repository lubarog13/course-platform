-- Align FK with schema.prisma: deleting an option cascades to selected answers
ALTER TABLE "UserTestAnswerOption" DROP CONSTRAINT "UserTestAnswerOption_option_id_fkey";

ALTER TABLE "UserTestAnswerOption" ADD CONSTRAINT "UserTestAnswerOption_option_id_fkey"
  FOREIGN KEY ("option_id") REFERENCES "TestQuestionOption"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
