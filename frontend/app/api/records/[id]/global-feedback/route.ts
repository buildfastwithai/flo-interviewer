import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST endpoint to create or update global feedback
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { feedback } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Record ID is required" },
        { status: 400 }
      );
    }

    if (!feedback) {
      return NextResponse.json(
        { success: false, error: "Feedback content is required" },
        { status: 400 }
      );
    }

    // Check if record exists and belongs to the user
    const record = await prisma.skillRecord.findUnique({
      where: {
        id,
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Record not found" },
        { status: 404 }
      );
    }

    // Upsert the global feedback (create or update)
    const globalFeedback = await prisma.globalFeedback.upsert({
      where: {
        recordId: id,
      },
      update: {
        content: feedback,
        updatedAt: new Date(),
      },
      create: {
        content: feedback,
        recordId: id,
      },
    });

    return NextResponse.json(
      { success: true, globalFeedback },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error saving global feedback:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve global feedback
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Record ID is required" },
        { status: 401 }
      );
    }

    // Check if record exists and belongs to the user
    const record = await prisma.skillRecord.findUnique({
      where: {
        id,
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Record not found" },
        { status: 404 }
      );
    }

    // Get the global feedback
    const globalFeedback = await prisma.globalFeedback.findUnique({
      where: {
        recordId: id,
      },
    });

    return NextResponse.json(
      { success: true, globalFeedback },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error retrieving global feedback:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
