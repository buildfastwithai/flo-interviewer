-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('TECHNICAL', 'FUNCTIONAL', 'BEHAVIORAL', 'COGNITIVE');

-- AlterEnum
ALTER TYPE "SkillLevel" ADD VALUE 'EXPERT';

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "category" "SkillCategory" DEFAULT 'TECHNICAL',
ADD COLUMN     "questionFormat" TEXT DEFAULT 'Scenario based';
