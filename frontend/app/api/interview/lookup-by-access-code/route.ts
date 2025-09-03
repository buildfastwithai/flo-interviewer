import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const revalidate = 0;

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessCode = (body?.accessCode || "").toString().trim();
    if (!accessCode) {
      return NextResponse.json({ error: "accessCode is required" }, { status: 400 });
    }

    const interview = await prisma.interview.findUnique({
      where: { accessCode },
      include: { record: true },
    });

    if (!interview) {
      return NextResponse.json({ error: "Invalid access code" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        interviewId: interview.id,
        recordId: interview.recordId,
        roomId: interview.roomId,
        role: interview.jobTitle || interview.record?.jobTitle || "Software Engineer",
      },
    });
  } catch (error) {
    console.error("Lookup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


