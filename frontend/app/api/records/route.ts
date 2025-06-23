import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get all skill records from database with their skills and questions
    const records = await prisma.skillRecord.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        skills: {
          select: {
            id: true,
            name: true,
            level: true,
            category: true,
          }
        },
        questions: {
          select: {
            id: true,
            content: true,
          }
        },
        _count: {
          select: {
            skills: true,
            questions: true,
          }
        }
      },
    });

    // Format the records for the frontend
    const formattedRecords = records.map(record => ({
      id: record.id,
      jobTitle: record.jobTitle,
      skills: record.skills,
      questions: record.questions,
      interviewLength: record.interviewLength || 30,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      skillsCount: record._count.skills,
      questionsCount: record._count.questions,
    }));

    return NextResponse.json(formattedRecords);
  } catch (error) {
    console.error("Error fetching records:", error);
    return NextResponse.json(
      { error: "Failed to fetch records" },
      { status: 500 }
    );
  }
} 