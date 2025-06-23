-- CreateTable
CREATE TABLE "ExcelQuestionSet" (
    "id" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "experienceRange" TEXT NOT NULL DEFAULT '8 to 10 years',
    "totalQuestions" INTEGER NOT NULL,
    "skillsExtracted" TEXT[],
    "recordId" TEXT,
    "rawJobDescription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExcelQuestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcelQuestion" (
    "id" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "skill" TEXT NOT NULL,
    "questionTitle" TEXT NOT NULL,
    "questionDescription" TEXT NOT NULL,
    "idealAnswer" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExcelQuestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExcelQuestionSet" ADD CONSTRAINT "ExcelQuestionSet_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "SkillRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcelQuestion" ADD CONSTRAINT "ExcelQuestion_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ExcelQuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
