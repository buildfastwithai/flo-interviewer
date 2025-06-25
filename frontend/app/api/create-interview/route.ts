import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log("Creating new interview...");
    const body = await request.json();
    const { recordId } = body;

    if (!recordId) {
      return NextResponse.json(
        { error: "recordId is required" },
        { status: 400 }
      );
    }

    console.log(`Creating interview for record ID: ${recordId}`);

    // Fetch the record to confirm it exists and get job title
    const record = await prisma.skillRecord.findUnique({
      where: { id: recordId },
      select: { jobTitle: true, interviewLength: true },
    });

    if (!record) {
      console.log(`Record not found with ID: ${recordId}`);
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    // Generate a unique room name for LiveKit
    const roomName = `interview-${Date.now()}-${randomBytes(4).toString("hex")}`;
    
    // Generate a unique access code (6 digits)
    const accessCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`Generated room name: ${roomName}, access code: ${accessCode}`);

    // Create the interview in the database
    const interview = await prisma.interview.create({
      data: {
        recordId,
        jobTitle: record.jobTitle,
        roomId: roomName,
        accessCode,
      }
    });

    console.log(`Created interview with ID: ${interview.id}`);

    // Create a LiveKit room (API call to LiveKit would go here if needed)
    // This will be created automatically by LiveKit when the first participant joins

    return NextResponse.json({
      success: true,
      interview: {
        id: interview.id,
        roomId: interview.roomId,
        accessCode: interview.accessCode,
        jobTitle: interview.jobTitle,
        createdAt: interview.createdAt,
      },
    });

  } catch (error) {
    console.error("Error creating interview:", error);
    return NextResponse.json(
      { 
        error: "Failed to create interview", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
} 