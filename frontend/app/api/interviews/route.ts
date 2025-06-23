import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching interviews...");
    
    // Get interviews from database
    const interviews = await prisma.interview.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        record: {
          select: {
            id: true,
            jobTitle: true,
          },
        },
      },
    });

    console.log(`Found ${interviews.length} active interviews`);
    
    // Format the response
    const formattedInterviews = interviews.map((interview) => ({
      id: interview.id,
      recordId: interview.recordId,
      jobTitle: interview.jobTitle || interview.record?.jobTitle || "Untitled Interview",
      roomId: interview.roomId,
      accessCode: interview.accessCode,
      status: interview.status,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    }));

    return NextResponse.json(formattedInterviews);
  } catch (error) {
    console.error("Error fetching interviews:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 