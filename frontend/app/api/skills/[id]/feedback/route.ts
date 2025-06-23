import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Create or update feedback
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { content } = await request.json();
    const { id: skillId } = await params;

    if (!skillId) {
      return NextResponse.json(
        { error: "Skill ID is required" },
        { status: 400 }
      );
    }

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Feedback content is required" },
        { status: 400 }
      );
    }

    // Check if skill exists
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill) {
      return NextResponse.json(
        { error: "Skill not found" },
        { status: 404 }
      );
    }

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        content,
        skillId,
      },
    });

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error: any) {
    console.error("Error creating feedback:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create feedback",
      },
      { status: 500 }
    );
  }
}

// Get all feedback for a skill
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: skillId } = await params;

    if (!skillId) {
      return NextResponse.json(
        { error: "Skill ID is required" },
        { status: 400 }
      );
    }

    // Get all feedback for this skill
    const feedbacks = await prisma.feedback.findMany({
      where: { skillId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      feedbacks,
    });
  } catch (error: any) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch feedback",
      },
      { status: 500 }
    );
  }
} 