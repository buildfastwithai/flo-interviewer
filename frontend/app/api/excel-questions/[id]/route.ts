import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Excel question set ID is required" },
        { status: 400 }
      );
    }

    // Fetch the Excel question set with all questions
    const excelQuestionSet = await prisma.excelQuestionSet.findUnique({
      where: {
        id,
      },
      include: {
        questions: {
          orderBy: {
            slNo: "asc",
          },
        },
        record: true,
      },
    });

    if (!excelQuestionSet) {
      return NextResponse.json(
        { success: false, error: "Excel question set not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: excelQuestionSet.id,
        jobTitle: excelQuestionSet.jobTitle,
        experienceRange: excelQuestionSet.experienceRange,
        totalQuestions: excelQuestionSet.totalQuestions,
        skillsExtracted: excelQuestionSet.skillsExtracted,
        rawJobDescription: excelQuestionSet.rawJobDescription,
        questions: excelQuestionSet.questions.map((q) => ({
          slNo: q.slNo,
          skill: q.skill,
          questionTitle: q.questionTitle,
          questionDescription: q.questionDescription,
          idealAnswer: q.idealAnswer,
        })),
        createdAt: excelQuestionSet.createdAt,
        updatedAt: excelQuestionSet.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error fetching Excel questions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch Excel questions",
      },
      { status: 500 }
    );
  }
}
