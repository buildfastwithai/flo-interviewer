import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { interviewId, interviewDataId } = data;
    
    if (!interviewId && !interviewDataId) {
      return NextResponse.json(
        { error: 'Either interview ID or interview data ID is required' },
        { status: 400 }
      );
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Find the interview data record
    let interviewData;
    if (interviewDataId) {
      interviewData = await prisma.interviewData.findUnique({
        where: { id: interviewDataId }
      });
    } else {
      // If only interviewId is provided, get the most recent interview data
      interviewData = await prisma.interviewData.findFirst({
        where: { 
          interview: { id: interviewId } 
        },
        orderBy: { 
          createdAt: 'desc' 
        }
      });
    }

    if (!interviewData) {
      return NextResponse.json(
        { error: 'Interview data not found' },
        { status: 404 }
      );
    }

    // Parse transcript
    let transcript = [];
    try {
      transcript = JSON.parse(interviewData.transcript);
    } catch (error) {
      console.error('Error parsing transcript:', error);
      return NextResponse.json(
        { error: 'Failed to parse interview transcript' },
        { status: 500 }
      );
    }

    // Format transcript for analysis
    const formattedTranscript = transcript.map((entry: any) => 
      `${entry.speaker === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${entry.text}`
    ).join('\n\n');

    // Get job title from interview if available
    let jobTitle = "Software Developer"; // Default job title
    try {
      if (interviewData.interviewId) {
        const interview = await prisma.interview.findUnique({
          where: { id: interviewData.interviewId }
        });
        if (interview?.jobTitle) {
          jobTitle = interview.jobTitle;
        }
      }
    } catch (error) {
      console.warn('Could not fetch job title:', error);
    }

    // Generate feedback using AI
    const feedback = await generateFeedbackWithOpenAI(formattedTranscript, jobTitle);
    
    // Save feedback to database
    const updatedInterviewData = await prisma.interviewData.update({
      where: { id: interviewData.id },
      data: { 
        feedback: feedback
      }
    });

    return NextResponse.json({
      success: true,
      feedback: feedback
    });

  } catch (error) {
    console.error('Error generating interview feedback:', error);
    return NextResponse.json(
      { error: 'Failed to generate interview feedback' },
      { status: 500 }
    );
  }
}

async function generateFeedbackWithOpenAI(transcript: string, jobRole: string = "Software Developer"): Promise<any> {
  try {
    console.log("Generating feedback with OpenAI...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are an expert technical interviewer providing feedback for a ${jobRole} candidate.
                   Your feedback should be constructive, actionable, and highlight both strengths and areas for improvement.
                   Be specific and back your feedback with evidence from the transcript.
                   
                   You MUST return a JSON response with the following structure:
                   {
                     "overall_score": 85,
                     "strengths": ["Strength 1", "Strength 2", "Strength 3"],
                     "areas_for_improvement": ["Area 1", "Area 2", "Area 3"],
                     "specific_feedback": "Detailed paragraph of feedback addressing key points",
                     "next_steps": ["Step 1", "Step 2", "Step 3"]
                   }`
        },
        {
          role: "user",
          content: `Please provide constructive interview feedback for a candidate based on this interview transcript:

For the feedback, include:
1. Overall score (0-100)
2. 3-5 key strengths demonstrated
3. 2-4 areas for improvement
4. A paragraph of specific feedback addressing key points
5. 2-4 recommended next steps for preparation

IMPORTANT: Your response MUST be a valid JSON object with all the required fields.

Example response format:
{
  "overall_score": 85,
  "strengths": [
    "Clear communication of technical concepts",
    "Structured problem-solving approach",
    "Good understanding of fundamental principles"
  ],
  "areas_for_improvement": [
    "Could provide more specific examples from past experience",
    "Consider practicing system design questions further"
  ],
  "specific_feedback": "You demonstrated strong technical knowledge and communicated your thoughts clearly. Your problem-solving approach was methodical and you asked good clarifying questions. To improve further, try to incorporate more specific examples from your past work and spend time practicing more complex system design scenarios. Overall, a solid performance.",
  "next_steps": [
    "Practice more system design questions",
    "Prepare more specific examples from past projects",
    "Review fundamental concepts in distributed systems"
  ]
}

Transcript starts here:
${transcript}
Transcript ends here.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });
    
    console.log("Feedback generation completed");
    
    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Validate required fields
      const requiredFields = [
        "overall_score", "strengths", "areas_for_improvement", 
        "specific_feedback", "next_steps"
      ];
      
      const missingFields = requiredFields.filter(field => !(field in result));
      if (missingFields.length > 0) {
        console.error("Missing fields in feedback:", missingFields);
        throw new Error(`Invalid response format: missing fields ${missingFields.join(', ')}`);
      }
      
      return result;
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      throw new Error(`Failed to parse feedback: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    // Return a fallback feedback object in case of error
    return {
      overall_score: 70,
      strengths: [
        "Communication skills",
        "Technical knowledge",
        "Problem-solving approach"
      ],
      areas_for_improvement: [
        "Provide more specific examples",
        "Consider alternative solutions"
      ],
      specific_feedback: "The interview showed your technical abilities. Due to an error in our feedback system, we couldn't provide personalized feedback. Please reach out to the interviewer for more detailed insights.",
      next_steps: [
        "Review the technical concepts discussed",
        "Practice explaining your thought process more clearly",
        "Prepare more examples from your past projects"
      ]
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const interviewDataId = url.searchParams.get('interviewDataId');
    
    if (!interviewDataId) {
      return NextResponse.json(
        { error: 'Interview data ID is required' },
        { status: 400 }
      );
    }

    const interviewData = await prisma.interviewData.findUnique({
      where: { id: interviewDataId }
    });

    if (!interviewData) {
      return NextResponse.json(
        { error: 'Interview data not found' },
        { status: 404 }
      );
    }

    if (!interviewData.feedback) {
      return NextResponse.json(
        { error: 'No feedback available for this interview' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback: interviewData.feedback
    });
  } catch (error) {
    console.error('Error retrieving interview feedback:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve interview feedback' },
      { status: 500 }
    );
  }
}
