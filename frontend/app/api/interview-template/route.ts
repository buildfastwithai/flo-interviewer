import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching interview template...");
    const searchParams = request.nextUrl.searchParams;
    const recordId = searchParams.get("recordId");
    
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
      introScript: `Hello! I'm your interviewer for this ${record.jobTitle} position. Thank you for taking the time to interview with us today. This interview will take about ${record.interviewLength || 30} minutes and we'll be discussing your experience and technical skills. To start, could you please introduce yourself and tell me a bit about your background?`,
      closingScript: "That concludes our technical portion of the interview. Thank you for your time today! Do you have any questions about the role or company?",
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
      })),
    };

    console.log(`Template prepared with ${templateData.skills.length} skills and ${templateData.questions.length} questions`);
    
    // Log some sample questions for debugging
    if (templateData.questions.length > 0) {
      console.log("Sample questions:");
      templateData.questions.slice(0, 3).forEach((q, i) => {
        console.log(`Question ${i+1}: ${q.content.substring(0, 50)}... (Skill ID: ${q.skillId})`);
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