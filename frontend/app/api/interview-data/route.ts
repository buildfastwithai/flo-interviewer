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
      updateIfExists = false, // Changed default to false to prefer creating new records
      id = null // Added to support direct updates to a specific record
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

    let result;
    
    // If we have a specific ID, try to update that record directly
    if (id) {
      const recordToUpdate = await prisma.interviewData.findUnique({
        where: { id }
      });
      
      if (recordToUpdate) {
        result = await prisma.interviewData.update({
          where: { id },
          data: dataToSave
        });
        
        return NextResponse.json({
          success: true,
          data: result,
          updated: true
        });
      }
    }
    
    // Only look for an existing session by the same candidate that started at the same time
    // This helps identify the same interview session for updates vs creating a new record
    const existingInterviewData = await prisma.interviewData.findFirst({
      where: {
        interview: { id: interviewId },
        candidateName: candidateName || undefined,
        startTime: new Date(startTime)
      }
    });

    if (existingInterviewData && updateIfExists) {
      // Update existing record only if updateIfExists is true and we found an exact match
      result = await prisma.interviewData.update({
        where: {
          id: existingInterviewData.id
        },
        data: dataToSave
      });
      
      return NextResponse.json({ 
        success: true, 
        data: result, 
        updated: true
      });
    } else {
      // Create new record in all other cases
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