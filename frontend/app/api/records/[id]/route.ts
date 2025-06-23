import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Record ID is required" },
        { status: 400 }
      );
    }

    // Fetch the record with related skills and questions
    const record = await prisma.skillRecord.findUnique({
      where: { id },
      include: {
        skills: {
          orderBy: [
            { requirement: "asc" }, // MANDATORY first (since it's alphabetically before OPTIONAL)
            { priority: "asc" },
          ],
        },
        questions: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      record,
    });
  } catch (error: any) {
    console.error("Error fetching record:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch record" },
      { status: 500 }
    );
  }
}
