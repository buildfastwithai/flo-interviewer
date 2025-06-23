import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get("recordId");
    const skillId = searchParams.get("skillId");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Build the where clause based on filters
    const whereClause: any = {};
    if (recordId) whereClause.recordId = recordId;
    if (skillId) whereClause.skillId = skillId;

    // Get total regeneration count
    const totalRegenerations = await prisma.regeneration.count({
      where: whereClause,
    });

    // Get regenerations by skill
    const regenerationsBySkill = await prisma.regeneration.groupBy({
      by: ["skillId"],
      where: whereClause,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: limit,
    });

    // Get skill names for the top regenerated skills
    const skillIds = regenerationsBySkill.map((item) => item.skillId);
    const skills = await prisma.skill.findMany({
      where: { id: { in: skillIds } },
      select: { id: true, name: true },
    });

    const skillMap = skills.reduce((acc, skill) => {
      acc[skill.id] = skill.name;
      return acc;
    }, {} as Record<string, string>);

    const mostRegeneratedSkills = regenerationsBySkill.map((item) => ({
      skillId: item.skillId,
      skillName: skillMap[item.skillId] || "Unknown",
      regenerationCount: item._count.id,
    }));

    // Get regeneration trends over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const regenerationTrends = await prisma.regeneration.groupBy({
      by: ["createdAt"],
      where: {
        ...whereClause,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by day
    const trendsByDay = regenerationTrends.reduce((acc, item) => {
      const day = item.createdAt.toISOString().split("T")[0];
      acc[day] = (acc[day] || 0) + item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Get regeneration reasons frequency
    const regenerationReasons = await prisma.regeneration.groupBy({
      by: ["reason"],
      where: {
        ...whereClause,
        reason: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    // Get user satisfaction (liked/disliked regenerations)
    const satisfactionStats = await prisma.regeneration.groupBy({
      by: ["liked"],
      where: whereClause,
      _count: {
        id: true,
      },
    });

    const satisfaction = satisfactionStats.reduce(
      (acc, item) => {
        if (item.liked === "LIKED") acc.liked = item._count.id;
        else if (item.liked === "DISLIKED") acc.disliked = item._count.id;
        else acc.neutral = item._count.id;
        return acc;
      },
      { liked: 0, disliked: 0, neutral: 0 }
    );

    // Get recent regenerations
    const recentRegenerations = await prisma.regeneration.findMany({
      where: whereClause,
      include: {
        skill: { select: { name: true } },
        originalQuestion: { select: { content: true } },
        newQuestion: { select: { content: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Calculate average regenerations per question
    const totalQuestions = await prisma.question.count({
      where: recordId ? { recordId } : skillId ? { skillId } : {},
    });
    const averageRegenerationsPerQuestion =
      totalQuestions > 0 ? totalRegenerations / totalQuestions : 0;

    return NextResponse.json({
      success: true,
      analytics: {
        summary: {
          totalRegenerations,
          averageRegenerationsPerQuestion: parseFloat(
            averageRegenerationsPerQuestion.toFixed(2)
          ),
          totalQuestions,
        },
        mostRegeneratedSkills,
        regenerationTrends: Object.entries(trendsByDay).map(
          ([date, count]) => ({
            date,
            count,
          })
        ),
        regenerationReasons: regenerationReasons.map((item) => ({
          reason: item.reason,
          count: item._count.id,
        })),
        userSatisfaction: satisfaction,
        recentRegenerations: recentRegenerations.map((regen) => ({
          id: regen.id,
          skillName: regen.skill.name,
          reason: regen.reason,
          liked: regen.liked,
          createdAt: regen.createdAt,
          hasUserFeedback: !!regen.userFeedback,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error fetching regeneration analytics:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch regeneration analytics",
      },
      { status: 500 }
    );
  }
}
