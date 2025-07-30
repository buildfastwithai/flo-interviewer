import { type NextRequest, NextResponse } from "next/server"

const ASSEMBLY_API_KEY = process.env.ASSEMBLYAI_API_KEY
const ASSEMBLY_API_URL = "https://api.assemblyai.com/v2"

export async function POST(request: NextRequest) {
  try {
    if (!ASSEMBLY_API_KEY) {
      return NextResponse.json({ error: "Assembly AI API key not configured" }, { status: 500 })
    }

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Convert audio file to buffer
    const audioBuffer = await audioFile.arrayBuffer()
    const audioData = new Uint8Array(audioBuffer)

    // Upload audio to Assembly AI
    const uploadResponse = await fetch(`${ASSEMBLY_API_URL}/upload`, {
      method: "POST",
      headers: {
        Authorization: ASSEMBLY_API_KEY,
        "Content-Type": "application/octet-stream",
      },
      body: audioData,
    })

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload audio to Assembly AI")
    }

    const { upload_url } = await uploadResponse.json()

    // Request transcription
    const transcriptResponse = await fetch(`${ASSEMBLY_API_URL}/transcript`, {
      method: "POST",
      headers: {
        Authorization: ASSEMBLY_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_detection: true,
        punctuate: true,
        format_text: true,
        speaker_labels: false,
        auto_highlights: false,
        sentiment_analysis: false,
        entity_detection: false,
      }),
    })

    if (!transcriptResponse.ok) {
      throw new Error("Failed to request transcription")
    }

    const { id } = await transcriptResponse.json()

    // Poll for completion
    let transcript
    let attempts = 0
    const maxAttempts = 30 // 30 seconds timeout

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`${ASSEMBLY_API_URL}/transcript/${id}`, {
        headers: {
          Authorization: ASSEMBLY_API_KEY,
        },
      })

      if (!statusResponse.ok) {
        throw new Error("Failed to check transcription status")
      }

      transcript = await statusResponse.json()

      if (transcript.status === "completed") {
        break
      } else if (transcript.status === "error") {
        throw new Error(`Transcription failed: ${transcript.error}`)
      }

      // Wait 1 second before next attempt
      await new Promise((resolve) => setTimeout(resolve, 1000))
      attempts++
    }

    if (attempts >= maxAttempts) {
      throw new Error("Transcription timeout")
    }

    return NextResponse.json({
      text: transcript.text || "",
      confidence: transcript.confidence || 0,
      words: transcript.words || [],
    })
  } catch (error) {
    console.error("Assembly STT error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
