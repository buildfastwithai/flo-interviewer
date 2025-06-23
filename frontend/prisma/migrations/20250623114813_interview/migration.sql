-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "jobTitle" TEXT,
    "recordId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "candidateName" TEXT,
    "feedback" JSONB,
    "results" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Interview_roomId_key" ON "Interview"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Interview_accessCode_key" ON "Interview"("accessCode");

-- CreateIndex
CREATE INDEX "Interview_recordId_idx" ON "Interview"("recordId");

-- CreateIndex
CREATE INDEX "Interview_accessCode_idx" ON "Interview"("accessCode");

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "SkillRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
