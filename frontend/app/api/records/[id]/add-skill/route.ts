import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SkillLevel, Requirement, SkillCategory } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recordId } = await params;

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: "Record ID is required" },
        { status: 400 }
      );
    }

    // Get the request body
    const {
      name,
      level,
      requirement,
      numQuestions,
      difficulty,
      category,
      questionFormat,
    } = await request.json();

    // Validate inputs
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Skill name is required" },
        { status: 400 }
      );
    }

    // Check if the record exists
    const record = await prisma.skillRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Record not found" },
        { status: 404 }
      );
    }

    // Check if the skill already exists in this record
    const existingSkill = await prisma.skill.findFirst({
      where: {
        name: name.trim(),
        recordId,
      },
    });

    if (existingSkill) {
      return NextResponse.json(
        {
          success: false,
          error: "A skill with this name already exists for this record",
        },
        { status: 400 }
      );
    }

    // Get the highest existing priority to set new skill's priority
    const highestPrioritySkill = await prisma.skill.findFirst({
      where: { recordId },
      orderBy: { priority: "desc" },
    });

    const newPriority = (highestPrioritySkill?.priority || 0) + 1;

    // Create the new skill
    const newSkill = await prisma.skill.create({
      data: {
        name: name.trim(),
        level:
          level && Object.values(SkillLevel).includes(level as SkillLevel)
            ? (level as SkillLevel)
            : "INTERMEDIATE",
        requirement:
          requirement &&
          Object.values(Requirement).includes(requirement as Requirement)
            ? (requirement as Requirement)
            : "OPTIONAL",
        numQuestions:
          numQuestions && !isNaN(Number(numQuestions))
            ? Number(numQuestions)
            : 0,
        difficulty: difficulty || "Medium",
        recordId,
        priority: newPriority,
        category:
          category &&
          Object.values(SkillCategory).includes(category as SkillCategory)
            ? (category as SkillCategory)
            : "TECHNICAL",
        questionFormat: questionFormat || "Scenario based",
      },
    });

    return NextResponse.json({
      success: true,
      skill: newSkill,
    });
  } catch (error: any) {
    console.error("Error adding new skill:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add new skill" },
      { status: 500 }
    );
  }
}
