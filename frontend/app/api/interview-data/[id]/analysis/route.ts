import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET analysis for a specific interview
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch interview data with analysis
    const interviewData = await prisma.interviewData.findUnique({
      where: {
        interviewId: id,
      },
    });

    if (!interviewData) {
      return NextResponse.json(
        { success: false, error: "Interview data not found" },
        { status: 404 }
      );
    }

    // Return the analysis if it exists
    if (!interviewData.analysis) {
      return NextResponse.json(
        { success: false, error: "No analysis found for this interview" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: interviewData.analysis,
    });
  } catch (error) {
    console.error("Error fetching interview analysis:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch interview analysis" },
      { status: 500 }
    );
  }
}

// POST/update analysis for a specific interview
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { analysis } = await request.json();

    // Update interview data with analysis
    const updatedInterviewData = await prisma.interviewData.update({
      where: {
        interviewId: id,
      },
      data: {
        analysis: analysis,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedInterviewData,
    });
  } catch (error) {
    console.error("Error updating interview analysis:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update interview analysis" },
      { status: 500 }
    );
  }
} 