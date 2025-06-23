-- CreateEnum
CREATE TYPE "LikeStatus" AS ENUM ('LIKED', 'DISLIKED', 'NONE');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "liked" "LikeStatus" DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
