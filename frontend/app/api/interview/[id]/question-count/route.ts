import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Store or update question count inside InterviewData.feedback JSON as a lightweight place
// POST will upsert the latest count for a given interviewId
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // interviewId
    const { count } = await request.json();

    if (typeof count !== "number" || count < 0) {
      return NextResponse.json(
        { success: false, error: "Invalid count" },
        { status: 400 }
      );
    }

    // Find the most recent InterviewData row for this interview
    const latest = await prisma.interviewData.findFirst({
      where: { interviewId: id },
      orderBy: { createdAt: "desc" },
    });

    if (!latest) {
      return NextResponse.json(
        { success: false, error: "Interview data not found" },
        { status: 404 }
      );
    }

    const nextFeedback = {
      ...(latest.feedback as any || {}),
      liveQuestionCount: count,
    };

    const updated = await prisma.interviewData.update({
      where: { id: latest.id },
      data: { feedback: nextFeedback },
    });

    return NextResponse.json({ success: true, data: { count } });
  } catch (error: any) {
    console.error("Error updating question count:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update question count" },
      { status: 500 }
    );
  }
}

// GET returns the latest count stored
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // interviewId

    const latest = await prisma.interviewData.findFirst({
      where: { interviewId: id },
      orderBy: { createdAt: "desc" },
      select: { feedback: true },
    });

    const count = (latest?.feedback as any)?.liveQuestionCount ?? 0;
    return NextResponse.json({ success: true, data: { count } });
  } catch (error: any) {
    console.error("Error fetching question count:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch question count" },
      { status: 500 }
    );
  }
}


