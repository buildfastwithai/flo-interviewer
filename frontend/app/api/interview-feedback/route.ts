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
    const { interviewId, interviewDataId, practiceMode } = data;
    
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
    const feedback = await generateFeedbackWithOpenAI(formattedTranscript, jobTitle, !!practiceMode);
    
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

async function generateFeedbackWithOpenAI(transcript: string, jobRole: string = "Software Developer", practiceMode: boolean = false): Promise<any> {
  try {
    console.log("Generating feedback with OpenAI...");
    
    const systemPromptPractice = `You are an encouraging ${jobRole} interview coach for PRACTICE MODE.
                   Provide ultra-concise, non-redundant coaching based on overall patterns.
                   Do NOT narrate per question or repeat candidate words.
                   Prefer short, actionable bullets (each ≤ 10 words) and plain language.
                   Friendly, motivating tone. Keep it brief and high-signal.
                   The "specific_feedback" must be a single paragraph of 40-70 words.
                   Return ONLY a JSON object with this structure:
                   {
                     "overall_score": 85,
                     "strengths": ["Strength 1", "Strength 2", "Strength 3"],
                     "areas_for_improvement": ["Area 1", "Area 2", "Area 3"],
                     "specific_feedback": "Short paragraph (40-70 words), motivating, no repetition",
                     "next_steps": ["Step 1", "Step 2", "Step 3"]
                   }`;

    const userPromptPractice = `Provide PRACTICE MODE interview coaching for a ${jobRole} candidate using the transcript below.

Requirements:
1) overall_score: integer 0-100.
2) strengths: 3 bullets, each ≤ 10 words.
3) areas_for_improvement: 2-3 bullets, each ≤ 10 words.
4) specific_feedback: single paragraph, 40-70 words, friendly, no quotes.
5) next_steps: 2-3 bullets, each ≤ 10 words.

Style rules:
- No per-question commentary.
- No repeating or paraphrasing answers.
- Focus on simple, actionable guidance.
- The 'specific_feedback' must clearly state this is practice mode, not a real interview, to help understand the voice interview process.

Return only JSON.

Transcript starts here:
${transcript}
Transcript ends here.`;

    const systemPromptStandard = `You are an expert ${jobRole} interviewer.
                   Produce concise, non-redundant, synthesis-based feedback about overall performance.
                   Do NOT narrate answer-by-answer, repeat, paraphrase, or quote the candidate.
                   Avoid restating content from the transcript; focus on patterns and signal.
                   Use short, punchy bullets (each ≤ 12 words) and neutral, professional tone.
                   The "specific_feedback" must be a single paragraph of 60-90 words.
                   Return ONLY a JSON object with this structure:
                   {
                     "overall_score": 85,
                     "strengths": ["Strength 1", "Strength 2", "Strength 3"],
                     "areas_for_improvement": ["Area 1", "Area 2", "Area 3"],
                     "specific_feedback": "Short paragraph (60-90 words), no repetition",
                     "next_steps": ["Step 1", "Step 2", "Step 3"]
                   }`;

    const userPromptStandard = `Provide interview feedback for a ${jobRole} candidate using the transcript below.

Requirements:
1) overall_score: integer 0-100.
2) strengths: 3-5 bullets, each ≤ 12 words.
3) areas_for_improvement: 2-4 bullets, each ≤ 12 words.
4) specific_feedback: single paragraph, 60-90 words, no quotes, no repetition.
5) next_steps: 2-3 bullets, each ≤ 12 words.

Important style rules:
- Do NOT give per-question feedback.
- Do NOT repeat or paraphrase candidate answers.
- Synthesize themes and be crisp.

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
Transcript ends here.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: practiceMode ? systemPromptPractice : systemPromptStandard
        },
        {
          role: "user",
          content: practiceMode ? userPromptPractice : userPromptStandard
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 700,
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
