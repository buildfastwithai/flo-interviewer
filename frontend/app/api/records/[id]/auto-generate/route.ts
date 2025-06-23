import { NextRequest, NextResponse } from "next/server";
import { generateQuestionsForSkills } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { jobTitle } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Record ID is required" },
        { status: 400 }
      );
    }

    // Check if record exists and belongs to the user
    const record = await prisma.skillRecord.findUnique({
      where: {
        id,
      },
      include: {
        skills: true,
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Record not found" },
        { status: 404 }
      );
    }

    // First identify or create skills for the job
    // Call the extract skills API or service
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/extract-skills`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobDescription: `Job Title: ${jobTitle}`,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to extract skills");
    }

    const skillsData = await response.json();

    if (!skillsData.success) {
      throw new Error(skillsData.error || "Failed to extract skills");
    }

    // Process the extracted skills
    const extractedSkills = skillsData.skills || [];

    // Save skills to the database with proper metadata
    const skills = await Promise.all(
      extractedSkills.map(async (skill: any, index: number) => {
        // Default values based on requirements
        const isOptional = skill.importance === "low" || index >= 5;
        const numQuestions = isOptional ? 0 : 2;
        const level = skill.level || "INTERMEDIATE";
        const category = skill.category || "TECHNICAL";

        // Create or update the skill
        return await prisma.skill.upsert({
          where: {
            name_recordId: {
              recordId: id,
              name: skill.name,
            },
          },
          update: {
            level: level,
            requirement: isOptional ? "OPTIONAL" : "MANDATORY",
            numQuestions: numQuestions,
            difficulty: skill.difficulty || "Medium",
            priority: index + 1,
            category: category,
            questionFormat: "Scenario",
          },
          create: {
            name: skill.name,
            level: level,
            requirement: isOptional ? "OPTIONAL" : "MANDATORY",
            numQuestions: numQuestions,
            difficulty: skill.difficulty || "Medium",
            recordId: id,
            priority: index + 1,
            category: category,
            questionFormat: "Scenario",
          },
        });
      })
    );

    // Now generate questions for all mandatory skills and optional skills with numQuestions > 0
    const skillsToGenerate = skills.filter(
      (skill) =>
        skill.requirement === "MANDATORY" ||
        (skill.requirement === "OPTIONAL" && skill.numQuestions > 0)
    );

    // Prepare the skills data for question generation
    const skillsForQuestions = skillsToGenerate.map((skill) => ({
      id: skill.id,
      numQuestions: skill.numQuestions || 2,
      difficulty: skill.difficulty || "Medium",
      questionFormat: skill.questionFormat || "Scenario",
      category: skill.category,
    }));

    // Only proceed if there are skills to generate questions for
    if (skillsForQuestions.length > 0) {
      // Generate questions for each skill
      const questionsResult = await generateQuestionsForSkills(
        id,
        jobTitle,
        skillsForQuestions
      );

      if (!questionsResult.success) {
        return NextResponse.json(
          {
            success: true,
            message: "Skills created but question generation failed",
            skills: skills,
            error: questionsResult.error,
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Skills and questions generated successfully",
        skills: skills,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in auto-generate:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
