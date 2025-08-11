import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Fetch all interview data with related information
    const interviews = await prisma.interviewData.findMany({
      include: {
        interview: {
          include: {
            record: true,
          },
        },
      },
      orderBy: [
        // { interviewId: 'asc' }, // Group by interview ID first
        // { startTime: 'desc' }   // Then sort by start time (newest first)
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      success: true,
      data: interviews,
    });
  } catch (error) {
    console.error("Error fetching interview data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch interview data" },
      { status: 500 }
    );
  }
}
