import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate prompt for skills
const generatePrompt = (
  jobTitle: string,
  skills: any[],
  questionsPerSkill: Map<string, number>
) => {
  const skillsFormatted = skills
    .map((skill) => {
      const numQuestions = questionsPerSkill.get(skill.id) || 0;
      if (numQuestions <= 0) return null; // Skip skills that don't need questions

      return `- ${skill.name} (Level: ${skill.level}, Difficulty: ${
        skill.difficulty || "Medium"
      }, Questions: ${numQuestions})`;
    })
    .filter(Boolean) // Remove null entries
    .join("\n");

  return `Generate interview questions for the following skills for a ${jobTitle} position.
IMPORTANT: Generate the EXACT number of questions specified for each skill - no more, no less.

${skillsFormatted}

IMPORTANT:
1. You are creating questions that will be asked in an interview.
2. The questions should be in the format of interview questions like how interviewer will ask the question to the candidate.
3. Question should not be long.
4. In the question, do not use any markdown formatting—present all content as plain text only.

Create questions that test the candidate's knowledge and experience:
- For PROFESSIONAL level skills, create challenging, in-depth questions.
- For INTERMEDIATE level skills, create moderately difficult questions.
- For BEGINNER level skills, create basic but relevant questions.

For each question, randomly choose one of these question formats and design the question accordingly:
1. "Open-ended" - Requires a descriptive or narrative answer. Useful for assessing communication, reasoning, or opinion-based responses.
2. "Coding" - Candidate writes or debugs code. Used for evaluating problem-solving skills, algorithms, and programming language proficiency.
3. "Scenario" - Presents a short, realistic situation and asks how the candidate would respond or act. Tests decision-making, ethics, soft skills, or role-specific judgment.
4. "Case Study" - In-depth problem based on a real or simulated business/technical challenge. Requires analysis, synthesis of information, and a structured response. Often multi-step.
5. "Design" - Asks the candidate to architect a system, process, or solution. Often used in software/system design, business process optimization, or operational planning.
6. "Live Assessment" - Real-time tasks like pair programming, whiteboarding, or collaborative exercises. Tests real-world working ability and communication under pressure.

Format your response as a JSON object with a 'questions' key containing an array of question objects, where each object has:
1. A "question" field with the interview question
2. A "answer" field with a suggested model answer for the interviewer
3. A "category" field with one of: "Technical", "Experience", "Problem Solving", or "Soft Skills"
4. A "difficulty" field matching the skill's specified difficulty
5. A "skillName" field that specifies which skill from the list this question is targeting (must match exactly one of the skill names provided)
6. A "questionFormat" field with one of: "Open-ended", "Coding", "Scenario", "Case Study", "Design", or "Live Assessment"
7. A "coding" field with a boolean value: true if the questionFormat is "Coding" OR if the question involves writing/debugging code, false otherwise

IMPORTANT: The "coding" field must be set to true when questionFormat is "Coding" or when the question requires the candidate to write, debug, or analyze code. This includes code reviews, algorithm problems, debugging exercises, or any hands-on programming tasks.

Example:
{"questions": [
  {
    "question": "Can you describe your experience with deploying applications using Docker containers?",
    "answer": "A strong answer would demonstrate hands-on experience with Docker, including creating Dockerfiles, managing containers, using Docker Compose for multi-container applications, and understanding Docker networking and volumes. The candidate should explain specific projects where they've used Docker in production environments, challenges they faced, and how they solved them. Knowledge of Docker orchestration with Kubernetes or Docker Swarm would be a plus.",
    "category": "Technical",
    "difficulty": "Medium",
    "skillName": "Docker",
    "questionFormat": "Open-ended"
  }
]}

IMPORTANT: You must generate the EXACT number of questions requested for each skill - no more, no less.`;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Accept force parameter from request body
    const requestBody = await request.json();
    const forceRegenerate = requestBody.forceRegenerate === true;

    // Find the record with skills
    const record = await prisma.skillRecord.findUnique({
      where: { id },
      include: {
        skills: {
          where: { requirement: "MANDATORY" }, // Only generate for mandatory skills
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Record not found" },
        { status: 404 }
      );
    }

    if (record.skills.length === 0) {
      return NextResponse.json(
        { success: false, error: "No mandatory skills found" },
        { status: 400 }
      );
    }

    // Get existing questions
    const existingQuestions = await prisma.question.findMany({
      where: {
        recordId: id,
        skillId: {
          in: record.skills.map((skill: any) => skill.id),
        },
      },
      select: {
        skillId: true,
      },
    });

    // Count existing questions per skill
    const existingQuestionCounts = new Map<string, number>();
    existingQuestions.forEach((question) => {
      const currentCount = existingQuestionCounts.get(question.skillId) || 0;
      existingQuestionCounts.set(question.skillId, currentCount + 1);
    });

    // Store all generated questions
    const allGeneratedQuestions = [];
    let totalQuestionsGenerated = 0;

    // Process each skill individually
    for (const skill of record.skills) {
      const requestedCount = skill.numQuestions || 1;
      const existingCount = existingQuestionCounts.get(skill.id) || 0;

      // If forceRegenerate is true, generate the full requested count
      // Otherwise, only generate what's needed to reach the requested count
      const neededCount = forceRegenerate
        ? requestedCount
        : Math.max(0, requestedCount - existingCount);

      // Skip if no questions needed for this skill
      if (neededCount <= 0) {
        console.log(
          `Skill ${skill.name} already has ${existingCount} questions. Skipping.`
        );
        continue;
      }

      console.log(
        `Generating ${neededCount} questions for skill ${skill.name}`
      );

      // Create a map with just this skill
      const questionsToGenerate = new Map<string, number>();
      questionsToGenerate.set(skill.id, neededCount);

      // Generate prompt for only this skill
      const prompt = generatePrompt(
        record.jobTitle,
        [skill], // Pass only the current skill
        questionsToGenerate
      );

      // Call OpenAI API for this skill
      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: `You are an expert interviewer who creates relevant interview questions based on specific skills. Include detailed suggested answers for each question. You must generate EXACTLY ${neededCount} unique questions for the skill "${skill.name}" - no more, no less.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const questionsContent = chatCompletion.choices[0]?.message?.content;

      if (!questionsContent) {
        console.error(
          `No response received from OpenAI for skill: ${skill.name}`
        );
        continue;
      }

      try {
        // Parse the JSON response
        const parsedResponse = JSON.parse(questionsContent);

        // Check if the response has the expected format
        if (
          parsedResponse.questions &&
          Array.isArray(parsedResponse.questions)
        ) {
          const questions = parsedResponse.questions.slice(0, neededCount); // Ensure we only take what we need

          // If forceRegenerate is true and we already have questions, delete the existing ones
          if (forceRegenerate && existingCount > 0) {
            console.log(
              `Deleting ${existingCount} existing questions for skill ${skill.name}`
            );

            // Delete existing questions for this skill
            await prisma.question.deleteMany({
              where: {
                skillId: skill.id,
                recordId: id,
              },
            });

            // Reset the existing count
            existingQuestionCounts.set(skill.id, 0);
          }

          // Create a map of skill names to ids (just for this skill)
          const skillId = skill.id;
          const skillName = skill.name.toLowerCase();

          // Save questions to the database
          for (const question of questions) {
            // Ensure coding flag is properly set
            const isCoding =
              question.coding === true ||
              question.questionFormat?.toLowerCase() === "coding" ||
              (question.question &&
                question.question.toLowerCase().includes("code")) ||
              (question.question &&
                question.question.toLowerCase().includes("algorithm")) ||
              (question.question &&
                question.question.toLowerCase().includes("programming"));

            // Create the question
            const createdQuestion = await prisma.question.create({
              data: {
                content: JSON.stringify({
                  question: question.question,
                  answer: question.answer,
                  category: question.category,
                  difficulty:
                    question.difficulty || skill.difficulty || "Medium",
                  questionFormat: question.questionFormat || "Scenario",
                  coding: isCoding,
                }),
                skillId: skillId,
                recordId: id,
                coding: isCoding,
              },
            });

            // Add this question to our collection with all metadata
            allGeneratedQuestions.push({
              ...question,
              id: createdQuestion.id,
              skillId: skillId,
              skillName: skill.name,
            });
          }

          // Update count of total questions generated
          totalQuestionsGenerated += questions.length;

          // Update the existing count for next skills
          existingQuestionCounts.set(
            skillId,
            (existingQuestionCounts.get(skillId) || 0) + questions.length
          );
        } else {
          console.error(`Unexpected response format for skill ${skill.name}`);
        }
      } catch (error: any) {
        console.error(
          `Error processing questions for skill ${skill.name}:`,
          error
        );
        // Continue with the next skill
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${totalQuestionsGenerated} questions across ${record.skills.length} skills for ${record.jobTitle}`,
      questions: allGeneratedQuestions,
    });
  } catch (error: any) {
    console.error("Error generating questions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate questions",
      },
      { status: 500 }
    );
  }
}
