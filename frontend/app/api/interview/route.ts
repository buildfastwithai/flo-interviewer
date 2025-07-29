import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accessCode = searchParams.get("accessCode");

    if (!accessCode) {
      return NextResponse.json(
        { error: "Access code is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching interview for access code: ${accessCode}`);

    // Fetch the interview with the given access code
    const interview = await prisma.interview.findUnique({
      where: {
        accessCode: accessCode,
      },
      include: {
        record: true, // Include the related skill record
      },
    });

    if (!interview) {
      console.log(`Interview not found for access code: ${accessCode}`);
      return NextResponse.json(
        { error: "Interview not found. Please check your access code." },
        { status: 404 }
      );
    }

    console.log(`Found interview: ${interview.id} for record: ${interview.recordId}`);

    // Return the interview data
    const responseData = {
      id: interview.id,
      roomId: interview.roomId,
      accessCode: interview.accessCode,
      jobTitle: interview.jobTitle || interview.record.jobTitle,
      recordId: interview.recordId,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Error fetching interview:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch interview",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 