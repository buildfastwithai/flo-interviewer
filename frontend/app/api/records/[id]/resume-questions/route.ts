import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const resumeText: string | undefined = body?.resumeText;
    const count: number = Math.min(Math.max(Number(body?.count) || 4, 1), 10);

    if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: "Invalid or too-short resumeText" },
        { status: 400 }
      );
    }

    // Fetch record and skills
    const record = await prisma.skillRecord.findUnique({
      where: { id },
      include: { skills: true },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Record not found" },
        { status: 404 }
      );
    }

    if (!record.skills || record.skills.length === 0) {
      return NextResponse.json(
        { success: false, error: "No skills found for this record" },
        { status: 400 }
      );
    }

    // Prepare list of skill names for strict mapping
    const skillNames = record.skills.map((s) => s.name);
    const skillsClause = skillNames.map((n) => `- ${n}`).join("\n");

    const system = `You are a seasoned technical interviewer. You craft specific, resume-grounded questions that probe depth, tradeoffs, debugging ability, and real outcomes. Avoid generic textbook prompts. Write concise interviewer-style questions with strong model answers. Output strict JSON only.`;
    const user = `Job Title: ${record.jobTitle}
Resume (excerpt, may be long):\n"""
${resumeText}
"""

Create ${count} unique interview questions tailored to the candidate's resume. Make each question specific to their projects, tech stack, and outcomes mentioned. Keep questions crisp (ideally < 25 words) and asked the way an interviewer would.

Target coverage (pick the most relevant given the resume):
1) Project deep-dive: why/how decisions, tradeoffs, metrics, and impact.
2) Debugging/failure scenario: incident, symptoms, root cause analysis, prevention.
3) Design/architecture: redesign/scale with explicit constraints (throughput, latency, memory, reliability, cost).
4) Coding task tailored to their stack: write/inspect/fix a short snippet or algorithm.
5) Collaboration/leadership: cross-team communication, influencing, review process (only if resume suggests it).

Guidelines:
- Anchor to concrete resume signals (e.g., a service, library, database, framework, cloud, platform). No vague questions.
- Use realistic constraints where appropriate (e.g., 10k RPS, p95 < 200ms, memory 256MB, daily batch 5M rows).
- If the title suggests seniority (Senior/Lead/Staff), set difficulty to Professional; otherwise default to Medium unless clearly Beginner.
- Choose questionFormat from: Open-ended, Coding, Scenario, Case Study, Design, or Live Assessment.
- Set coding=true only for actual coding/algorithm/debug-code prompts.
- Absolutely avoid duplicates or near-duplicates.

SKILL MAPPING (mandatory):
For each question, set skillName to exactly one of these existing skills for the record (best fit; EXACT string match required):\n${skillsClause}

Response format (strict JSON):
{
  "questions": [
    {
      "question": string,
      "answer": string,
      "category": "Technical"|"Experience"|"Problem Solving"|"Soft Skills",
      "difficulty": "Beginner"|"Medium"|"Professional",
      "skillName": string, // MUST be one of the listed skills exactly
      "questionFormat": "Open-ended"|"Coding"|"Scenario"|"Case Study"|"Design"|"Live Assessment",
      "coding": boolean
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { success: false, error: "No content from model" },
        { status: 502 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { success: false, error: "Model returned invalid JSON" },
        { status: 502 }
      );
    }

    const generated = Array.isArray(parsed?.questions) ? parsed.questions.slice(0, count) : [];
    if (generated.length === 0) {
      return NextResponse.json(
        { success: false, error: "No questions generated" },
        { status: 502 }
      );
    }

    // Map skillName to skillId, enforce coding flag, and store with source tags
    const nameToSkill = new Map(record.skills.map((s) => [s.name.toLowerCase(), s]));
    const saved: any[] = [];

    for (const q of generated) {
      const target = nameToSkill.get(String(q.skillName || "").toLowerCase());
      if (!target) {
        // Skip questions that fail strict mapping
        continue;
      }

      const isCoding =
        q?.coding === true ||
        String(q?.questionFormat || "").toLowerCase() === "coding" ||
        (q?.question && String(q.question).toLowerCase().includes("code")) ||
        (q?.question && String(q.question).toLowerCase().includes("algorithm")) ||
        (q?.question && String(q.question).toLowerCase().includes("programming"));

      const created = await prisma.question.create({
        data: {
          content: JSON.stringify({
            question: q.question,
            answer: q.answer,
            category: q.category || "Technical",
            difficulty: q.difficulty || "Medium",
            questionFormat: q.questionFormat || "Scenario",
            coding: isCoding,
            source: "resume",
            tags: ["resume"],
          }),
          skillId: target.id,
          recordId: record.id,
          coding: isCoding,
        },
      });

      saved.push({
        id: created.id,
        skillId: target.id,
        skillName: target.name,
      });
    }

    return NextResponse.json({
      success: true,
      created: saved.length,
      saved,
    });
  } catch (error: any) {
    console.error("Error generating resume questions:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate questions from resume" },
      { status: 500 }
    );
  }
}


