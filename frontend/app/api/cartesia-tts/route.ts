import { type NextRequest, NextResponse } from "next/server"

const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY
const CARTESIA_API_URL = "https://api.cartesia.ai/tts/bytes"

// Voice configurations
const VOICE_CONFIGS = {
  "professional-female": {
    model: "sonic-english",
    voice: {
      mode: "id",
      id: "a0e99841-438c-4a64-b679-ae501e7d6091", // Barbershop - Professional Female
    },
  },
  "professional-male": {
    model: "sonic-english",
    voice: {
      mode: "id",
      id: "2ee87190-8f84-4925-97da-e52547f9462c", // Salesman - Professional Male
    },
  },
  "friendly-female": {
    model: "sonic-english",
    voice: {
      mode: "id",
      id: "79a125e8-cd45-4c13-8a67-188112f4dd22", // British Lady - Friendly Female
    },
  },
  "friendly-male": {
    model: "sonic-english",
    voice: {
      mode: "id",
      id: "820a3788-2b37-4d21-847a-b65d8a68c99a", // Conversational - Friendly Male
    },
  },
}

export async function POST(request: NextRequest) {
  try {
    if (!CARTESIA_API_KEY) {
      return NextResponse.json({ error: "Cartesia API key not configured" }, { status: 500 })
    }

    const { text, voice = "professional-female", speed = 1.0, emotion = "neutral" } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    const voiceConfig = VOICE_CONFIGS[voice as keyof typeof VOICE_CONFIGS] || VOICE_CONFIGS["professional-female"]

    const requestBody = {
      model_id: voiceConfig.model,
      transcript: text,
      voice: voiceConfig.voice,
      output_format: {
        container: "wav",
        encoding: "pcm_f32le",
        sample_rate: 44100,
      },
      language: "en",
      speed: speed,
      emotion: [emotion],
    }

    const response = await fetch(CARTESIA_API_URL, {
      method: "POST",
      headers: {
        "Cartesia-Version": "2024-06-10",
        "X-API-Key": CARTESIA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Cartesia API error:", errorText)
      throw new Error(`Cartesia API error: ${response.status} ${response.statusText}`)
    }

    // Get the audio data as array buffer
    const audioBuffer = await response.arrayBuffer()

    // Return the audio data with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Cartesia TTS error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
