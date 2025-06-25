import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET analysis for a specific interview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the most recent interview data record for this interview ID
    const interviewData = await prisma.interviewData.findFirst({
      where: {
        interviewId: id,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!interviewData) {
      return NextResponse.json(
        { success: false, error: "Interview data not found" },
        { status: 404 }
      );
    }

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { analysis } = await request.json();

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: "Analysis data is required" },
        { status: 400 }
      );
    }

    console.log(`Saving analysis for interview ID: ${id}`);
    console.log(`Analysis data size: ${JSON.stringify(analysis).length} characters`);

    // Find the most recent interview data record
    const interviewData = await prisma.interviewData.findFirst({
      where: {
        interviewId: id,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!interviewData) {
      return NextResponse.json(
        { success: false, error: "Interview data not found" },
        { status: 404 }
      );
    }

    // Update the interview data with the analysis
    try {
      const updatedInterviewData = await prisma.interviewData.update({
        where: {
          id: interviewData.id,
        },
        data: {
          analysis: analysis,
          aiEvaluation: {
            overallScore: analysis.interview_insights?.overall_performance_score || 0,
            technicalScore: analysis.interview_insights?.technical_depth || 0,
            communicationScore: analysis.interview_insights?.communication_clarity || 0,
            recommendationSummary: analysis.analysis_summary || "",
            timestamp: new Date(),
          }
        },
      });

      console.log(`Analysis successfully saved for interview ID: ${id}`);
      return NextResponse.json({
        success: true,
        data: updatedInterviewData,
      });
    } catch (updateError) {
      console.error("Error updating interview data:", updateError);
      return NextResponse.json(
        { success: false, error: "Database error while updating interview analysis" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing interview analysis update:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update interview analysis" },
      { status: 500 }
    );
  }
}
