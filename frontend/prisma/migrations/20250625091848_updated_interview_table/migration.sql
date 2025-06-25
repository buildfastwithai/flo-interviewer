/*
  Warnings:

  - You are about to drop the column `candidateName` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `feedback` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `results` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Interview` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "InterviewData_interviewId_key";

-- AlterTable
ALTER TABLE "Interview" DROP COLUMN "candidateName",
DROP COLUMN "feedback",
DROP COLUMN "results",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "InterviewData" ADD COLUMN     "candidateName" TEXT;
