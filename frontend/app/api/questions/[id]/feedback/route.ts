import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { feedback } = await request.json();
    const { id: questionId } = await params;

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    // Update the question in the database
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: { feedback },
    });

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
    });
  } catch (error: any) {
    console.error("Error updating question feedback:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update question feedback",
      },
      { status: 500 }
    );
  }
}
