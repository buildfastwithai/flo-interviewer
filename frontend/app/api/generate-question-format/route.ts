import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface QuestionFormatOutput {
  slNo: number;
  skill: string;
  questionTitle: string;
  questionDescription: string;
  idealAnswer: string;
  coding: boolean;
}

const generateQuestionsPrompt = (
  skills: string[],
  experienceRange: string = "8 to 10 years"
) => {
  const skillsList = skills
    .map((skill, index) => `${index + 1}. ${skill}`)
    .join("\n");

  return `As a question generator for interviews, I want you to generate scenario-based technical questions with short ideal answers based on the skills and job description provided below.
⚠️ Do not wait for confirmation. Generate the full set in one go. No previews or samples.

Instructions:

Generate 3 questions under each skill listed below.
Each question should be scenario-based and suitable for a candidate with ${experienceRange} years of experience.
Include code snippets where applicable.
Format output as a table with the following columns:
Sl No
Skill
Question Title (use first sentence of the question)
Question Description (full question)
Ideal Answer (CKEditor-compatible HTML):
Use <br> for line breaks
Use <ul><li> for bullet points
Wrap code or script blocks using <pre><code>...</code></pre>
Escape newlines within <pre><code> blocks using \\n
All fields should be strings and safe for database storage.
Preserve all formatting, indentation, and technical clarity.
Generate all output in a single response.
Experience Range: ${experienceRange}

Skill List:
${skillsList}

Format your response as a JSON object with a 'questions' array where each object has:
- slNo: Sequential number starting from 1
- skill: The skill name
- questionTitle: First sentence of the question
- questionDescription: Full question content
- idealAnswer: CKEditor-compatible HTML formatted answer
- coding: Boolean value (true if the question involves writing/debugging code, false otherwise)

IMPORTANT: Generate exactly 3 questions per skill. Each question should be unique and scenario-based. Set "coding" to true for any question that requires the candidate to write, debug, analyze code, solve algorithms, or perform any hands-on programming tasks.`;
};

export async function POST(request: Request) {
  try {
    const {
      jobDescription,
      jobTitle,
      experienceRange = "8 to 10 years",
    } = await request.json();

    if (!jobDescription) {
      return NextResponse.json(
        { success: false, error: "Job description is required" },
        { status: 400 }
      );
    }

    // Step 1: Extract skills from JD using existing API
    console.log("Extracting skills from job description...");

    const extractSkillsResponse = await fetch(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/api/extract-skills`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobDescription,
          jobTitle,
        }),
      }
    );

    if (!extractSkillsResponse.ok) {
      throw new Error("Failed to extract skills from job description");
    }

    const skillsData = await extractSkillsResponse.json();

    if (!skillsData.success || !skillsData.analysis?.skills) {
      throw new Error(skillsData.error || "Failed to extract skills");
    }

    // Extract skill names
    const skills = skillsData.analysis.skills.map((skill: any) => skill.name);

    if (skills.length === 0) {
      return NextResponse.json(
        { success: false, error: "No skills found in job description" },
        { status: 400 }
      );
    }

    console.log(`Found ${skills.length} skills:`, skills);

    // Step 2: Generate questions for all skills using GPT-4.1
    console.log("Generating questions for all skills...");

    const prompt = generateQuestionsPrompt(skills, experienceRange);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are an expert interview question generator. You must generate exactly 3 scenario-based questions for each skill provided. Format the ideal answers using proper HTML tags as specified. Make sure each question is unique, practical, and suitable for experienced candidates.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response received from OpenAI");
    }

    // Parse the response
    let questionsData;
    try {
      questionsData = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Failed to parse AI response");
    }

    if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
      console.error("Invalid response format:", questionsData);
      throw new Error("Invalid response format from AI");
    }

    const formattedQuestions: QuestionFormatOutput[] =
      questionsData.questions.map((q: any, index: number) => ({
        slNo: index + 1,
        skill: q.skill || "",
        questionTitle: q.questionTitle || "",
        questionDescription: q.questionDescription || "",
        idealAnswer: q.idealAnswer || "",
        coding:
          q.coding === true ||
          (q.questionDescription &&
            q.questionDescription.toLowerCase().includes("code")) ||
          (q.questionDescription &&
            q.questionDescription.toLowerCase().includes("algorithm")) ||
          (q.questionDescription &&
            q.questionDescription.toLowerCase().includes("programming")),
      }));

    console.log(
      `Generated ${formattedQuestions.length} questions successfully`
    );

    // Store in database
    const excelQuestionSet = await prisma.excelQuestionSet.create({
      data: {
        jobTitle:
          jobTitle ||
          skillsData.analysis.generalInfo.jobTitle ||
          "Untitled Position",
        experienceRange,
        totalQuestions: formattedQuestions.length,
        skillsExtracted: skills,
        rawJobDescription: jobDescription,
        recordId: skillsData.recordId || null,
        questions: {
          create: formattedQuestions.map((question) => ({
            slNo: question.slNo,
            skill: question.skill,
            questionTitle: question.questionTitle,
            questionDescription: question.questionDescription,
            idealAnswer: question.idealAnswer,
            coding: question.coding,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    return NextResponse.json({
      success: true,
      setId: excelQuestionSet.id,
      data: {
        jobTitle: excelQuestionSet.jobTitle,
        experienceRange: excelQuestionSet.experienceRange,
        skillsExtracted: excelQuestionSet.skillsExtracted,
        questions: formattedQuestions,
        totalQuestions: excelQuestionSet.totalQuestions,
        questionsPerSkill: 3,
      },
      metadata: {
        extractedSkills: skillsData.analysis,
        generatedAt: excelQuestionSet.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error in generate-question-format:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate questions",
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
