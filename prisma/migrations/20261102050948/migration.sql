-- CreateTable
CREATE TABLE "Agreement" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "accept_email_notifications" BOOLEAN NOT NULL DEFAULT false,
    "accept_email_promotions" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_user_id_key" ON "Agreement"("user_id");

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
