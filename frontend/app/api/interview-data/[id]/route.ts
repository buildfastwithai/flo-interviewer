import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET interview data by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const interviewData = await prisma.interviewData.findFirst({
      where: {
        id: id
      },
      include: {
        interview: true
      }
    });

    if (!interviewData) {
      return NextResponse.json(
        { success: false, error: "Interview data not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: interviewData,
    });
  } catch (error) {
    console.error("Error fetching interview data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch interview data" },
      { status: 500 }
    );
  }
}

// PATCH/update interview data by ID
export async function PATCH(
  request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData = await request.json();

    // Find if the interview data exists
    const existingData = await prisma.interviewData.findUnique({
      where: {
        id: id
      }
    });

    if (!existingData) {
      return NextResponse.json(
        { success: false, error: "Interview data not found" },
        { status: 404 }
      );
    }

    // Perform the update
    const updatedInterviewData = await prisma.interviewData.update({
      where: {
        id: id
      },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: updatedInterviewData,
    });
  } catch (error) {
    console.error("Error updating interview data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update interview data" },
      { status: 500 }
    );
  }
} 