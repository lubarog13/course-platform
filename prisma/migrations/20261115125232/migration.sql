-- CreateTable
CREATE TABLE "DeadlineExtensionRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "userCourseId" INTEGER,
    "userCoursePartId" INTEGER,
    "reason" TEXT,
    "requestedDays" INTEGER,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'pending',
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeadlineExtensionRequest_pkey" PRIMARY KEY ("id")
);
