import { type NextRequest, NextResponse } from "next/server"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Voice configurations using OpenAI TTS
const VOICE_CONFIGS = {
  "professional-female": {
    voice: "nova",
    speed: 1.0,
  },
  "professional-male": {
    voice: "onyx",
    speed: 1.0,
  },
  "friendly-female": {
    voice: "shimmer",
    speed: 1.1,
  },
  "friendly-male": {
    voice: "echo",
    speed: 1.0,
  },
  authoritative: {
    voice: "fable",
    speed: 0.9,
  },
  warm: {
    voice: "alloy",
    speed: 1.0,
  },
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const { text, voice = "professional-female", speed } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    const voiceConfig = VOICE_CONFIGS[voice as keyof typeof VOICE_CONFIGS] || VOICE_CONFIGS["professional-female"]

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        input: text,
        voice: voiceConfig.voice,
        speed: speed || voiceConfig.speed,
        response_format: "mp3",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI TTS API error:", errorText)
      throw new Error(`OpenAI TTS API error: ${response.status} ${response.statusText}`)
    }

    // Get the audio data as array buffer
    const audioBuffer = await response.arrayBuffer()

    // Return the audio data with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("TTS error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
