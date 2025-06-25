import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { 
      interviewId, 
      transcript, 
      startTime, 
      endTime,
      duration,
      candidateName,
      analysis = {},
      aiEvaluation = {},
      questionAnswers = {},
      updateIfExists = true // Default to true to prefer updating over creating
    } = data;
    
    if (!interviewId) {
      return NextResponse.json(
        { error: 'Interview ID is required' },
        { status: 400 }
      );
    }

    // Check if the interview exists
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Prepare data object with conditional fields
    const dataToSave: any = {
      transcript,
      startTime: new Date(startTime),
      duration,
      analysis,
      aiEvaluation,
      questionAnswers
    };
    
    // Add optional fields if they're defined
    if (endTime) {
      dataToSave.endTime = new Date(endTime);
    }
    
    if (candidateName) {
      dataToSave.candidateName = candidateName;
    }

    // Always check first if any record exists
    const existingInterviewData = await prisma.interviewData.findFirst({
      where: {
        interview: { id: interviewId }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    let result;
    
    if (existingInterviewData) {
      // Update existing record
      result = await prisma.interviewData.update({
        where: {
          id: existingInterviewData.id
        },
        data: {
          ...dataToSave,
          // Ensure we don't lose the candidate name if it exists
          candidateName: candidateName || existingInterviewData.candidateName
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        data: result, 
        updated: true
      });
    } else {
      // Create new record only if no record exists
      result = await prisma.interviewData.create({
        data: {
          interview: {
            connect: {
              id: interviewId
            }
          },
          ...dataToSave
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        data: result, 
        created: true 
      });
    }
  } catch (error) {
    console.error('Error storing interview data:', error);
    return NextResponse.json(
      { error: 'Failed to store interview data' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const interviewId = url.searchParams.get('interviewId');
    
    if (!interviewId) {
      return NextResponse.json(
        { error: 'Interview ID is required' },
        { status: 400 }
      );
    }

    const interviewDataRecords = await prisma.interviewData.findMany({
      where: { 
        interview: {
          id: interviewId
        }
      },
      include: {
        interview: {
          include: {
            record: {
              include: {
                skills: true  // Include skills from the SkillRecord
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!interviewDataRecords || interviewDataRecords.length === 0) {
      return NextResponse.json(
        { error: 'Interview data not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: interviewDataRecords });
  } catch (error) {
    console.error('Error retrieving interview data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve interview data' },
      { status: 500 }
    );
  }
} 