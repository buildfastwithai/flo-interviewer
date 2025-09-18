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
  source: string; // 'jd' | 'resume' | 'modified'
}

export async function POST(req: NextRequest) {
  try {
    const {
      resumeData,
      questionsPerSkill = 1,
      experienceQuestions = 4,
      jdText = "",
      mode = "resume", // 'jd' | 'resume' | 'modify_light' | 'modify_deep'
      baseQuestions = [], // for modify modes (array of questions from Tab 1 - JD)
    } = await req.json();

    if (!resumeData) {
      return NextResponse.json(
        { error: "Resume data is required" },
        { status: 400 }
      );
    }

    console.log("Question generation mode:", mode, "for:", resumeData.name);

    if (mode === "jd") {
      if (!jdText || jdText.trim().length === 0) {
        return NextResponse.json(
          { error: "Job Description (jdText) is required for JD mode" },
          { status: 400 }
        );
      }

      const jdQuestions = await generateJDQuestions(
        jdText,
        resumeData.skills,
        questionsPerSkill
      );

      // Additionally generate 2–3 resume-related behavioral/scenario questions
      const extraResumeQsCount = Math.max(2, Math.min(3, experienceQuestions));
      const resumeRelated = await generateExperienceBasedQuestions(
        resumeData.experience || [],
        extraResumeQsCount,
        "resume"
      );

      const combined = [...jdQuestions, ...resumeRelated];

      return NextResponse.json({
        success: true,
        questions: combined,
        totalQuestions: combined.length,
        meta: { baseJDCount: jdQuestions.length, extraResumeCount: resumeRelated.length },
      });
    }

    if (mode === "modify_light" || mode === "modify_deep") {
      const intensity = mode === "modify_light" ? "light" : "deep";
      const modified = await modifyJDQuestions(baseQuestions, resumeData, intensity);
      return NextResponse.json({
        success: true,
        questions: modified,
        totalQuestions: modified.length,
        meta: { intensity },
      });
    }

    // Default: resume-only generation
    const questions: InterviewQuestion[] = [];

    if (resumeData.skills && resumeData.skills.length > 0) {
      const skillQuestions = await generateSkillBasedQuestions(
        resumeData.skills,
        questionsPerSkill
      );
      // mark as resume
      questions.push(...skillQuestions.map((q) => ({ ...q, source: "resume" })));
    }

    if (resumeData.experience && resumeData.experience.length > 0) {
      const expQuestions = await generateExperienceBasedQuestions(
        resumeData.experience,
        experienceQuestions,
        "resume"
      );
      questions.push(...expQuestions.map((q) => ({ ...q, source: "resume" })));
    }

    const generalQuestions = await generateGeneralQuestions(resumeData);
    questions.push(...generalQuestions.map((q) => ({ ...q, source: "resume" })));

    return NextResponse.json({
      success: true,
      questions: questions,
      totalQuestions: questions.length,
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

  // Take the top 5-6 main skills for questions
  const topSkills = skills.slice(0, Math.min(6, skills.length));

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
  const prompt = `Generate exactly ${numQuestions} open-ended interview question for the skill "${skillName}".

Create an "Open-ended" question that requires a descriptive answer to test practical understanding, real-world application, and communication skills. The question should assess how well the candidate understands the concepts, best practices, and practical usage of ${skillName}.

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
- questionFormat: "Open-ended"
- coding: false (these are open-ended discussion questions, not coding exercises)

Skill: ${skillName}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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
    source: "resume" as const,
  }));
}

async function generateExperienceBasedQuestions(
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>,
  numQuestions: number,
  source: "resume" | "jd" = "resume"
): Promise<InterviewQuestion[]> {
  // Focus on most recent/relevant experiences
  const relevantExperience = experience.slice(0, 3);

  const experienceContext = relevantExperience
    .map(
      (exp) =>
        `${exp.title} at ${exp.company} (${exp.duration}): ${exp.description}`
    )
    .join("\n\n");

  const prompt = `Based on the following work experience, generate exactly ${numQuestions} behavioral and scenario-based interview questions:

${experienceContext}

Create open-ended questions that:
1. Test problem-solving and decision-making in real situations
2. Explore specific challenges and how they were overcome
3. Assess leadership, teamwork, and communication skills through examples
4. Use the STAR method approach (Situation, Task, Action, Result)
5. Focus on behavioral scenarios that reveal character and work style

Format as JSON with 'questions' array, each having:
- question: The interview question
- answer: What a good answer should include
- category: "BEHAVIORAL" or "FUNCTIONAL"
- difficulty: "Easy" or "Medium"
- skillName: The relevant competency being tested
- questionFormat: "Open-ended" (all questions should be open-ended behavioral/scenario questions)
- coding: false (these are not coding questions)`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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
    source,
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
    model: "gpt-4o-mini",
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
    source: "resume" as const,
  }));
}

async function generateJDQuestions(
  jdText: string,
  resumeSkills: string[],
  questionsPerSkill: number
): Promise<InterviewQuestion[]> {
  const topSkills = resumeSkills.slice(0, Math.min(6, resumeSkills.length));
  const total = Math.max(1, questionsPerSkill) * topSkills.length;

  const prompt = `You are creating interview questions from a Job Description (JD).
JD:
"""
${jdText}
"""

Candidate Top Skills (use only these for skillName): ${topSkills.join(", ")}

Generate exactly ${total} questions aligned DIRECTLY to the JD responsibilities and requirements.

Rules:
- Distribute questions across the listed skills and set skillName to one of them exactly.
- Keep questions concise and interview-ready, no markdown.
- Mix categories among Technical, Functional, Problem Solving, Soft Skills as appropriate.
- Randomly vary questionFormat among Open-ended, Scenario, Case Study, Design, Coding (only if appropriate for the skill).
- Set coding=true only for Coding format or when answering requires writing/debugging code.

Respond as JSON: { "questions": [ { question, answer, category, difficulty, skillName, questionFormat, coding } ] }`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert interviewer generating JD-aligned questions anchored to candidate skills." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response for JD questions");
  const parsed = JSON.parse(content);
  const jdQs = parsed.questions || [];
  return jdQs.map((q: any, index: number) => ({
    id: `jd-${index}`,
    question: q.question,
    answer: q.answer,
    category: q.category || "TECHNICAL",
    difficulty: q.difficulty || "Medium",
    skillName: q.skillName && topSkills.includes(q.skillName) ? q.skillName : topSkills[index % topSkills.length],
    questionFormat: q.questionFormat || "Open-ended",
    coding: q.coding === true || q.questionFormat === "Coding",
    source: "jd" as const,
  }));
}

async function modifyJDQuestions(
  baseQuestions: Array<Pick<InterviewQuestion, "question" | "skillName" | "category" | "difficulty" | "questionFormat" | "coding" | "answer">>,
  resumeData: ResumeData,
  intensity: "light" | "deep"
): Promise<InterviewQuestion[]> {
  if (!Array.isArray(baseQuestions) || baseQuestions.length === 0) return [];

  const ratioText = intensity === "light" ? "30-40%" : "70-80%";

  const prompt = `From the following list of JD-generated questions, select ONLY the ones most relevant to the candidate's resume and REWRITE those selected.

Target proportion: ${ratioText} of the total questions, chosen by resume relevance. If fewer are relevant, select fewer; do NOT add new questions.

Candidate:
Name: ${resumeData.name}
Summary: ${resumeData.summary}
Top Skills: ${resumeData.skills.slice(0, 10).join(", ")}
Recent Experience: ${resumeData.experience
    .slice(0, 3)
    .map((e) => `${e.title} at ${e.company}: ${e.description}`)
    .join(" | ")}

Rules:
- Evaluate relevance by matching skill, responsibilities, tools, and scope to the resume.
- Keep each selected question's skillName the SAME and ensure it is one of the candidate's skills.
- ${
    intensity === "light"
      ? "Make light modifications (clarity, specificity, slight alignment to resume context)."
      : "Make deep modifications (ground in resume achievements, concrete scenarios, metrics, tools used)."
  }
- Maintain questionFormat; if original was Coding, keep Coding. Otherwise keep original format.
- Avoid repetition across returned questions. No markdown.

Output JSON strictly as: { "questions": [ { originalIndex, question, answer, category, difficulty, skillName, questionFormat, coding } ] }
- Include only the selected and modified questions.

All JD Questions (with originalIndex):
${baseQuestions
    .map(
      (q, i) =>
        `${i}. [${q.skillName}] (${q.questionFormat}) ${q.question}\nAnswer: ${q.answer || ""}`
    )
    .join("\n\n")}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You tailor interview questions to a candidate's resume while preserving the targeted skill." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response for modified questions");
  const parsed = JSON.parse(content);
  const out = Array.isArray(parsed.questions) ? parsed.questions : [];

  // Sort by originalIndex if provided to preserve original order
  const normalized = out
    .map((q: any) => ({ ...q, originalIndex: Number(q.originalIndex) }))
    .filter((q: any) => !Number.isNaN(q.originalIndex))
    .sort((a: any, b: any) => a.originalIndex - b.originalIndex);

  const fallback = out.length > 0 && normalized.length === 0 ? out : normalized;

  return fallback.map((q: any, idx: number) => {
    const original = baseQuestions[q.originalIndex] || baseQuestions[idx] || {};
    const originalFormat = original.questionFormat || "Open-ended";
    const isCoding =
      q.coding === true ||
      q.questionFormat === "Coding" ||
      originalFormat === "Coding";

    return {
      id: `modified-${q.originalIndex ?? idx}`,
      question: q.question,
      answer: q.answer,
      category: q.category || (original as any).category || "TECHNICAL",
      difficulty: q.difficulty || (original as any).difficulty || "Medium",
      skillName: q.skillName || (original as any).skillName,
      questionFormat: q.questionFormat || originalFormat,
      coding: isCoding,
      source: "modified" as const,
      // Help client merge with JD list
      originalIndex: q.originalIndex ?? idx,
    } as InterviewQuestion;
  });
}
