-- CreateTable
CREATE TABLE "InterviewData" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "analysis" JSONB,
    "aiEvaluation" JSONB,
    "questionAnswers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewData_interviewId_key" ON "InterviewData"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewData_interviewId_idx" ON "InterviewData"("interviewId");

-- AddForeignKey
ALTER TABLE "InterviewData" ADD CONSTRAINT "InterviewData_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
