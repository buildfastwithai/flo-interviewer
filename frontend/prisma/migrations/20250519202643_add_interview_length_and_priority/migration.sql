-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "priority" INTEGER;

-- AlterTable
ALTER TABLE "SkillRecord" ADD COLUMN     "interviewLength" INTEGER,
ADD COLUMN     "rawJobDescription" TEXT;
