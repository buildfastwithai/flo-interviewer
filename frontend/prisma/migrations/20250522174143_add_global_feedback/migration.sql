-- CreateTable
CREATE TABLE "GlobalFeedback" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalFeedback_recordId_key" ON "GlobalFeedback"("recordId");

-- AddForeignKey
ALTER TABLE "GlobalFeedback" ADD CONSTRAINT "GlobalFeedback_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "SkillRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
