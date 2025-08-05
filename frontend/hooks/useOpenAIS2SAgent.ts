// useOpenAIS2SAgent.ts
// OpenAI Speech-to-Speech Agent Hook (One-shot STT fallback for browser compatibility)

import { useState, useRef, useCallback, useEffect } from "react";

// Types for transcript and code state (same as original)
interface TranscriptEntry {
  speaker: "interviewer" | "candidate";
  text: string;
  timestamp: string;
  questionNumber?: number;
}

interface CodeEntry {
  code: string;
  language: string;
}

const initialCodeState = {
  code: "",
  language: "python",
};

export const useOpenAIS2SAgent = () => {
  // State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [codeState, setCodeState] = useState<CodeEntry>(initialCodeState);
  const [selectedVoice, setSelectedVoice] = useState("alloy"); // OpenAI S2S voices: alloy, echo, fable, onyx, nova, shimmer

  // Refs for audio and recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Audio level monitoring
  useEffect(() => {
    if (isListening && mediaStreamRef.current) {
      try {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        source.connect(analyserRef.current);

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        const updateAudioLevel = () => {
          if (analyserRef.current && isListening) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setAudioLevel(average);
            requestAnimationFrame(updateAudioLevel);
          }
        };
        updateAudioLevel();
      } catch (error) {
        // ignore
      }
    }
  }, [isListening, mediaStreamRef.current]);

  // --- Start Listening (record mic) ---
  const startListening = useCallback(async () => {
    if (isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" });
        await transcribeWithOpenAI(audioBlob);
      };

      mediaRecorder.start(1000);
      setIsListening(true);
    } catch (error) {
      setIsListening(false);
      setAudioLevel(0);
    }
  }, [isListening]);

  // --- Stop Listening (send audio to OpenAI STT) ---
  const stopListening = useCallback(() => {
    if (!isListening || !mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    setIsListening(false);

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  }, [isListening]);

  // --- Transcribe with OpenAI Whisper (via backend) ---
  const transcribeWithOpenAI = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const response = await fetch("/api/openai-stt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to transcribe audio");
      }

      const data = await response.json();

      if (data.text && data.text.trim()) {
        let finalTranscript = data.text.trim();

        if (codeState.code) {
          finalTranscript += `\n\nCode:\n${codeState.code}`;
        }

        setTranscript((prev) => [
          ...prev,
          {
            speaker: "candidate",
            text: finalTranscript,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      // ignore
    }
  };

  // --- Speak (send text to OpenAI TTS for TTS) ---
  const speak = useCallback(
    async (text: string, questionNumber?: number) => {
      setIsSpeaking(true);
      setTranscript((prev) => [
        ...prev,
        {
          speaker: "interviewer",
          text,
          timestamp: new Date().toISOString(),
          questionNumber,
        },
      ]);
      // Defensive: Only call TTS if text and selectedVoice are present
      if (!text || !selectedVoice) {
        setIsSpeaking(false);
        console.error("TTS error: Missing text or voice");
        return;
      }
      try {
        const response = await fetch("/api/openai-tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice: selectedVoice,
          }),
        });
        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          audio.play();
        } else {
          setIsSpeaking(false);
          const err = await response.json().catch(() => ({}));
          console.error("TTS error:", err?.error || response.statusText);
        }
      } catch (err) {
        setIsSpeaking(false);
        console.error("TTS error:", err);
      }
    },
    [selectedVoice]
  );

  // --- Generate Response (stub: OpenAI S2S handles this in real-time) ---
  const generateResponse = useCallback(async (prompt: string): Promise<string> => {
    // Use backend endpoint to generate LLM response (same as original logic)
    try {
      const response = await fetch("/api/generate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate response");
      }
      const data = await response.json();
      return data.response || "";
    } catch (error) {
      console.error("Error generating response:", error);
      return "";
    }
  }, []);

  // --- Test Voice (play sample TTS) ---
  const testVoice = useCallback(async (voiceId: string): Promise<void> => {
    await speak("This is a sample of the selected OpenAI voice.", undefined);
  }, [speak]);

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
  };
};
