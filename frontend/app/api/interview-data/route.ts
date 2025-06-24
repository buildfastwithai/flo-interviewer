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
      analysis = {},
      aiEvaluation = {},
      questionAnswers = {}
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

    // Update interview status to COMPLETED only if endTime is provided
    if (endTime) {
      await prisma.interview.update({
        where: { id: interviewId },
        data: { 
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      });
    }

    // Check if interview data already exists
    const existingData = await prisma.interviewData.findUnique({
      where: { interviewId }
    });

    // Prepare data object with conditional fields
    const dataToSave: any = {
      transcript,
      startTime: new Date(startTime),
      duration,
      analysis,
      aiEvaluation,
      questionAnswers,
      updatedAt: new Date()
    };
    
    // Only add endTime if it's defined
    if (endTime) {
      dataToSave.endTime = new Date(endTime);
    }

    let interviewData;
    
    if (existingData) {
      // Update existing interview data
      interviewData = await prisma.interviewData.update({
        where: { interviewId },
        data: dataToSave
      });
    } else {
      // Create new interview data with required fields
      interviewData = await prisma.interviewData.create({
        data: {
          interviewId,
          ...dataToSave,
          createdAt: new Date()
        }
      });
    }

    return NextResponse.json({ success: true, data: interviewData });
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

    const interviewData = await prisma.interviewData.findUnique({
      where: { interviewId },
      include: {
        interview: {
          include: {
            record: true
          }
        }
      }
    });

    if (!interviewData) {
      return NextResponse.json(
        { error: 'Interview data not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: interviewData });
  } catch (error) {
    console.error('Error retrieving interview data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve interview data' },
      { status: 500 }
    );
  }
} 