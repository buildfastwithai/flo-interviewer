import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: regenerationId } = await params;
    const body = await request.json();
    const { liked, userFeedback } = body;

    if (!regenerationId) {
      return NextResponse.json(
        { error: "Regeneration ID is required" },
        { status: 400 }
      );
    }

    // Update the regeneration record
    const updatedRegeneration = await prisma.regeneration.update({
      where: { id: regenerationId },
      data: {
        liked: liked || undefined,
        userFeedback: userFeedback || undefined,
      },
      include: {
        originalQuestion: true,
        newQuestion: true,
        skill: true,
      },
    });

    return NextResponse.json({
      success: true,
      regeneration: updatedRegeneration,
      message: "Regeneration feedback updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating regeneration feedback:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update regeneration feedback",
      },
      { status: 500 }
    );
  }
}
