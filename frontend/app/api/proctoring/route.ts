import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

    if (!interviewId) {
      return NextResponse.json(
        { success: false, error: "Missing interviewId" },
        { status: 400 }
      );
    }

    const baseDir = path.join(process.cwd(), "proctoring-data");
    try {
      fs.mkdirSync(baseDir, { recursive: true });
    } catch {}

    // Sanitize filename to avoid path traversal
    const safeName = String(interviewDataId).replace(/[^a-zA-Z0-9-_]/g, "_");
    const filePath = path.join(baseDir, `${safeName}.json`);

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "Failed to write file" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, path: `proctoring-data/${safeName}.json` });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}


