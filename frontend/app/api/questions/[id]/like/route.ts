import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { status } = await request.json();
    const { id: questionId } = await params;

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    // Validate status
    if (!["LIKED", "DISLIKED", "NONE"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid like status" },
        { status: 400 }
      );
    }

    // Update the question in the database
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: { liked: status },
    });

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
    });
  } catch (error: any) {
    console.error("Error updating question like status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update question like status",
      },
      { status: 500 }
    );
  }
} 