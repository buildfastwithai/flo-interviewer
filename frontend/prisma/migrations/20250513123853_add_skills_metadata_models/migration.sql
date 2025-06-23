-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "Requirement" AS ENUM ('MANDATORY', 'OPTIONAL');

-- CreateTable
CREATE TABLE "SkillRecord" (
    "id" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "requirement" "Requirement" NOT NULL DEFAULT 'OPTIONAL',
    "recordId" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_recordId_key" ON "Skill"("name", "recordId");

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "SkillRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "SkillRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
