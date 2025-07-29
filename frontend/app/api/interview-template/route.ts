import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching interview template...");
    const searchParams = request.nextUrl.searchParams;
    const recordId = searchParams.get("recordId");
    const candidateName = searchParams.get("candidateName");

    if (!recordId) {
      return NextResponse.json(
        { error: "recordId is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching template for record ID: ${recordId}`);

    // Fetch the record with skills and questions
    const record = await prisma.skillRecord.findUnique({
      where: {
        id: recordId,
      },
      include: {
        skills: true,
        questions: true,  // Include all questions at the record level
      },
    });

    if (!record) {
      console.log(`Record not found with ID: ${recordId}`);
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    console.log(`Found record: ${record.jobTitle} with ${record.skills.length} skills and ${record.questions.length} questions`);

    // Transform the data into the format expected by the interview agent
    const templateData = {
      id: record.id,
      jobTitle: record.jobTitle,
      interviewLength: record.interviewLength || 30,
      introTemplate: `Welcome ${candidateName}, I am an interviewer for the ${record.jobTitle} and I will be taking your interview. Are you ready to begin the interview?If you are ready, say "yes" and click the button below 'Start Questions' to begin the interview.`,
      closingTemplate: `Thank you for your time. Interview is over.`,
      skills: record.skills.map(skill => ({
        id: skill.id,
        name: skill.name,
        level: skill.level,
        category: skill.category,
      })),
      // Include all questions with their skillId for proper association
      questions: record.questions.map(q => ({
        id: q.id,
        content: q.content,
        skillId: q.skillId,
        coding: q.coding,
      })),
    };

    console.log(`Template prepared with ${templateData.skills.length} skills and ${templateData.questions.length} questions`);

    // Log some sample questions for debugging
    if (templateData.questions.length > 0) {
      console.log("Sample questions:");
      templateData.questions.slice(0, 3).forEach((q, i) => {
        console.log(`Question ${i + 1}: ${q.content.substring(0, 50)}... (Skill ID: ${q.skillId})`);
      });
    }

    return NextResponse.json(templateData);

  } catch (error) {
    console.error("Error fetching interview template:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch interview template",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 