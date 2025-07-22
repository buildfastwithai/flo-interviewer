import { NextRequest, NextResponse } from "next/server";
import { AccessToken, AccessTokenOptions, VideoGrant } from "livekit-server-sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Try to load environment variables
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;


// don't cache the results
export const revalidate = 0;

export interface ConnectionDetails {
  serverUrl: string;
  participantToken: string;
  roomName: string;
  participantName: string;
  demoMode?: boolean;
  interviewId?: string;
  roomId?: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log("Getting connection details...");
    const searchParams = request.nextUrl.searchParams;
    
    // User information
    const name = searchParams.get("name") || "Anonymous";
    const skillLevel = searchParams.get("skillLevel");
    const role = searchParams.get("role");
    const accessCode = searchParams.get("accessCode");
    
    console.log(`Request params - Name: ${name}, AccessCode: ${accessCode ? "Provided" : "None"}`);

    // Check if required environment variables are available
    if (LIVEKIT_URL === undefined) {
      console.error("LIVEKIT_URL is not defined");
      return NextResponse.json(
        { error: "Server configuration error: LIVEKIT_URL is not defined" },
        { status: 500 }
      );
    }
    
    if (API_KEY === undefined) {
      console.error("LIVEKIT_API_KEY is not defined");
      return NextResponse.json(
        { error: "Server configuration error: LIVEKIT_API_KEY is not defined" },
        { status: 500 }
      );
    }
    
    if (API_SECRET === undefined) {
      console.error("LIVEKIT_API_SECRET is not defined");
      return NextResponse.json(
        { error: "Server configuration error: LIVEKIT_API_SECRET is not defined" },
        { status: 500 }
      );
    }

    // Check for room-specific parameters
    let roomName = searchParams.get("room");
    let metadata: Record<string, any> = {};
    let isDemoMode = false;

    // If access code is provided, look up the interview
    if (accessCode) {
      console.log(`Looking up interview with access code: ${accessCode}`);
      
      try {
        // Find interview by access code
        const interview = await prisma.interview.findUnique({
          where: { accessCode },
          include: { record: true },
        });

        if (!interview) {
          console.log("Interview not found with provided access code");
          return NextResponse.json(
            { error: "Invalid access code or interview not found" },
            { status: 404 }
          );
        }


        console.log(`Found interview room: ${interview.roomId}`);
        roomName = interview.roomId;
        
        // Include record ID in metadata for the agent to use
        metadata = {
          role: interview.record?.jobTitle || (role || "Software Engineer"),
          candidateName: name,
          recordId: interview.recordId,
          skill: skillLevel || "mid",
          interviewId: interview.id,
          roomId: interview.roomId,
        };
        console.log(`Metadata: ${JSON.stringify(metadata)}`);
      } catch (dbError) {
        console.error("Database error while looking up interview:", dbError);
        return NextResponse.json(
          { error: "Failed to retrieve interview information" },
          { status: 500 }
        );
      }
    } else {
      // Demo mode or direct connection
      if (!roomName) {
        // Generate a demo room name if not provided
        roomName = `interview-${name.replace(/\s+/g, "_")}-${skillLevel || "mid"}-${Date.now()}`;
      }
      
      console.log(`Using demo/direct mode with room: ${roomName}`);
      
      metadata = {
        role: role || "Software Engineer",
        skill: skillLevel || "mid",
      };
    }

    // Create participant token with metadata
    try {
      const participantToken = await createParticipantToken(
        {
          identity: name,
          metadata: JSON.stringify(metadata),
          ttl: "15m",
        },
        roomName
      );

      console.log(`Created token for ${name} to join room ${roomName}`);

      const headers = new Headers({
        "Cache-Control": "no-store",
      });

      // Return connection details
      const data: ConnectionDetails = {
        serverUrl: LIVEKIT_URL,
        roomName,
        participantToken,
        participantName: name,
        demoMode: isDemoMode,
        interviewId: metadata.interviewId,
        roomId: metadata.roomId,
      };
      console.log(`Connection details: ${JSON.stringify(data)}`);

      return NextResponse.json(data, { headers });
    } catch (tokenError) {
      console.error("Error generating LiveKit token:", tokenError);
      return NextResponse.json(
        { error: "Failed to generate authorization token" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating connection details:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Helper function to create a participant token
function createParticipantToken(userInfo: AccessTokenOptions, roomName: string) {
  const at = new AccessToken(API_KEY, API_SECRET, userInfo);
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
}
