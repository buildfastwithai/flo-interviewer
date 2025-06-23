-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "numQuestions" INTEGER NOT NULL DEFAULT 1;
