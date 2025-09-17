import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ResumeData {
  name: string;
  email: string;
  phone?: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year?: string;
  }>;
  summary?: string;
  totalExperience?: string;
}

interface InterviewQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
  difficulty: string;
  skillName: string;
  questionFormat: string;
  coding: boolean;
  source: string; // 'skill' | 'experience' | 'general'
}

export async function POST(req: NextRequest) {
  try {
    const {
      resumeData,
      questionsPerSkill = 2,
      experienceQuestions = 3,
    } = await req.json();

    if (!resumeData) {
      return NextResponse.json(
        { error: "Resume data is required" },
        { status: 400 }
      );
    }

    console.log("Generating questions for resume:", resumeData.name);

    const questions: InterviewQuestion[] = [];

    // Generate skill-based questions
    if (resumeData.skills && resumeData.skills.length > 0) {
      const skillQuestions = await generateSkillBasedQuestions(
        resumeData.skills,
        questionsPerSkill
      );
      questions.push(...skillQuestions);
    }

    // Generate experience-based questions
    if (resumeData.experience && resumeData.experience.length > 0) {
      const expQuestions = await generateExperienceBasedQuestions(
        resumeData.experience,
        experienceQuestions
      );
      questions.push(...expQuestions);
    }

    // Generate general questions based on overall profile
    const generalQuestions = await generateGeneralQuestions(resumeData);
    questions.push(...generalQuestions);

    return NextResponse.json({
      success: true,
      questions: questions,
      totalQuestions: questions.length,
      breakdown: {
        skillQuestions: questions.filter((q) => q.source === "skill").length,
        experienceQuestions: questions.filter((q) => q.source === "experience")
          .length,
        generalQuestions: questions.filter((q) => q.source === "general")
          .length,
      },
    });
  } catch (error) {
    console.error("Error generating resume questions:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Error generating questions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}

async function generateSkillBasedQuestions(
  skills: string[],
  questionsPerSkill: number
): Promise<InterviewQuestion[]> {
  const questions: InterviewQuestion[] = [];

  // Group similar skills and pick top skills for questions
  const topSkills = skills.slice(0, Math.min(8, skills.length)); // Limit to prevent too many questions

  for (const skill of topSkills) {
    try {
      const skillQuestions = await generateQuestionsForSkill(
        skill,
        questionsPerSkill
      );
      questions.push(...skillQuestions);
    } catch (error) {
      console.error(`Error generating questions for skill ${skill}:`, error);
    }
  }

  return questions;
}

async function generateQuestionsForSkill(
  skillName: string,
  numQuestions: number
): Promise<InterviewQuestion[]> {
  const prompt = `Generate exactly ${numQuestions} interview questions for the skill "${skillName}".

For each question, randomly choose one of these question formats:
1. "Open-ended" - Requires a descriptive answer testing understanding
2. "Coding" - Candidate writes or debugs code
3. "Scenario" - Presents a realistic situation to solve
4. "Case Study" - In-depth problem analysis
5. "Design" - Asks to architect a system or solution

Determine appropriate difficulty based on the skill:
- Programming languages, frameworks: Medium to Hard
- Tools, databases: Easy to Medium  
- Soft skills: Easy to Medium

Format as JSON with 'questions' array, each having:
- question: The interview question
- answer: Comprehensive model answer for interviewer
- category: "TECHNICAL" for technical skills, "FUNCTIONAL" for tools/processes
- difficulty: "Easy", "Medium", or "Hard"
- skillName: "${skillName}"
- questionFormat: One of the 6 formats above
- coding: true if involves writing/debugging code, false otherwise

Skill: ${skillName}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content:
          "You are an expert interviewer creating relevant, practical interview questions. Focus on real-world application of skills.",
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
    throw new Error(`No response for skill ${skillName}`);
  }

  const parsedResponse = JSON.parse(content);
  const skillQuestions = parsedResponse.questions || [];

  return skillQuestions.map((q: any, index: number) => ({
    id: `skill-${skillName.toLowerCase().replace(/\s+/g, "-")}-${index}`,
    question: q.question,
    answer: q.answer,
    category: q.category || "TECHNICAL",
    difficulty: q.difficulty || "Medium",
    skillName: q.skillName || skillName,
    questionFormat: q.questionFormat || "Scenario",
    coding: q.coding === true || q.questionFormat === "Coding",
    source: "skill" as const,
  }));
}

async function generateExperienceBasedQuestions(
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>,
  numQuestions: number
): Promise<InterviewQuestion[]> {
  // Focus on most recent/relevant experiences
  const relevantExperience = experience.slice(0, 3);

  const experienceContext = relevantExperience
    .map(
      (exp) =>
        `${exp.title} at ${exp.company} (${exp.duration}): ${exp.description}`
    )
    .join("\n\n");

  const prompt = `Based on the following work experience, generate exactly ${numQuestions} behavioral and situational interview questions:

${experienceContext}

Create questions that:
1. Test problem-solving abilities demonstrated in past roles
2. Explore specific achievements and challenges
3. Assess leadership, teamwork, and communication skills
4. Validate technical decisions and project outcomes

Format as JSON with 'questions' array, each having:
- question: The interview question
- answer: What a good answer should include
- category: "BEHAVIORAL" or "FUNCTIONAL"
- difficulty: "Easy" or "Medium"
- skillName: The relevant competency being tested
- questionFormat: "Scenario" or "Open-ended"
- coding: false (these are not coding questions)`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content:
          "You are an expert interviewer creating behavioral questions based on candidate experience.",
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
    throw new Error("No response for experience questions");
  }

  const parsedResponse = JSON.parse(content);
  const expQuestions = parsedResponse.questions || [];

  return expQuestions.map((q: any, index: number) => ({
    id: `experience-${index}`,
    question: q.question,
    answer: q.answer,
    category: q.category || "BEHAVIORAL",
    difficulty: q.difficulty || "Medium",
    skillName: q.skillName || "Experience",
    questionFormat: q.questionFormat || "Scenario",
    coding: false,
    source: "experience" as const,
  }));
}

async function generateGeneralQuestions(
  resumeData: ResumeData
): Promise<InterviewQuestion[]> {
  const prompt = `Based on this candidate profile, generate exactly 2 general interview questions:

Name: ${resumeData.name}
Experience Level: ${resumeData.totalExperience}
Summary: ${resumeData.summary}
Education: ${resumeData.education
    .map((edu) => `${edu.degree} from ${edu.institution}`)
    .join(", ")}

Create questions that:
1. Test cultural fit and motivation
2. Assess communication and professionalism
3. Explore career goals and aspirations

Format as JSON with 'questions' array, each having:
- question: The interview question
- answer: What interviewers should look for in responses
- category: "BEHAVIORAL"
- difficulty: "Easy"
- skillName: "Communication" or "Cultural Fit"
- questionFormat: "Open-ended"
- coding: false`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content:
          "You are an expert interviewer creating general assessment questions.",
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
    throw new Error("No response for general questions");
  }

  const parsedResponse = JSON.parse(content);
  const generalQuestions = parsedResponse.questions || [];

  return generalQuestions.map((q: any, index: number) => ({
    id: `general-${index}`,
    question: q.question,
    answer: q.answer,
    category: "BEHAVIORAL",
    difficulty: "Easy",
    skillName: q.skillName || "General",
    questionFormat: "Open-ended",
    coding: false,
    source: "general" as const,
  }));
}
