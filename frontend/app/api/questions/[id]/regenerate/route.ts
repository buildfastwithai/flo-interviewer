import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;
    const body = await request.json();
    const { reason, userFeedback } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    // Get the question with its skill and feedback
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        skill: true,
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Parse the question content
    const questionContent = JSON.parse(question.content);

    // Prepare the prompt for OpenAI
    let prompt = `Generate a new interview question for the skill "${question.skill.name}" at ${question.skill.level} level.`;

    // Add the old question for context
    prompt += `\nOriginal question: ${questionContent.question}`;

    // Add reason for regeneration if provided
    if (reason) {
      prompt += `\n\nReason for regeneration: "${reason}"`;
      prompt += `\nPlease address this specific concern in the new question.`;
    }

    // Add feedback if available - emphasize this importance
    if (question.feedback) {
      prompt += `\n\nUser feedback on original question: "${question.feedback}"`;
      prompt += `\n\nPlease use this feedback to greatly improve the question. The feedback is very important and should guide your response.`;
    } else {
      prompt += `\nPlease generate a different question for this skill.`;
    }

    // Include difficulty if available
    if (question.skill.difficulty) {
      prompt += `\nDifficulty level: ${question.skill.difficulty}`;
    }

    // Add question format instructions
    prompt += `\n\nFor the question format, randomly choose one of these and design the question accordingly:
1. "Open-ended" - Requires a descriptive or narrative answer. Useful for assessing communication, reasoning, or opinion-based responses.
2. "Coding" - Candidate writes or debugs code. Used for evaluating problem-solving skills, algorithms, and programming language proficiency.
3. "Scenario" - Presents a short, realistic situation and asks how the candidate would respond or act. Tests decision-making, ethics, soft skills, or role-specific judgment.
4. "Case Study" - In-depth problem based on a real or simulated business/technical challenge. Requires analysis, synthesis of information, and a structured response. Often multi-step.
5. "Design" - Asks the candidate to architect a system, process, or solution. Often used in software/system design, business process optimization, or operational planning.
6. "Live Assessment" - Real-time tasks like pair programming, whiteboarding, or collaborative exercises. Tests real-world working ability and communication under pressure.`;

    // Generate a new question using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content:
            "You are an expert interviewer creating high-quality interview questions. Format your response as a JSON object with fields: question, answer, category (Technical/Experience/Problem Solving/Soft Skills), difficulty (Easy/Medium/Hard), questionFormat (Open-ended/Coding/Scenario/Case Study/Design/Live Assessment), and coding (boolean: true if questionFormat is 'Coding' or question involves writing/debugging code, false otherwise).",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    // Parse the response
    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    let newQuestionData;

    try {
      newQuestionData = JSON.parse(content);
    } catch (error) {
      // If can't parse as JSON, extract the question manually
      const questionMatch = content?.match(/question":\s*"([^"]+)"/);
      const answerMatch = content?.match(/answer":\s*"([^"]+)"/);
      const categoryMatch = content?.match(/category":\s*"([^"]+)"/);
      const difficultyMatch = content?.match(/difficulty":\s*"([^"]+)"/);
      const formatMatch = content?.match(/questionFormat":\s*"([^"]+)"/);

      newQuestionData = {
        question: questionMatch ? questionMatch[1] : "Generated question",
        answer: answerMatch ? answerMatch[1] : "Generated answer",
        category: categoryMatch
          ? categoryMatch[1]
          : questionContent.category || "Technical",
        difficulty: difficultyMatch
          ? difficultyMatch[1]
          : questionContent.difficulty || "Medium",
        questionFormat: formatMatch
          ? formatMatch[1]
          : questionContent.questionFormat || "Scenario",
        coding: false, // Default to false for manual parsing
      };
    }

    // Ensure coding flag is properly set
    const isCoding =
      newQuestionData.coding === true ||
      newQuestionData.questionFormat?.toLowerCase() === "coding" ||
      (newQuestionData.question &&
        newQuestionData.question.toLowerCase().includes("code")) ||
      (newQuestionData.question &&
        newQuestionData.question.toLowerCase().includes("algorithm")) ||
      (newQuestionData.question &&
        newQuestionData.question.toLowerCase().includes("programming"));

    // Add coding field to the question data
    const questionDataWithCoding = {
      ...newQuestionData,
      coding: isCoding,
    };

    // Use a transaction to create the new question and regeneration record
    const result = await prisma.$transaction(async (tx) => {
      // Create the new question
      const newQuestion = await tx.question.create({
        data: {
          content: JSON.stringify(questionDataWithCoding),
          skillId: question.skillId,
          recordId: question.recordId,
          liked: "NONE",
          coding: isCoding,
        },
      });

      // Create the regeneration record
      const regeneration = await tx.regeneration.create({
        data: {
          originalQuestionId: questionId,
          newQuestionId: newQuestion.id,
          reason: reason || null,
          userFeedback: userFeedback || null,
          skillId: question.skillId,
          recordId: question.recordId,
        },
        include: {
          originalQuestion: true,
          newQuestion: true,
          skill: true,
        },
      });

      return { newQuestion, regeneration };
    });

    return NextResponse.json({
      success: true,
      question: {
        ...result.newQuestion,
        content: newQuestionData,
      },
      regeneration: result.regeneration,
      message: "Question regenerated successfully",
    });
  } catch (error: any) {
    console.error("Error regenerating question:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to regenerate question",
      },
      { status: 500 }
    );
  }
}
