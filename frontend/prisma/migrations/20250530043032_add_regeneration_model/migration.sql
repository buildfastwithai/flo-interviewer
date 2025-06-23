-- CreateTable
CREATE TABLE "Regeneration" (
    "id" TEXT NOT NULL,
    "originalQuestionId" TEXT NOT NULL,
    "newQuestionId" TEXT NOT NULL,
    "reason" TEXT,
    "userFeedback" TEXT,
    "liked" "LikeStatus" DEFAULT 'NONE',
    "skillId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Regeneration_originalQuestionId_newQuestionId_key" ON "Regeneration"("originalQuestionId", "newQuestionId");

-- AddForeignKey
ALTER TABLE "Regeneration" ADD CONSTRAINT "Regeneration_originalQuestionId_fkey" FOREIGN KEY ("originalQuestionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Regeneration" ADD CONSTRAINT "Regeneration_newQuestionId_fkey" FOREIGN KEY ("newQuestionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Regeneration" ADD CONSTRAINT "Regeneration_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Regeneration" ADD CONSTRAINT "Regeneration_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "SkillRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
