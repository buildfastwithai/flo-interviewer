import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const interviewId: string | undefined = body?.interviewId;
    const interviewDataId: string | undefined = body?.interviewDataId;
    const data = {
      interviewId: body?.interviewId,
      interviewDataId: body?.interviewDataId,
      candidateName: body?.candidateName,
      startedAt: body?.startedAt,
      endedAt: body?.endedAt,
      events: Array.isArray(body?.events) ? body.events : [],
      receivedAt: new Date().toISOString(),
    };

    if (!interviewId && !interviewDataId) {
      return NextResponse.json(
        { success: false, error: "Missing interviewId or interviewDataId" },
        { status: 400 }
      );
    }

    let targetInterviewDataId: string | undefined = interviewDataId;

    // if (!targetInterviewDataId && interviewId) {
    //   const latest = await prisma.interviewData.findFirst({
    //     where: { interviewId },
    //     orderBy: { createdAt: "desc" },
    //     select: { id: true },
    //   });

    //   if (!latest) {
    //     return NextResponse.json(
    //       { success: false, error: "InterviewData not found for interviewId" },
    //       { status: 404 }
    //     );
    //   }

    //   targetInterviewDataId = latest.id;
    // }

    try {
      const updated = await prisma.interviewData.update({
        where: { id: targetInterviewDataId as string },
        data: { proctoring: data },
        select: { id: true },
      });

      return NextResponse.json({ success: true, interviewDataId: updated.id });
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: "InterviewData not found" },
        { status: 404 }
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}


