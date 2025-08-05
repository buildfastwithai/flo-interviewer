import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio");

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 500 });
    }

    // Convert Blob to ArrayBuffer for fetch
    const audioBuffer = await audio.arrayBuffer();
    const audioFile = new File([audioBuffer], "audio.webm", { type: "audio/webm" });

    // Prepare multipart/form-data for OpenAI Whisper
    const whisperForm = new FormData();
    whisperForm.append("file", audioFile);
    whisperForm.append("model", "whisper-1");
    whisperForm.append("response_format", "json");
    whisperForm.append("language", "en");

    // Call OpenAI Whisper API
    const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: whisperForm,
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return NextResponse.json({ error: err }, { status: openaiRes.status });
    }

    const data = await openaiRes.json();
    return NextResponse.json({ text: data.text || "" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
