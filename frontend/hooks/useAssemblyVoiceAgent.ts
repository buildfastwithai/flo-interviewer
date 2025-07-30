"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"

interface TranscriptEntry {
  speaker: "interviewer" | "candidate"
  text: string
  timestamp: string
  questionNumber?: number
}

interface CodeEntry {
  code: string
  language: string
}

const initialCodeState = {
  code: "",
  language: "python",
}

export const useAssemblyVoiceAgent = () => {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [codeState, setCodeState] = useState<CodeEntry>(initialCodeState)
  const [selectedVoice, setSelectedVoice] = useState("professional-female")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Audio level monitoring
  useEffect(() => {
    if (isListening && mediaStreamRef.current) {
      try {
        audioContextRef.current = new AudioContext()
        analyserRef.current = audioContextRef.current.createAnalyser()
        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current)
        source.connect(analyserRef.current)

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        const updateAudioLevel = () => {
          if (analyserRef.current && isListening) {
            analyserRef.current.getByteFrequencyData(dataArray)
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length
            setAudioLevel(average)
            requestAnimationFrame(updateAudioLevel)
          }
        }
        updateAudioLevel()
      } catch (error) {
        console.error("Error setting up audio analysis:", error)
      }
    }
  }, [isListening, mediaStreamRef.current])

  const startListening = useCallback(async () => {
    if (isListening) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      mediaStreamRef.current = stream
      audioChunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" })
        await transcribeWithAssembly(audioBlob)
      }

      mediaRecorder.start(1000)
      setIsListening(true)
      toast.success("Started listening with Assembly AI STT")
    } catch (error) {
      console.error("Error starting recording:", error)
      toast.error("Failed to start recording. Please check microphone permissions.")
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (!isListening || !mediaRecorderRef.current) return

    mediaRecorderRef.current.stop()
    setIsListening(false)

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
    }
  }, [isListening])

  const transcribeWithAssembly = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob)

      const response = await fetch("/api/assembly-stt", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to transcribe audio")
      }

      const data = await response.json()

      if (data.text && data.text.trim()) {
        let finalTranscript = data.text.trim()

        if (codeState.code) {
          finalTranscript += `\n\nCode:\n${codeState.code}`
        }

        setTranscript((prev) => [
          ...prev,
          {
            speaker: "candidate",
            text: finalTranscript,
            timestamp: new Date().toISOString(),
          },
        ])
      }
    } catch (error) {
      console.error("Error transcribing audio:", error)
      toast.error("Failed to transcribe audio with Assembly AI")
    }
  }

  const speak = useCallback(
    async (text: string, questionNumber?: number): Promise<void> => {
      return new Promise(async (resolve) => {
        try {
          setIsSpeaking(true)

          const response = await fetch("/api/assembly-tts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              voice: selectedVoice,
              speed: 1.0,
            }),
          })

          if (!response.ok) {
            throw new Error("Failed to generate speech with Assembly AI")
          }

          const audioBlob = await response.blob()
          const audioUrl = URL.createObjectURL(audioBlob)

          const audio = new Audio(audioUrl)
          currentAudioRef.current = audio

          audio.onended = () => {
            setIsSpeaking(false)
            setTranscript((prev) => [
              ...prev,
              {
                speaker: "interviewer",
                text,
                timestamp: new Date().toISOString(),
                questionNumber,
              },
            ])
            URL.revokeObjectURL(audioUrl)
            resolve()
          }

          audio.onerror = (error) => {
            console.error("Audio playback error:", error)
            setIsSpeaking(false)
            URL.revokeObjectURL(audioUrl)
            resolve()
          }

          await audio.play()
        } catch (error) {
          console.error("Error with Assembly AI TTS:", error)
          setIsSpeaking(false)
          toast.error("Failed to generate speech with Assembly AI")

          setTranscript((prev) => [
            ...prev,
            {
              speaker: "interviewer",
              text,
              timestamp: new Date().toISOString(),
              questionNumber,
            },
          ])

          resolve()
        }
      })
    },
    [selectedVoice],
  )

  const testVoice = useCallback(async (voiceId: string): Promise<void> => {
    const testText =
      "Hello! This is how I'll sound during your interview. I'm excited to help you showcase your skills today."

    return new Promise(async (resolve) => {
      try {
        const response = await fetch("/api/assembly-tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: testText,
            voice: voiceId,
            speed: 1.0,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to generate test speech")
        }

        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        const audio = new Audio(audioUrl)

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          resolve()
        }

        audio.onerror = (error) => {
          console.error("Test audio playback error:", error)
          URL.revokeObjectURL(audioUrl)
          resolve()
        }

        await audio.play()
      } catch (error) {
        console.error("Error testing voice:", error)
        toast.error("Failed to test voice")
        resolve()
      }
    })
  }, [])

  const generateResponse = useCallback(async (prompt: string): Promise<string> => {
    try {
      const response = await fetch("/api/generate-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate response")
      }

      const data = await response.json()
      return data.response
    } catch (error) {
      console.error("Error generating response:", error)
      return "I apologize, but I'm having trouble processing that. Let's continue with the next question."
    }
  }, [])

  return {
    isListening,
    isSpeaking,
    audioLevel,
    transcript,
    startListening,
    stopListening,
    speak,
    testVoice,
    generateResponse,
    setTranscript,
    codeState,
    setCodeState,
    selectedVoice,
    setSelectedVoice,
  }
}
