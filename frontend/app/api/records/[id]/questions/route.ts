import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch all questions for this record
    const questions = await prisma.question.findMany({
      where: { recordId: id },
      include: {
        skill: true,
      },
      orderBy: {
        skill: {
          name: "asc",
        },
      },
    });

    if (!questions) {
      return NextResponse.json(
        { success: false, error: "No questions found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error: any) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch questions",
      },
      { status: 500 }
    );
  }
}
