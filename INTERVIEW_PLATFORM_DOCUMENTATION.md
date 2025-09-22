# Interview Platform - Complete Technical Documentation & Implementation Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Frontend Components - Detailed Implementation](#frontend-components---detailed-implementation)
   - 3.1 [Interview Page Component](#interview-page-component)
   - 3.2 [Create Interview Admin Page](#create-interview-admin-page)
   - 3.3 [Connection Details API](#connection-details-api)
4. [Backend Components - Python AI Agent](#backend-components---python-ai-agent)
   - 4.1 [Interview Agent Core](#interview-agent-core)
   - 4.2 [Database Module](#database-module)
   - 4.3 [Interview Configuration](#interview-configuration)
   - 4.4 [Metrics Collection System](#metrics-collection-system)
   - 4.5 [Audio Processing](#audio-processing)
   - 4.6 [Logging System](#logging-system)
5. [Database Schema - Prisma Models](#database-schema---prisma-models)
6. [Workflow & Data Flow](#workflow--data-flow)
7. [Key Features & Implementation Details](#key-features--implementation-details)
8. [API Endpoints - Complete Reference](#api-endpoints---complete-reference)
9. [Real-time Communication - LiveKit Integration](#real-time-communication---livekit-integration)
10. [Security & Performance](#security--performance)
11. [Deployment & Environment Setup](#deployment--environment-setup)

## System Overview

The Interview Platform is an enterprise-grade, AI-powered technical interview system that conducts fully automated interviews through voice interactions. The system provides:

### Core Components
- **Frontend**: Next.js 15 application with TypeScript, React 18, and TailwindCSS
- **Backend**: Python 3.10+ AI agent with async/await architecture
- **Database**: PostgreSQL with Prisma ORM for type-safe database operations
- **Real-time Communication**: LiveKit WebRTC for low-latency audio/video
- **AI Stack**:
  - **Language Model**: OpenAI GPT-4.1 (temperature: 0.7)
  - **Speech-to-Text**: AssemblyAI with custom end-of-utterance detection
  - **Text-to-Speech**: Cartesia TTS (model: sonic-2, speed: 0.5)
  - **Voice Activity Detection**: Silero VAD
  - **Turn Detection**: Multimodal/Basic turn detectors

### Key Capabilities
- Automated technical interviews with dynamic question generation
- Resume-based personalized questions
- Practice mode with easy warm-up questions
- Real-time transcription and recording
- Webcam proctoring with face detection
- Screen recording with audio mixing
- AI-powered post-interview evaluation
- Comprehensive metrics collection

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Interview Page  │  Create Interview  │  Admin Pages │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│                    ┌─────────────────┐                       │
│                    │   API Routes    │                       │
│                    └─────────────────┘                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ WebRTC/HTTP
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    LiveKit Server                            │
│                  (Real-time Communication)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Python Backend (Agent)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Interview Agent  │  Metrics  │  Database Client    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│               (Interview Data & Configuration)               │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Components - Detailed Implementation

### Interview Page Component
**File Location**: `frontend/app/(user)/interview/page.tsx`

This is the main interface where candidates participate in interviews. It's a complex React component (2000+ lines) that manages the entire interview lifecycle including recording, proctoring, transcription, and feedback.

#### Imports and Dependencies

```typescript
// Lines 1-52: Complete imports
"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  Suspense,
  useContext,
} from "react";
import { Room, RoomEvent, Track, LocalAudioTrack } from "livekit-client";
import {
  BarVisualizer,
  DisconnectButton,
  RoomAudioRenderer,
  RoomContext,
  VoiceAssistantControlBar,
  useVoiceAssistant,
} from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, X, Clock, Sparkles, Zap, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NoAgentNotification } from "@/components/NoAgentNotification";
import TranscriptionView from "@/components/TranscriptionView";
import useCombinedTranscriptions from "@/hooks/useCombinedTranscriptions";
import type { ConnectionDetails } from "@/app/api/connection-details/route";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Meteors } from "@/components/magicui/meteors";
import { BoxReveal } from "@/components/magicui/box-reveal";
import { MagicCard } from "@/components/magicui/magic-card";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { useSearchParams } from "next/navigation";
import InterviewFeedback from "@/components/interview-feedback";
import Webcam from "react-webcam";
import { useFaceDetection } from "@/hooks/useFaceDetectionSimple.js";
import { AlertCircle, UserCheck, Users, Eye, Shield } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
```

#### Type Definitions

```typescript
// Lines 58-68: Recording types
type RecordingStatus = "recording" | "finalized" | "uploaded";
type StoredRecording = {
  key: string;
  interviewId?: string;
  interviewDataId?: string | null;
  candidateName?: string;
  startTime?: string;
  mimeType?: string;
  chunks: Blob[];
  status: RecordingStatus;
};

// Lines 128-143: User and Interview data interfaces
interface UserFormData {
  name: string;
  accessCode: string;
  practice?: boolean;
  webcamProctoring?: boolean;
  useResume?: boolean;
  resumeUrl?: string | null;
  resumeText?: string | null;
}

interface InterviewData {
  interviewId: string;
  roomId: string;
  startTime: string;
  transcript: any[];
}
```

#### Pre-Interview Briefing Content

```typescript
// Lines 145-167: Pre-interview briefing configuration
const PRE_INTERVIEW_BRIEFING = {
  title: "Pre-Interview Briefing",
  time: [
    "Your session is time‑aware; the interviewer can tell you how much time has passed if you ask.",
    "Brief pauses are okay; take a moment to think before answering.",
  ],
  structure: [
    "Warm introduction and readiness check.",
    "A sequence of structured questions with brief acknowledgments and smooth transitions.",
    "Closing with an opportunity for your questions.",
  ],
  policies: [
    // Sourced from agent guidance: no hints during evaluation
    "No hints will be provided during evaluation.",
    "Asking for hints leads to penalty.",
    "The interviewer will not reveal correct answers or provide hints.",
    "For JD, company, role details, compensation/CTC, hiring process/next steps, or performance feedback: I don't have that specific information, but the hiring team can provide all the details you need.",
  ],
  recommendations: [
    "Try Practice Mode first to get a feel for the interviewer and the interview process.",
  ],
} as const;
```

#### Core State Management

```typescript
// Lines 169-204: Complete state management
export default function InterviewPage() {
  const [room] = useState(new Room());
  const [userData, setUserData] = useState<UserFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const startTimeRef = useRef<string>(new Date().toISOString());
  const [interviewDataId, setInterviewDataId] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  // Local VAD-driven speaking indicator (does not affect agent logic)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const skipSaveOnDisconnectRef = useRef<boolean>(false);
  const [webcamProctoringEnabled, setWebcamProctoringEnabled] = useState(false);
  const [proctoringStats, setProctoringStats] = useState({
    noFaceCount: 0,
    multipleFaceCount: 0,
    tabSwitchCount: -2,
    copyPasteCount: 0,
  });

  // Recording refs/state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mixedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingKeyRef = useRef<string | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const connectedAudioElsRef = useRef<WeakSet<HTMLMediaElement>>(new WeakSet());

  // Proctoring reference object
  const proctoringRef = useRef<{
    events: Array<{
      type: string;
      ts: string;
      description?: string;
      meta?: any;
    }>;
    stream: MediaStream | null;
    lastHiddenTs?: number | null;
    lastDisconnectTs?: number | null;
    focusBlurTimestamps: number[];
  }>({
    events: [],
    stream: null,
    lastHiddenTs: null,
    lastDisconnectTs: null,
    focusBlurTimestamps: [],
  });
```

#### IndexedDB Recording Storage System

The platform uses IndexedDB for persistent storage of interview recordings that survives page refreshes and browser crashes. This resilient storage system ensures recordings are never lost, even if the browser crashes or the user accidentally closes the tab.

```typescript
// Lines 54-126: Complete IndexedDB implementation
const RECORDING_DB_NAME = "interviewRecordingDB";
const RECORDING_STORE = "recordings";

type RecordingStatus = "recording" | "finalized" | "uploaded";
type StoredRecording = {
  key: string;
  interviewId?: string;
  interviewDataId?: string | null;
  candidateName?: string;
  startTime?: string;
  mimeType?: string;
  chunks: Blob[];
  status: RecordingStatus;
};

function openRecordingDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(RECORDING_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(RECORDING_STORE)) {
        db.createObjectStore(RECORDING_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<StoredRecording | undefined> {
  const db = await openRecordingDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECORDING_STORE, "readonly");
    const store = tx.objectStore(RECORDING_STORE);
    const getReq = store.get(key);
    getReq.onsuccess = () => resolve(getReq.result as StoredRecording | undefined);
    getReq.onerror = () => reject(getReq.error);
  });
}

async function idbPut(record: StoredRecording): Promise<void> {
  const db = await openRecordingDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECORDING_STORE, "readwrite");
    const store = tx.objectStore(RECORDING_STORE);
    const putReq = store.put(record);
    putReq.onsuccess = () => resolve();
    putReq.onerror = () => reject(putReq.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openRecordingDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECORDING_STORE, "readwrite");
    const store = tx.objectStore(RECORDING_STORE);
    const delReq = store.delete(key);
    delReq.onsuccess = () => resolve();
    delReq.onerror = () => reject(delReq.error);
  });
}

async function idbGetAll(): Promise<StoredRecording[]> {
  const db = await openRecordingDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECORDING_STORE, "readonly");
    const store = tx.objectStore(RECORDING_STORE);
    const allReq = (store as any).getAll();
    allReq.onsuccess = () => resolve((allReq.result || []) as StoredRecording[]);
    allReq.onerror = () => reject(allReq.error);
  });
}
```

#### Interview Connection Process

```typescript
// Lines 570-748: Complete interview connection implementation
const onJoinInterview = useCallback(
  async (formData: UserFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      setWebcamProctoringEnabled(!!formData.webcamProctoring);
      console.log(
        "Connecting to interview with access code:",
        formData.accessCode
      );

      // Call API to get LiveKit connection details based on the access code
      const baseConnEndpoint =
        process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details";

      let response: Response;
      if (formData.useResume && formData.resumeText) {
        console.log("Fetching connection details via POST (with resumeText)");
        response = await fetch(baseConnEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            accessCode: formData.accessCode,
            practice: !!formData.practice,
            resumeText: formData.resumeText,
          }),
        });
      } else {
        const url = new URL(baseConnEndpoint, window.location.origin);
        url.searchParams.set("name", formData.name);
        url.searchParams.set("accessCode", formData.accessCode);
        if (formData.practice) {
          url.searchParams.set("practice", "true");
        }
        console.log("Fetching connection details from:", url.toString());
        response = await fetch(url.toString());
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to join interview:", errorData);
        throw new Error(
          errorData.message || errorData.error || "Failed to join interview"
        );
      }

      const connectionDetails = await response.json();

      if (
        !connectionDetails.serverUrl ||
        !connectionDetails.participantToken ||
        !connectionDetails.roomName
      ) {
        console.error("Invalid connection details:", connectionDetails);
        throw new Error("Invalid connection details received from server");
      }

      // Check if we're in demo or practice mode
      if (connectionDetails.demoMode) {
        console.log("Using demo mode with LiveKit cloud");
        setIsDemoMode(true);
        toast.info(
          "Connected in demo mode. This is for testing purposes only."
        );
      }
      if (connectionDetails.practiceMode) {
        console.log("Using practice mode");
        setIsPracticeMode(true);
        toast.info(
          "Practice mode: Try a few easy questions before the real interview."
        );
      }

      console.log(
        "Connecting to LiveKit server:",
        connectionDetails.serverUrl
      );
      console.log("Joining room:", connectionDetails.roomName);

      // Connect to LiveKit room
      await room.connect(
        connectionDetails.serverUrl,
        connectionDetails.participantToken
      );

      console.log("Successfully connected to LiveKit room");

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);
```

#### Screen Recording with Audio Mixing

```typescript
// Lines 291-456: Complete screen recording implementation
const startInterviewRecording = useCallback(
  async (
    meta: { interviewId: string; candidateName: string; startTime: string; practiceMode?: boolean }
  ) => {
    try {
      if (meta.practiceMode) {
        console.log("[Recording] Practice mode — recording disabled");
        return; // skip recording in practice mode
      }

      const key = `${meta.interviewId}::${meta.startTime}`;
      recordingKeyRef.current = key;
      console.log("[Recording] Start with key", key, "meta:", meta);

      const mimeType = pickSupportedMimeType();

      // Initialize record in IDB
      await idbPut({
        key,
        interviewId: meta.interviewId,
        candidateName: meta.candidateName,
        startTime: meta.startTime,
        mimeType,
        chunks: [],
        status: "recording",
      });

      // Display media (tab/window) with system audio if selected
      console.log("[Recording] Requesting display media (with audio)");
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: true,
      });
      console.log(
        "[Recording] Obtained display stream",
        {
          videoTracks: displayStream.getVideoTracks().length,
          audioTracks: displayStream.getAudioTracks().length,
        }
      );
      displayStreamRef.current = displayStream;

      // Microphone stream (optional)
      let micStream: MediaStream | null = null;
      try {
        console.log("[Recording] Requesting microphone stream");
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log(
          "[Recording] Obtained microphone stream",
          { audioTracks: micStream.getAudioTracks().length }
        );
      } catch {
        console.warn("[Recording] Microphone stream not available");
        micStream = null;
      }
      micStreamRef.current = micStream;

      // Mix audio tracks (display + mic)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext as AudioContext;
      const destination = audioContext.createMediaStreamDestination();
      const addAudioTracks = (stream: MediaStream | null) => {
        if (!stream) return;
        const hasAudio = stream.getAudioTracks().length > 0;
        if (!hasAudio) return;
        try {
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(destination);
        } catch {}
      };
      addAudioTracks(displayStream);
      addAudioTracks(micStream);

      // Try to include LiveKit remote audio directly (agent voice)
      try {
        let remoteAudioTracksAdded = 0;
        room.remoteParticipants.forEach((p) => {
          p.audioTrackPublications.forEach((pub: any) => {
            const track: any = pub?.track;
            try {
              const mediaStreamTrack: MediaStreamTrack | undefined =
                (track?.mediaStreamTrack as MediaStreamTrack) ||
                track?.mediaStream?.getAudioTracks?.()[0];
              if (mediaStreamTrack) {
                const s = new MediaStream([mediaStreamTrack]);
                const src = audioContext.createMediaStreamSource(s);
                src.connect(destination);
                remoteAudioTracksAdded += 1;
              }
            } catch (e) {
              console.warn("[Recording] Failed to attach remote audio track", e);
            }
          });
        });
        console.log("[Recording] Attached remote LiveKit audio tracks", { count: remoteAudioTracksAdded });
      } catch (e) {
        console.warn("[Recording] Error while attaching remote LiveKit audio", e);
      }

      // Fallback: try to capture audio from existing <audio> elements
      try {
        const audioEls = Array.from(document.querySelectorAll('audio')) as HTMLAudioElement[];
        let connected = 0;
        for (const el of audioEls) {
          if (connectedAudioElsRef.current.has(el)) continue;
          try {
            const src = audioContext.createMediaElementSource(el);
            src.connect(destination);
            connectedAudioElsRef.current.add(el);
            connected += 1;
          } catch (e) {
            // createMediaElementSource can only be called once per element; ignore
          }
        }
        if (connected > 0) {
          console.log("[Recording] Connected HTMLAudioElements to mix", { connected });
        }
      } catch (e) {
        console.warn("[Recording] Error while connecting HTMLAudioElements", e);
      }

      const videoTrack = displayStream.getVideoTracks()[0];
      const mixedStream = new MediaStream([videoTrack, ...destination.stream.getAudioTracks()]);
      mixedStreamRef.current = mixedStream;

      const recorder = new MediaRecorder(mixedStream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        console.log("[Recording] ondataavailable", { size: e.data?.size });
        if (e.data && e.data.size > 0 && recordingKeyRef.current) {
          appendRecordingChunk(recordingKeyRef.current, e.data);
        }
      };

      recorder.onstop = async () => {
        console.log("[Recording] MediaRecorder stopped");
        if (!recordingKeyRef.current) return;
        try {
          const rec = (await idbGet(recordingKeyRef.current)) as StoredRecording | undefined;
          if (rec) {
            rec.status = "finalized";
            await idbPut(rec);
            console.log("[Recording] Marked as finalized in IDB", { key: rec.key });
          }
        } catch {}
        setIsRecordingVideo(false);
      };

      console.log("[Recording] Starting MediaRecorder");
      recorder.start(5000); // gather chunks every 5s to persist progressively
      setIsRecordingVideo(true);
    } catch (e) {
      console.warn("[Recording] Failed to start screen recording", e);
    }
  },
  [room]
);
```

#### Recording Upload System

```typescript
// Lines 483-568: Recording upload implementation
const uploadRecordingByKey = useCallback(
  async (key: string) => {
    try {
      console.log("[Upload] Attempting upload for key", key);
      const rec = await idbGet(key);
      if (!rec || !rec.chunks || rec.chunks.length === 0) return;
      if (rec.status === "uploaded") return;

      console.log("[Upload] Found recording", {
        chunks: rec.chunks.length,
        mimeType: rec.mimeType,
        status: rec.status,
      });

      const blob = new Blob(rec.chunks, { type: rec.mimeType || "video/webm" });
      console.log("[Upload] Blob size(bytes)", blob.size);

      const fileName = `interview-${rec.interviewId || "unknown"}-${(rec.startTime || "").replace(/[:.]/g, "-")}.webm`;
      const file = new File([blob], fileName, { type: blob.type });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("interviewDataId", rec.interviewDataId || "");
      formData.append("candidateName", rec.candidateName || "");

      const uploadUrl = "/api/upload-recording";
      console.log("[Upload] Uploading to", uploadUrl);

      const uploadResp = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadResp.ok) {
        throw new Error(`Upload failed: ${uploadResp.statusText}`);
      }

      const uploadData = await uploadResp.json();
      console.log("[Upload] Success", uploadData);

      rec.status = "uploaded";
      await idbPut(rec);
      await idbDelete(key);

      toast.success("Recording uploaded successfully");
    } catch (e) {
      console.warn("[Upload] Failed to upload recording", e);
      toast.error("Failed to upload recording. It will be retried later.");
    }
  },
  []
);

const uploadAnyPendingRecordings = useCallback(async () => {
  try {
    const all = await idbGetAll();
    const pending = all.filter(r => r.status === "finalized");
    console.log("[Upload] Checking pending recordings", { total: all.length, pending: pending.length });

    for (const rec of pending) {
      await uploadRecordingByKey(rec.key);
    }
  } catch (e) {
    console.warn("[Upload] Failed to upload pending recordings", e);
  }
}, [uploadRecordingByKey]);
```

#### Proctoring Event System

```typescript
// Lines 225-244: Proctoring event recording
const recordProctorEvent = useCallback(
  (type: string, description?: string, meta?: any) => {
    try {
      proctoringRef.current.events.push({
        type,
        ts: new Date().toISOString(),
        description,
        meta,
      });

      // Update stats for certain events separately to avoid infinite loop
      if (type === 'clipboard_copy' || type === 'clipboard_paste' || type === 'clipboard_cut') {
        setProctoringStats(prev => ({ ...prev, copyPasteCount: prev.copyPasteCount + 1 }));
      } else if (type === 'page_hidden' || type === 'window_blur') {
        setProctoringStats(prev => ({ ...prev, tabSwitchCount: prev.tabSwitchCount + 1 }));
      }
    } catch {}
  },
  []
);

// Lines 246-253: Webcam proctoring start
const startWebcamProctoring = useCallback(async () => {
  if (!webcamProctoringEnabled) return;
  recordProctorEvent(
    "webcam_preview_enabled",
    "Webcam preview enabled via react-webcam"
  );
}, [webcamProctoringEnabled, recordProctorEvent]);
```

#### Proctoring Event Listeners

```typescript
// Lines 819-893: Complete proctoring event listeners
useEffect(() => {
  if (!webcamProctoringEnabled) return;

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      proctoringRef.current.lastHiddenTs = Date.now();
      recordProctorEvent("page_hidden", "Page became hidden");
    } else {
      recordProctorEvent("page_visible", "Page became visible");
      if (proctoringRef.current.lastHiddenTs) {
        const durMs = Date.now() - proctoringRef.current.lastHiddenTs;
        recordProctorEvent(
          "page_hidden_duration",
          "Computed hidden duration",
          { ms: durMs }
        );
        proctoringRef.current.lastHiddenTs = null;
      }
    }
  };

  const onBlur = () => {
    proctoringRef.current.focusBlurTimestamps.push(Date.now());
    recordProctorEvent("window_blur", "Window lost focus");
  };

  const onFocus = () => {
    proctoringRef.current.focusBlurTimestamps.push(Date.now());
    recordProctorEvent("window_focus", "Window gained focus");
  };

  const onCopy = (e: ClipboardEvent) => {
    let text = "";
    try {
      text = (window.getSelection()?.toString() || "").slice(0, 500);
    } catch {}
    recordProctorEvent("clipboard_copy", "User copied selection", { text });
  };

  const onCut = (e: ClipboardEvent) => {
    let text = "";
    try {
      text = (window.getSelection()?.toString() || "").slice(0, 500);
    } catch {}
    recordProctorEvent("clipboard_cut", "User cut selection", { text });
  };

  const onPaste = (e: ClipboardEvent) => {
    let text = "";
    try {
      text = (e.clipboardData?.getData("text") || "").slice(0, 500);
    } catch {}
    recordProctorEvent("clipboard_paste", "User pasted content", { text });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (mod && (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "v")) {
      recordProctorEvent(
        "hotkey",
        `Hotkey ${mod ? (isMac ? "Cmd" : "Ctrl") : ""}+${e.key.toUpperCase()}`
      );
    }
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
  window.addEventListener("copy", onCopy as any);
  window.addEventListener("cut", onCut as any);
  window.addEventListener("paste", onPaste as any);
  window.addEventListener("keydown", onKeyDown);

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("copy", onCopy as any);
    window.removeEventListener("cut", onCut as any);
    window.removeEventListener("paste", onPaste as any);
    window.removeEventListener("keydown", onKeyDown);
  };
}, [webcamProctoringEnabled, recordProctorEvent]);
```

#### Proctoring Score Calculation

```typescript
// Lines 1178-1270: Proctoring score calculation
const scores = {
  face_presence: {
    supported: true,
    deductions: 0,
    noFaceEvents: 0,
    multipleFaceEvents: 0,
    prolongedNoFaceEvents: 0,
    prolongedMultipleFaceEvents: 0,
  },
  attention: { deductions: 0, hiddenMs: 0 },
  device_integrity: { deductions: 0, issues: 0 },
  speaking_anomalies: { deductions: 0, count: 0 },
  clipboard: { deductions: 0, copies: 0, pastes: 0 },
  network: { deductions: 0, disconnects: 0, totalDisconnectMs: 0 },
  automation_hints: {
    deductions: 0,
    hotkeys: 0,
    focusBlurEvents: 0,
  },
} as any;

let totalScore = 100;
// derive from duration events
for (const ev of events) {
  switch (ev.type) {
    case "face_not_detected":
      scores.face_presence.noFaceEvents += 1;
      break;
    case "multiple_faces_detected":
      scores.face_presence.multipleFaceEvents += 1;
      break;
    case "prolonged_no_face":
      scores.face_presence.prolongedNoFaceEvents += 1;
      break;
    case "prolonged_multiple_faces":
      scores.face_presence.prolongedMultipleFaceEvents += 1;
      break;
    case "page_hidden_duration":
      scores.attention.hiddenMs += ev.meta?.ms || 0;
      break;
    case "network_disconnect_duration":
      scores.network.totalDisconnectMs += ev.meta?.ms || 0;
      break;
    // ... additional cases for all event types
  }
}

// Calculate deductions and final score
totalScore -= Math.min(25, scores.face_presence.noFaceEvents * 1 + scores.face_presence.multipleFaceEvents * 2);
totalScore -= Math.min(20, Math.floor(scores.attention.hiddenMs / 10000) * 2);
totalScore -= Math.min(15, scores.clipboard.copies + scores.clipboard.pastes * 2);
totalScore -= Math.min(10, scores.network.disconnects * 3);
```

#### Database Operations

```typescript
// Lines 896-999: Interview data management
const createInterviewData = async (data: any) => {
  try {
    const processedData = {
      ...data,
      endTime: data.endTime && data.endTime.trim() !== ""
        ? new Date(data.endTime)
        : undefined,
      startTime: new Date(data.startTime),
      updateIfExists: false,
    };

    const response = await fetch("/api/interview-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(processedData),
    });

    if (!response.ok) {
      throw new Error("Failed to create interview data");
    }

    const result = await response.json();
    if (result?.data?.id) {
      setInterviewDataId(result.data.id);
      // Persist interviewDataId in recording metadata
      try {
        if (recordingKeyRef.current) {
          const rec = (await idbGet(recordingKeyRef.current)) as StoredRecording | undefined;
          if (rec) {
            rec.interviewDataId = result.data.id;
            await idbPut(rec);
          }
        }
      } catch {}
    }

    return result;
  } catch (error) {
    console.error("Error creating interview data:", error);
    throw error;
  }
};

const updateInterviewData = async (data: any) => {
  try {
    const processedData = {
      ...data,
      endTime: data.endTime && data.endTime.trim() !== ""
        ? new Date(data.endTime)
        : undefined,
      startTime: new Date(data.startTime),
      candidateName: userData?.name || data.candidateName,
      updateIfExists: interviewDataId ? true : false,
    };

    if (interviewDataId) {
      processedData.id = interviewDataId;
    }

    const response = await fetch("/api/interview-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(processedData),
    });

    if (!response.ok) {
      throw new Error("Failed to update interview data");
    }

    const result = await response.json();
    if (!interviewDataId && result?.data?.id) {
      setInterviewDataId(result.data.id);
      try {
        if (recordingKeyRef.current) {
          const rec = (await idbGet(recordingKeyRef.current)) as StoredRecording | undefined;
          if (rec) {
            rec.interviewDataId = result.data.id;
            await idbPut(rec);
          }
        }
      } catch {}
    }

    return result;
  } catch (error) {
    console.error("Error updating interview data:", error);
    throw error;
  }
};
```

#### Transcript Processing

```typescript
// Lines 1003-1071: Transcript handling and Q&A extraction
const handleTranscriptUpdate = useCallback((newTranscriptions: any[]) => {
  setTranscriptions(newTranscriptions);
}, []);

// Save transcripts periodically
useEffect(() => {
  if (interviewData && transcriptions.length > 0) {
    const saveTranscriptInterval = setInterval(() => {
      updateInterviewData({
        interviewId: interviewData.interviewId,
        transcript: JSON.stringify(transcriptions),
        startTime: interviewData.startTime,
        endTime: null,
        duration: calculateDuration(interviewData.startTime),
        analysis: {},
        questionAnswers: extractQuestionAnswers(transcriptions),
        candidateName: userData?.name || "",
      }).catch((error) => {
        console.error("Failed to update transcript:", error);
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(saveTranscriptInterval);
  }
}, [interviewData, transcriptions, userData, isPracticeMode]);

// Calculate duration in minutes
const calculateDuration = (startTime: string): number => {
  const start = new Date(startTime).getTime();
  const now = new Date().getTime();
  return Math.floor((now - start) / (1000 * 60));
};

// Extract question-answer pairs from transcriptions
const extractQuestionAnswers = (transcript: any[]): any[] => {
  const qa: any[] = [];
  let currentQuestion = null;
  let currentAnswers: string[] = [];

  for (let i = 0; i < transcript.length; i++) {
    const entry = transcript[i];

    if (entry.speaker === "interviewer") {
      // If we have a previous Q&A pair, save it
      if (currentQuestion && currentAnswers.length > 0) {
        qa.push({
          question: currentQuestion,
          answer: currentAnswers.join(" "),
        });
      }

      // Start a new Q&A pair
      currentQuestion = entry.text;
      currentAnswers = [];
    } else if (entry.speaker === "candidate" && currentQuestion) {
      currentAnswers.push(entry.text);
    }
  }

  // Add the last Q&A pair if it exists
  if (currentQuestion && currentAnswers.length > 0) {
    qa.push({
      question: currentQuestion,
      answer: currentAnswers.join(" "),
    });
  }

  return qa;
};
```

#### Disconnect Handler

```typescript
// Lines 1074-1324: Complete disconnect handler with feedback generation
const handleDisconnect = useCallback(async () => {
  if (skipSaveOnDisconnectRef.current) {
    return;
  }

  if (interviewData) {
    const endTime = new Date().toISOString();
    try {
      // Stop and finalize recording first
      try {
        await stopInterviewRecording();
      } catch {}

      const updateResponse = await updateInterviewData({
        interviewId: interviewData.interviewId,
        transcript: JSON.stringify(transcriptions),
        startTime: interviewData.startTime,
        endTime,
        duration: calculateDuration(interviewData.startTime),
        analysis: {},
        questionAnswers: extractQuestionAnswers(transcriptions),
        candidateName: userData?.name || "",
        resumeUrl: userData?.resumeUrl || undefined,
        resumeText: userData?.resumeText || undefined,
      });

      // Ensure recording metadata has interviewDataId
      try {
        const idFromResp = updateResponse?.data?.id;
        if (idFromResp && recordingKeyRef.current) {
          const rec = (await idbGet(recordingKeyRef.current)) as StoredRecording | undefined;
          if (rec) {
            rec.interviewDataId = idFromResp;
            await idbPut(rec);
          }
        }
      } catch {}

      // Attempt immediate upload
      try {
        if (recordingKeyRef.current) {
          await uploadRecordingByKey(recordingKeyRef.current);
        }
      } catch {}

      // Generate feedback after saving interview data
      if (updateResponse?.data?.id) {
        setIsFeedbackLoading(true);
        setShowFeedbackModal(true);

        try {
          const feedbackResponse = await fetch("/api/interview-feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              interviewDataId: updateResponse.data.id,
              practiceMode: isPracticeMode === true,
            }),
          });

          if (feedbackResponse.ok) {
            const feedbackData = await feedbackResponse.json();
            setFeedback(feedbackData.feedback);
          }
        } catch (feedbackError) {
          console.error("Error generating feedback:", feedbackError);
        } finally {
          setIsFeedbackLoading(false);
        }
      }

      // Persist proctoring events if enabled
      if (webcamProctoringEnabled && proctoringRef.current.events.length > 0) {
        await fetch("/api/proctoring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewId: interviewData.interviewId,
            interviewDataId: interviewDataId,
            candidateName: userData?.name || undefined,
            startedAt: startTimeRef.current,
            endedAt: endTime,
            events: proctoringRef.current.events,
            scores: calculateProctoringScores(proctoringRef.current.events),
          }),
        });
      }
    } catch (error) {
      console.error("Failed to save interview data on disconnect:", error);
    }
  }
}, [interviewData, transcriptions, userData, isPracticeMode, webcamProctoringEnabled]);
```

#### User Form Component (Interview Entry Form)

The UserForm component is the main entry point for candidates to join an interview session. It provides a polished UI with form validation, resume upload, and multiple interview modes.

```typescript
// Lines 1403-1721: Complete UserForm component
function UserForm({
  onSubmit,
  isSubmitting,
  error,
}: {
  onSubmit: (data: UserFormData) => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [webcamProctoring, setWebcamProctoring] = useState(false);
  const [useResume, setUseResume] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get access code from URL if present
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setAccessCode(codeFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, accessCode, webcamProctoring, useResume, resumeUrl, resumeText });
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative bg-white overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2663FF]/10 via-[#1D244F]/5 to-white opacity-30"></div>
      <Meteors />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10"
      >
        <Card className="w-full overflow-y-auto max-w-lg p-8 border border-[#F7F7FA] shadow-xl bg-gray-50 backdrop-blur-sm rounded-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Section */}
            <div className="space-y-3 text-center">
              <motion.div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-full">
                <Sparkles className="w-4 h-4 text-[#2663FF]" />
                <span className="text-sm font-medium text-[#1D244F]">AI-Powered Interview</span>
              </motion.div>
              <h1 className="text-3xl font-bold text-[#1D244F]">
                Welcome to Your Interview Session
              </h1>
              <p className="text-gray-700">
                Enter your details to connect with our AI Interviewer
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#1D244F] font-medium">
                  Your Name
                </Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="border-[#F7F7FA] focus:border-[#2663FF] focus:ring-[#2663FF]/30 rounded-lg h-12"
                />
              </div>

              {/* Access Code Input */}
              <div className="space-y-2">
                <Label htmlFor="accessCode" className="text-[#1D244F] font-medium">
                  Access Code
                </Label>
                <Input
                  id="accessCode"
                  placeholder="Enter the interview access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  required
                  className="border-[#F7F7FA] focus:border-[#2663FF] focus:ring-[#2663FF]/30 rounded-lg h-12"
                />
              </div>

              {/* Resume Upload Toggle */}
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="useResume" className="text-[#1D244F] font-medium">
                  Upload Resume
                </Label>
                <input
                  id="useResume"
                  type="checkbox"
                  className="h-5 w-5 accent-[#2663FF]"
                  checked={useResume}
                  onChange={(e) => setUseResume(e.target.checked)}
                />
              </div>

              {/* Resume Upload Component */}
              {useResume && (
                <div className="space-y-2">
                  <FileUpload
                    acceptedFileTypes=".pdf"
                    label="Upload Resume"
                    onFileUploaded={(url, text) => {
                      setResumeUrl(url);
                      setResumeText(text || "");
                    }}
                    parseToText
                  />
                  {resumeText ? (
                    <div className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      Resume parsed. You can start the interview.
                    </div>
                  ) : (
                    <p className="text-xs text-[#5B5F79]">Join Interview will be enabled after resume is parsed.</p>
                  )}
                </div>
              )}

              {/* Webcam Proctoring Toggle */}
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="webcamProctoring" className="text-[#1D244F] font-medium">
                  Webcam Proctoring
                </Label>
                <input
                  id="webcamProctoring"
                  type="checkbox"
                  className="h-5 w-5 accent-[#2663FF]"
                  checked={webcamProctoring}
                  onChange={(e) => setWebcamProctoring(e.target.checked)}
                />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 text-sm rounded-lg bg-red-50 border border-red-200 text-red-600">
                {error}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="space-y-3">
              {/* Join Interview Button */}
              <button
                type="submit"
                className={`w-full rounded-lg px-8 py-4 text-lg font-medium transition-all duration-300 shadow-lg text-white ${
                  isSubmitting || !name || !accessCode || (useResume && !resumeText)
                    ? "bg-[#f7a828]/60 opacity-60 cursor-not-allowed"
                    : "bg-[#f7a828] hover:bg-[#f7a828]/90 hover:shadow-[#f7a828]/30 transform hover:-translate-y-1"
                }`}
                disabled={isSubmitting || !name || !accessCode || (useResume && !resumeText)}
              >
                {isSubmitting ? "Connecting..." : "Join Interview"}
              </button>

              {/* Practice Mode Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-[#2663FF]/30 text-[#2663FF] hover:bg-[#2663FF]/10"
                disabled={isSubmitting || !name}
                onClick={() => onSubmit({
                  name,
                  accessCode,
                  practice: true,
                  webcamProctoring,
                  useResume,
                  resumeUrl,
                  resumeText
                })}
              >
                Try Practice Mode
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
```

##### Key Features of UserForm:
- **Form Validation**: Required fields with conditional validation
- **Resume Upload**: PDF parsing with real-time feedback
- **Access Code Auto-fill**: Reads from URL parameters
- **Dual Interview Modes**: Regular and Practice modes
- **Optional Proctoring**: Toggle for webcam monitoring
- **Animated UI**: Framer Motion animations and effects

#### Interview Interface Component

The InterviewInterface manages the active interview session with real-time features.

```typescript
// Lines 1723-2000: InterviewInterface component (simplified)
function InterviewInterface({
  isDemoMode = false,
  isPracticeMode = false,
  interviewId,
  onTranscriptUpdate,
  candidateName,
  webcamProctoringEnabled,
  onProctorEvent,
  proctoringStats,
  setProctoringStats,
  showFeedbackModal,
  setShowFeedbackModal,
  feedback,
  isFeedbackLoading,
}: InterviewInterfaceProps) {
  const { state: agentState } = useVoiceAssistant();
  const transcriptions = useCombinedTranscriptions();
  const webcamRef = useRef<any>(null);
  const isRecording = agentState === "listening";
  const isConnected = agentState !== "disconnected";

  // Face detection proctoring
  const faceDetectionStatus = useFaceDetection(webcamRef, {
    enabled: !!(webcamProctoringEnabled && isConnected),
    detectionInterval: 2000,
    onNoFaceDetected: () => {
      setProctoringStats(prev => ({ ...prev, noFaceCount: prev.noFaceCount + 1 }));
    },
    onMultipleFacesDetected: (count: number) => {
      setProctoringStats(prev => ({ ...prev, multipleFaceCount: prev.multipleFaceCount + 1 }));
    },
    onProctorEvent,
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b p-4 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Interview in Progress</h1>
          {isPracticeMode && <Badge>Practice Mode</Badge>}
          {isConnected && (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
              <span className="text-sm">{isRecording ? "Listening..." : "Speaking..."}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcription View */}
        <div className="flex-1">
          <TranscriptionView
            transcriptions={transcriptions}
            onTranscriptUpdate={onTranscriptUpdate}
          />
        </div>

        {/* Webcam Proctoring Panel */}
        {webcamProctoringEnabled && (
          <div className="w-80 border-l bg-gray-50 p-4">
            <h3 className="font-medium">Webcam Monitor</h3>
            <Webcam ref={webcamRef} audio={false} className="w-full rounded-lg" />
            <div className="mt-2 text-sm">
              Face Status: {faceDetectionStatus.status}
            </div>
            {/* Proctoring Stats Display */}
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              <div className="p-2 bg-white rounded">
                <span>No Face: {proctoringStats.noFaceCount}</span>
              </div>
              <div className="p-2 bg-white rounded">
                <span>Multiple: {proctoringStats.multipleFaceCount}</span>
              </div>
              <div className="p-2 bg-white rounded">
                <span>Tab Switches: {Math.max(0, proctoringStats.tabSwitchCount)}</span>
              </div>
              <div className="p-2 bg-white rounded">
                <span>Copy/Paste: {proctoringStats.copyPasteCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t p-4">
        <VoiceAssistantControlBar />
      </div>

      {/* Hidden Components */}
      <RoomAudioRenderer />
      {!isConnected && <NoAgentNotification />}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <InterviewFeedback
          feedback={feedback}
          isLoading={isFeedbackLoading}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </div>
  );
}
```

##### Key Features of InterviewInterface:
- **Real-time Status**: Agent state and connection indicators
- **Live Transcription**: Real-time transcript with speaker identification
- **Webcam Monitoring**: Face detection with violation statistics
- **Voice Controls**: LiveKit control bar for audio management
- **Feedback System**: Post-interview AI evaluation modal
- **Practice Mode**: Special handling for practice sessions

### Create Interview Admin Page
**File Location**: `frontend/app/(admin)/create-interview/page.tsx`

#### Component Structure

```typescript
// Lines 67-77: Main component definition
export default function CreateInterviewPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [uploadRecordId, setUploadRecordId] = useState<string | null>(null);
  const [viewRecordId, setViewRecordId] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewQuestions, setViewQuestions] = useState<any[]>([]);
  const [viewSortSource, setViewSortSource] = useState<"none" | "resumeFirst" | "jdFirst">("none");
  const router = useRouter();
```

#### Interview Creation Process

```typescript
// Lines 119-141: Interview creation function
const createInterview = async (recordId: string) => {
  setCreating(recordId);
  try {
    const response = await fetch("/api/create-interview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recordId }),
    });

    if (!response.ok) throw new Error("Failed to create interview");

    const data = await response.json();
    toast.success("Interview created successfully");
    fetchInterviews(); // Refresh the interviews list
  } catch (error) {
    console.error("Error creating interview:", error);
    toast.error("Failed to create interview");
  } finally {
    setCreating(null);
  }
};
```

#### Resume Question Generation

```typescript
// Lines 148-173: Resume-based question generation
const handleResumeUploaded = async (recordId: string, _url: string, resumeText?: string | null) => {
  try {
    if (!resumeText || resumeText.trim().length < 50) {
      toast.error("Resume parsing failed or too short. Please upload a valid PDF.");
      return;
    }
    toast.info("Generating questions from resume...", {
      duration: 10000,
    });
    const resp = await fetch(`/api/records/${recordId}/resume-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText, count: 4 }),
    });
    if (!resp.ok) {
      const j = await resp.json().catch(() => ({}));
      throw new Error(j?.error || "Failed to generate questions from resume");
    }
    const j = await resp.json();
    toast.success(`Created ${j?.created || 0} resume questions`);
    setUploadRecordId(null);
    fetchRecords({ silent: true });
  } catch (e: any) {
    toast.error(e?.message || "Failed to generate questions from resume");
  }
};
```

### Connection Details API
**File Location**: `frontend/app/api/connection-details/route.ts`

#### GET Request Handler

```typescript
// Lines 27-177: Complete GET handler
export async function GET(request: NextRequest) {
  try {
    console.log("Getting connection details...");
    const searchParams = request.nextUrl.searchParams;

    // User information
    const name = searchParams.get("name") || "Anonymous";
    const skillLevel = searchParams.get("skillLevel");
    const role = searchParams.get("role");
    const accessCode = searchParams.get("accessCode");

    console.log(`Request params - Name: ${name}, AccessCode: ${accessCode ? "Provided" : "None"}`);

    // Check if required environment variables are available
    if (LIVEKIT_URL === undefined) {
      console.error("LIVEKIT_URL is not defined");
      return NextResponse.json(
        { error: "Server configuration error: LIVEKIT_URL is not defined" },
        { status: 500 }
      );
    }

    if (API_KEY === undefined) {
      console.error("LIVEKIT_API_KEY is not defined");
      return NextResponse.json(
        { error: "Server configuration error: LIVEKIT_API_KEY is not defined" },
        { status: 500 }
      );
    }

    if (API_SECRET === undefined) {
      console.error("LIVEKIT_API_SECRET is not defined");
      return NextResponse.json(
        { error: "Server configuration error: LIVEKIT_API_SECRET is not defined" },
        { status: 500 }
      );
    }

    // Check for room-specific parameters
    let roomName = searchParams.get("room");
    let metadata: Record<string, any> = {};
    let isDemoMode = false;
    const practiceMode = (searchParams.get("practice") === "true") || (searchParams.get("practiceMode") === "true");

    // If access code is provided, look up the interview
    if (accessCode) {
      console.log(`Looking up interview with access code: ${accessCode}`);

      try {
        // Find interview by access code
        const interview = await prisma.interview.findUnique({
          where: { accessCode },
          include: { record: true },
        });

        if (!interview) {
          console.log("Interview not found with provided access code");
          return NextResponse.json(
            { error: "Invalid access code or interview not found" },
            { status: 404 }
          );
        }


        console.log(`Found interview room: ${interview.roomId}`);
        roomName = interview.roomId;
        roomName += "-" + Math.random().toString(36).substring(2, 15);

        // Include record ID in metadata for the agent to use
        metadata = {
          role: interview.record?.jobTitle || (role || "Software Engineer"),
          candidateName: name,
          recordId: interview.recordId,
          skill: skillLevel || "mid",
          interviewId: interview.id,
          roomId: roomName,
          practiceMode,
        };
```

#### Token Generation

```typescript
// Lines 282-294: LiveKit token creation
function createParticipantToken(userInfo: AccessTokenOptions, roomName: string) {
  const at = new AccessToken(API_KEY, API_SECRET, userInfo);
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
}
```

## Backend Components - Python AI Agent

### Interview Agent Core
**File Location**: `backend/agent.py`

#### Agent Class Definition

```python
# Lines 103-119: InterviewAgent class initialization
class InterviewAgent(Agent):
    def __init__(self,
                 role: str = "Software Engineer",
                 candidate_name: str = "Candidate",
                 skill_level: str = "mid",
                 record_id: str = None,
                 room_name: str = None,
                 room_id: str = None,
                 interview_id: str = None,
                 all_questions: List[str] = None,
                 questions_list: str = "",
                 practice_mode: bool = False,
                 questions_count:int =0,
                 template_skills_info: Optional[List[Dict]] = None,
                 total_duration_minutes: Optional[int] = None,
                 resume_text: Optional[str] = None) -> None:
```

#### Practice Mode Instructions

```python
# Lines 159-197: Practice mode configuration
if practice_mode:
    # Practice mode: override with easy, hard-coded questions
    practice_questions = [
        "What is the difference between hardware and software?",
        "What is the main purpose of an internet browser?",
        "What is the purpose of an input and an output in programming?",
    ]
    all_questions = practice_questions
    questions_list = ""
    for i, q in enumerate(practice_questions):
        questions_list += f"{i+1}. {q}\n\n"

    full_instructions = f"""
You are a warm, friendly interviewer running a short practice session before the real interview. Your goal is to help the candidate get comfortable with the interface and the flow.

INTERVIEW PERSONALITY & COMMUNICATION STYLE:
- Be warm, friendly, and encouraging throughout the practice
- Use natural, conversational phrases and a supportive tone

PRACTICE SESSION:
- This is a brief practice round with 2-3 very easy questions
- Ask the following questions in order, and keep the conversation light
- After practice, ask if they're ready to start the real interview

QUESTIONS TO ASK (IN EXACT ORDER):
{questions_list}

YOU MUST FOLLOW THESE RULES:
1. ONLY ask the practice questions shown above, in the exact order (1, 2, 3)
2. You MAY answer questions about the interview structure, what the candidate needs to do, expectations, and basic rules. Keep answers brief and friendly.
3. Do not reveal correct answers. Provide only one short, non-leading hint when the candidate says they don't know or explicitly asks for a hint.
4. Guardrails: If asked about the job description (JD), company, role details, compensation/CTC, hiring process/next steps, or feedback about performance, DO NOT answer. Reply something like but must not be exact same to this sentence: "I don't have that specific information, but the hiring team can provide all the details you need."
5. After each answer, acknowledge briefly (one short sentence) without repeating or summarizing the candidate's answer.
6. At the end of practice, say: "We can wrap up practice here. Are you ready to start the real interview?"
7. If the candidate says yes he/she is ready for real interview and ask them to clcik on end interview and click on start new interview button to get back to interview form
8. If the candidate says no he/she is not ready for real interview and ask them if he/she has any doubts or questions about the practice session or real interview
9. If the candidate says they don't know, respond supportively and offer one short, non-leading hint to help them get started, then invite them to try.
10. If the candidate asks for a hint, provide only one short, non-leading hint and clarify you won't disclose the answer; mention there may be a penalty for relying on hints.
"""
```

#### Real Interview Instructions System

```python
# Lines 198-296: Full interview instructions
elif all_questions and questions_list:
    # Create direct instructions with the FULL list of questions
    full_instructions = f"""
You are a warm, professional, and genuinely human interviewer conducting a technical interview. Your goal is to create a comfortable, conversational atmosphere while maintaining the structure of the interview.

INTERVIEW PERSONALITY & COMMUNICATION STYLE:
- Be warm, friendly, and encouraging throughout the interview
- Use natural conversational phrases like "That's great to hear," "I really like that approach," "Thanks for sharing that perspective"
- Add natural human pauses and thinking moments - "Let me think about that..." "Hmm, interesting point..." "You know what, that's a good way to look at it"
- Use the candidate's first name occasionally in a natural way
- Speak with varied pacing and tone - lean slightly slower overall; add a brief pause before moving on
- Show genuine interest with follow-ups like "That's fascinating - can you tell me more about why you chose that approach?"
- Prefer polite prompts to start questions: "Could you please explain...", "Could you walk me through...". Avoid saying "next question" or "now next question".
- Occasionally make small thinking sounds like "hmm" or "mmm" when processing information

TIME AWARENESS:
- Today's date and interview start: {start_time_human} (local time)
- If the candidate asks how much time has passed since we started, calculate the elapsed time from the current local time to the start time and answer briefly (e.g., "It's been about 12 minutes"). Share the exact start time if they ask for it.

QUESTIONS TO ASK (IN EXACT ORDER):
{questions_list}

YOU MUST FOLLOW THESE RULES:
1. Ask the questions shown above in the given order (1, 2, 3, 4...), one at a time. If the candidate explicitly requests switching to a closely related skill (e.g., GCP instead of AWS), you may adapt the current and subsequent questions to that requested skill while preserving the core intent and difficulty.
2. Do not invent new topics. You may rephrase a question only to map it to the requested, closely related skill while keeping the same competency focus.
3. Present each question conversationally as a human would, but preserve the core content
4. After each answer, acknowledge briefly (one short sentence) without repeating or summarizing the candidate's answer
5. If the candidate says they don't know or explicitly asks for a hint, respond supportively (e.g., "That's completely fine, these can be tricky"). Offer one short, non-leading hint (7–12 words), then invite them to try. If they prefer to skip, proceed to the next question.
6. DO NOT SKIP QUESTIONS under any circumstances
7. Convert numerical values to natural speech (e.g., "twenty thousand rupees" instead of "20,000")
8. Do not reveal correct answers. Do not give hints except when the candidate explicitly says they don't know or explicitly asks for a hint; provide only one short, non-leading hint and do not disclose the answer.
9. Limit follow-up questions to 1-2 per question, maximum 6 total in the interview. Keep each follow-up to one sentence and do not repeat or summarize the candidate's answer; refer to at most a single key phrase.
10. Occasionally stumble slightly in your speech like a real person - "So, the next thing I wanted to ask about is... actually, let me rephrase that..."
11. Guardrails: If the candidate asks about the job description (JD), company, role details, compensation/CTC, hiring process/next steps, or feedback about their performance, DO NOT answer. Your response must be exactly: "I don't have that specific information, but the hiring team can provide all the details you need."
12. Do not handle employer branding, provide company information, or discuss compensation/CTC under any circumstances. Politely redirect with the exact response above.
"""
```

#### AI Components Configuration

```python
# Lines 365-390: Agent configuration
super().__init__(
    instructions=full_instructions,  # Using full instructions from the start
    stt=assemblyai.STT(
     end_of_turn_confidence_threshold=0.7,
min_end_of_turn_silence_when_confident=160,
max_turn_silence=2400,
),
llm=openai.LLM(
    model="gpt-4.1",
    temperature=0.7,
),
#          tts=hume.TTS(
#       voice=hume.VoiceByName(name="Colton Rivers", provider=hume.VoiceProvider.hume),
#       description="The voice exudes calm, serene, and peaceful qualities, like a gentle stream flowing through a quiet forest.",
#    ),

tts=cartesia.TTS(
  model="sonic-2",
#   voice="1259b7e3-cb8a-43df-9446-30971a46b8b0",
voice="da69d796-4603-4419-8a95-293bfc5679eb",
  speed=0.5,  # Slightly slower speaking speed for more relaxed pacing
),
vad=silero.VAD.load(),
    turn_detection=turn_detection_impl,

)
```

#### TTS Pronunciation Customization

```python
# Lines 504-613: Custom pronunciation system
async def tts_node(self, text: AsyncIterable[str], model_settings: ModelSettings) -> AsyncIterable[rtc.AudioFrame]:
    """Customize TTS pronunciation for common technical terms before synthesizing.

    This wraps the default implementation to adjust pronunciations (e.g., "Next.js" → "Next J S").
    """
    # Base pronunciation replacements for simple words/abbreviations
    simple_pronunciations: Dict[str, str] = {
        # Acronyms & abbreviations
        "API": "A P I",
        "REST": "rest",
        "SQL": "sequel",
        "GraphQL": "Graph Q L",
        "NoSQL": "No S Q L",
        "JSON": "Jay sawn",
        "YAML": "Yam ell",
        "HTML": "H T M L",
        "CSS": "C S S",
        "JSX": "J S X",
        "TSX": "T S X",
        "URL": "U R L",
        "URI": "U R I",
        "HTTP": "H T T P",
        "HTTPS": "H T T P S",
        "IDE": "I D E",
        "GUI": "gooey",
        "JS": "Jayess",
        "npm": "N P M",
        "npx": "N P X",
        "AWS": "A W S",
        "GCP": "G C P",
        "S3": "S three",
        "EC2": "E C two",
        "RDS": "R D S",
        "IAM": "I A M",
        "DynamoDB": "Dynamo D B",
        "SNS": "S N S",
        "SQS": "S Q S",
        "GPU": "G P U",
        "SSD": "S S D",
        "UI": "U I",
        "UX": "U X",

        # Common product/tech names
        "NGINX": "engine x",
        "nginx": "engine x",
        "GNU": "guh new",
        "kubectl": "kube control",
        "Linux": "Lin ucks",
        "Regex": "Rej ex",
        "regex": "Rej ex",
        "Cache": "Cash",
        "cache": "Cash",
        "Epoch": "Eh pock",
        "epoch": "Eh pock",
        "LaTeX": "Lay tek",
        "Python": "Pie thon",
        "Django": "Jango",
        "GIF": "Jif",
        "PyPI": "Pie P I",

        # Company / product names
        "Asus": "Ay soos",
        "Huawei": "Hwah way",
        "Xiaomi": "Shau mee",
        "Oracle": "Or uh kull",
    }
```

#### Interview Entry Point

```python
# Lines 803-930: Main entry point function
async def entrypoint(ctx: JobContext):
    log_info(f"connecting to room {ctx.room.name}")
    # Subscribe to both audio and video to support multimodal turn detection by default
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)

    # Wait for the first participant to connect
    participant = await ctx.wait_for_participant()
    log_info(f"starting technical interview for participant {participant.identity}")

    # Extract user information from room name and participant metadata
    role = "Software Engineer"  # default
    skill_level = "mid"  # default
    candidate_name = participant.identity or "Candidate"
    record_id = None
    room_id = None
    interview_id = None
    practice_mode = False
    resume_text = None

    if participant.metadata:
        try:
            metadata = json.loads(participant.metadata)
            role = metadata.get('role', role)
            skill_level = metadata.get('skill', skill_level)
            record_id = metadata.get('recordId', record_id)
            candidate_name = metadata.get('candidateName', candidate_name)
            room_id = metadata.get('roomId', room_id)
            interview_id = metadata.get('interviewId', interview_id)
            pm = metadata.get('practiceMode')
            if isinstance(pm, bool):
                practice_mode = pm
            elif isinstance(pm, str):
                practice_mode = pm.lower() in ("1", "true", "yes", "y")
            try:
                rt = metadata.get('resumeText')
                if isinstance(rt, str) and rt:
                    resume_text = rt
            except Exception:
                resume_text = None
            log_info(f"Using metadata - Role: {role}, Skill: {skill_level}, Record ID: {record_id}, Room ID: {room_id}, Interview ID: {interview_id}")
        except json.JSONDecodeError:
            log_warning("Failed to parse participant metadata")
```

#### Question Extraction from Template

```python
# Lines 739-801: Extract questions from database template
async def extract_questions_from_template(record_id: str, room_name: str) -> tuple:
    """Extract all questions from a template and return as a list and formatted string"""
    all_questions = []
    questions_list = ""
    role_title = "Technical Role"  # Default
    skills_info = []
    total_duration_minutes = 30

    try:
        # Fetch the template
        dynamic_template = await fetch_interview_template(record_id, room_name)
        if dynamic_template:
            role_title = dynamic_template.jobTitle
            try:
                total_duration_minutes = int(dynamic_template.duration_minutes)
            except Exception:
                total_duration_minutes = 30

            # Extract ALL questions from the template
            for skill in dynamic_template.skills:
                if skill.questions and len(skill.questions) > 0:
                    for question in skill.questions:
                        # Extract just the question text from JSON if needed
                        question_text = question
                        if question_text.startswith('{') and '"question":' in question_text:
                            try:
                                question_obj = json.loads(question_text)
                                if 'question' in question_obj:
                                    question_text = question_obj['question']
                            except json.JSONDecodeError:
                                pass
                        all_questions.append(question_text)

            # Build skills info (name and question count)
            try:
                for skill in dynamic_template.skills:
                    skills_info.append({
                        "id": getattr(skill, "id", ""),
                        "name": getattr(skill, "name", "Unknown Skill"),
                        "num_questions": len(skill.questions or []),
                    })
            except Exception:
                pass

            # Log all questions for debugging
            log_info(f"Extracted {len(all_questions)} questions from template")
            for i, q in enumerate(all_questions):
                log_info(f"  Q{i+1}: {q[:100]}...")

            # Build a numbered list of ALL questions
            for i, q in enumerate(all_questions):
                questions_list += f"{i+1}. {q}\n\n"

            # Log the questions
            log_info(f"The questions are {questions_list}")
        else:
            log_error("Failed to load dynamic template", "No template returned")

    except Exception as e:
        log_error(f"Error extracting questions from template", e)

    return all_questions, questions_list, role_title, skills_info, total_duration_minutes
```

### Database Module
**File Location**: `backend/database.py`

```python
# Lines 1-110: Complete database module
"""
Database Client Module
Handles Prisma database connections and operations.

This module exposes a minimal async API:
- get_prisma_client(): create/reuse the Prisma client
- close_prisma_client(): close connection on shutdown
- fetch_interview_template_data(record_id): return a dict with
  jobTitle, interviewLength, skills, and questions that downstream
  code (e.g., interview_config) expects.
"""

import os
import logging
from prisma import Prisma
from prisma.models import SkillRecord, Skill, Question
from typing import Optional

# Setup logging
logger = logging.getLogger("database")

# Global Prisma client instance
_prisma_client: Optional[Prisma] = None

async def get_prisma_client() -> Prisma:
    """
    Get or create a Prisma client instance
    """
    global _prisma_client

    if _prisma_client is None:
        _prisma_client = Prisma()
        await _prisma_client.connect()
        logger.info("Connected to database via Prisma")

    return _prisma_client

async def close_prisma_client():
    """
    Close the Prisma client connection
    """
    global _prisma_client

    if _prisma_client is not None:
        await _prisma_client.disconnect()
        _prisma_client = None
        logger.info("Disconnected from database")

async def fetch_interview_template_data(record_id: str) -> Optional[dict]:
    """
    Fetch interview template data directly from database
    Returns data in the same format as the Next.js API route
    """
    try:
        prisma = await get_prisma_client()

        # Fetch the record with skills and questions
        record = await prisma.skillrecord.find_unique(
            where={'id': record_id},
            include={
                'skills': True,
                'questions': True,
            }
        )

        if not record:
            logger.error(f"Record not found with ID: {record_id}")
            return None

        logger.info(f"Found record: {record.jobTitle} with {len(record.skills)} skills and {len(record.questions)} questions")

        # Transform to the flattened shape the agent/config builder expects
        template_data = {
            'id': record.id,
            'jobTitle': record.jobTitle,
            'interviewLength': record.interviewLength or 30,
            'introScript': f"Hello! I'm your interviewer for this {record.jobTitle} position. Thank you for taking the time to interview with us today. This interview will take about {record.interviewLength or 30} minutes and we'll be discussing your experience and technical skills. To start, could you please introduce yourself and tell me a bit about your background?",
            'closingScript': "That concludes our technical portion of the interview. Thank you for your time today! Do you have any questions about the role or company?",
            'skills': [
                {
                    'id': skill.id,
                    'name': skill.name,
                    'level': skill.level,
                    'category': skill.category,
                }
                for skill in record.skills
            ],
            'questions': [
                {
                    'id': question.id,
                    'content': question.content,
                    'skillId': question.skillId,
                }
                for question in record.questions
            ],
        }

        logger.info(f"Template prepared with {len(template_data['skills'])} skills and {len(template_data['questions'])} questions")

        # Log some sample questions for debugging
        if template_data['questions']:
            logger.info("Sample questions:")
            for i, q in enumerate(template_data['questions'][:3]):
                logger.info(f"Question {i+1}: {q['content'][:50]}... (Skill ID: {q['skillId']})")

        return template_data

    except Exception as e:
        logger.error(f"Error fetching interview template from database: {str(e)}")
        return None
```

### Interview Configuration
**File Location**: `backend/interview_config.py`

```python
# Lines 1-124: Complete interview configuration module
"""
Interview Configuration Module
Builds a DynamicInterviewTemplate from DB records for a given record_id.

The resulting template carries skills and their associated questions so the
agent can present questions in a fixed order without changing format.
"""

import os
import logging
from dataclasses import dataclass
from typing import List, Optional
from database import fetch_interview_template_data, close_prisma_client

# Setup logging
logger = logging.getLogger("interview-config")

@dataclass
class Skill:
    id: str
    name: str
    level: str
    category: Optional[str] = None
    questions: List[str] = None

    def __post_init__(self):
        if self.questions is None:
            self.questions = []

@dataclass
class DynamicInterviewTemplate:
    id: str
    jobTitle: str
    duration_minutes: int = 30
    skills: List[Skill] = None
    introduction_script: str = ""
    closing_script: str = ""

    def __post_init__(self):
        if self.skills is None:
            self.skills = []

        if not self.introduction_script:
            self.introduction_script = f"""
            Welcome candidate, I am an interviewer for the {self.jobTitle} and I will be taking your interview. Are you ready to begin the interview?
            """

        if not self.closing_script:
            self.closing_script = """
            Thank you for your time. Do you have any questions for me?
            If they have questions, answer them
            If they don't have questions, thank them for their time and ask them to end the interview and say goodbye and don't speak any more
            """

# Dictionary to cache dynamic interview templates (optional cache)
DYNAMIC_TEMPLATES = {}

async def fetch_interview_template(record_id: str, room_name: str = None) -> Optional[DynamicInterviewTemplate]:
    """Fetch questions/config from DB and map them into our template dataclasses."""
    # Check if template is already cached
    # if record_id in DYNAMIC_TEMPLATES:
    #     logger.info(f"Using cached template for record {record_id}")
    #     return DYNAMIC_TEMPLATES[record_id]

    logger.info(f"Fetching interview template for record {record_id} from database")

    try:
        # Fetch data directly from database using Prisma
        data = await fetch_interview_template_data(record_id)

        if not data:
            logger.error(f"Failed to fetch interview template for record {record_id}")
            return None

        logger.info(f"Received template data with {len(data.get('skills', []))} skills and {len(data.get('questions', []))} questions")

        template = DynamicInterviewTemplate(
            id=data.get('id'),
            jobTitle=data.get('jobTitle', 'Technical Role'),
            duration_minutes=data.get('interviewLength', 30),
            introduction_script=data.get('introScript', ''),
            closing_script=data.get('closingScript', '')
        )

        # Parse skills and map associated questions by skillId
        skills = []
        for skill_data in data.get('skills', []):
            skill = Skill(
                id=skill_data.get('id'),
                name=skill_data.get('name', 'Unknown Skill'),
                level=skill_data.get('level', 'INTERMEDIATE'),
                category=skill_data.get('category')
            )

            # Find questions associated with this skill
            skill_questions = []
            for q in data.get('questions', []):
                # Check if this question is for the current skill
                if q.get('skillId') == skill.id:
                    skill_questions.append(q.get('content', ''))

            skill.questions = skill_questions
            logger.info(f"Added skill {skill.name} with {len(skill_questions)} questions")
            skills.append(skill)

        template.skills = skills

        # Cache the template for potential reuse in the process lifetime
        DYNAMIC_TEMPLATES[record_id] = template

        logger.info(f"Successfully fetched interview template for record {record_id}")
        return template

    except Exception as e:
        logger.error(f"Error fetching interview template from database: {str(e)}")
        return None

async def cleanup_resources():
    """
    Cleanup database connections and other resources
    """
    await close_prisma_client()
    logger.info("Cleaned up interview config resources")
```

### Metrics Collection System
**File Location**: `backend/metrics.py`

```python
# Lines 1-125: Complete metrics collection system
import json
from datetime import datetime
from typing import Dict, List
from livekit.agents.metrics import LLMMetrics, STTMetrics, TTSMetrics, EOUMetrics

from logger import logger, log_metrics

class MetricsCollector:
    def __init__(self):
        # Initialize metrics storage; individual events are appended during run
        self.metrics_data = {
            "llm": [],
            "stt": [],
            "tts": [],
            "eou": []
        }

    async def on_llm_metrics_collected(self, metrics: LLMMetrics) -> None:
        """Collect and store LLM metrics (tokens, speed, ttft)."""
        metrics_obj = {
            "prompt_tokens": metrics.prompt_tokens,
            "completion_tokens": metrics.completion_tokens,
            "tokens_per_second": round(metrics.tokens_per_second, 4),
            "ttft": round(metrics.ttft, 4),
            "timestamp": datetime.now().isoformat()
        }
        self.metrics_data["llm"].append(metrics_obj)
        log_metrics(metrics_obj, "LLM")

    async def on_stt_metrics_collected(self, metrics: STTMetrics) -> None:
        """Collect and store STT metrics (durations, streaming)."""
        metrics_obj = {
            "duration": round(metrics.duration, 4),
            "audio_duration": round(metrics.audio_duration, 4),
            "streamed": metrics.streamed,
            "timestamp": datetime.now().isoformat()
        }
        self.metrics_data["stt"].append(metrics_obj)
        log_metrics(metrics_obj, "STT")

    async def on_eou_metrics_collected(self, metrics: EOUMetrics) -> None:
        """Collect and store End-Of-Utterance metrics (timings)."""
        metrics_obj = {
            "end_of_utterance_delay": round(metrics.end_of_utterance_delay, 4),
            "transcription_delay": round(metrics.transcription_delay, 4),
            "timestamp": datetime.now().isoformat()
        }
        self.metrics_data["eou"].append(metrics_obj)
        log_metrics(metrics_obj, "EOU")

    async def on_tts_metrics_collected(self, metrics: TTSMetrics) -> None:
        """Collect and store TTS metrics (latency, durations)."""
        metrics_obj = {
            "ttfb": round(metrics.ttfb, 4),
            "duration": round(metrics.duration, 4),
            "audio_duration": round(metrics.audio_duration, 4),
            "streamed": metrics.streamed,
            "timestamp": datetime.now().isoformat()
        }
        self.metrics_data["tts"].append(metrics_obj)
        log_metrics(metrics_obj, "TTS")

    def calculate_avg_metrics(self) -> Dict:
        """Calculate category-wise averages for dashboarding/reporting."""
        avg_metrics = {
            "llm": self._calculate_avg_llm_metrics(),
            "stt": self._calculate_avg_stt_metrics(),
            "tts": self._calculate_avg_tts_metrics(),
            "eou": self._calculate_avg_eou_metrics()
        }
        return avg_metrics

    def _calculate_avg_llm_metrics(self) -> Dict:
        """Calculate average LLM metrics"""
        llm_data = self.metrics_data["llm"]
        if not llm_data:
            return {}

        avg = {
            "prompt_tokens": sum(m["prompt_tokens"] for m in llm_data) / len(llm_data),
            "completion_tokens": sum(m["completion_tokens"] for m in llm_data) / len(llm_data),
            "tokens_per_second": sum(m["tokens_per_second"] for m in llm_data) / len(llm_data),
            "ttft": sum(m["ttft"] for m in llm_data) / len(llm_data),
            "total_tokens": sum(m["prompt_tokens"] + m["completion_tokens"] for m in llm_data)
        }
        return {k: round(v, 4) for k, v in avg.items()}
```

### Audio Processing
**File Location**: `backend/audio.py`

```python
# Lines 1-67: Complete audio processing module
"""
Audio configuration helpers for the interviewer agent.

Provides tuned VAD and STT instances suitable for interview scenarios
without altering the rest of the interview format or flow. These helpers
are optional and enabled via environment flags in agent.py.
"""

from __future__ import annotations

import os
from typing import Tuple

from livekit.plugins import silero, assemblyai, deepgram


def get_vad() -> silero.VAD:
    """Return a Silero VAD tuned for interview pacing.

    Uses longer minimum silence to allow thinking pauses and a higher
    speech threshold to avoid background-noise barge-in while the agent speaks.
    """
    # Falls back to library defaults if parameters are unsupported
    try:
        return silero.VAD.load(
            # Require longer continuous speech to consider it a user utterance
            min_speech_duration=0.6,
            # Keep generous silence for natural thinking pauses
            min_silence_duration=1.2,
            # Make VAD less sensitive to background noise
            threshold=0.8,
        )
    except Exception:
        return silero.VAD.load()


def get_enhanced_audio() -> Tuple[object, silero.VAD]:
    """Return (stt, vad) with sensible defaults.

    STT backend is chosen by env STT_BACKEND in {"assemblyai", "deepgram"}.
    Defaults to AssemblyAI with conservative EOU tuning already used by agent.
    """
    backend = os.getenv("STT_BACKEND", "assemblyai").lower()

    vad = get_vad()

    if backend == "deepgram":
        # High-accuracy Deepgram config
        stt = deepgram.STT(
            model="nova-3-general",
            language="en",
            smart_format=True,
            punctuate=True,
            profanity_filter=False,
        )
        return stt, vad

    # Default: AssemblyAI with conservative EOU parameters similar to agent
    stt = assemblyai.STT(
        end_of_turn_confidence_threshold=0.7,
        min_end_of_turn_silence_when_confident=300,
        max_turn_silence=5000,
    )
    return stt, vad
```

### Logging System
**File Location**: `backend/logger.py`

```python
# Lines 1-86: Complete logging system with UTF-8 safety
# Built-in
import logging
import json
from datetime import datetime
import os
import sys
import io

# Ensure logs directory exists for file-based logging
os.makedirs('logs', exist_ok=True)

# Create and configure the logger
def setup_logger(name: str = "interview-agent", log_file: str | None = None):
    """Return a UTF-8 safe logger.

    * Prevent messages from propagating to the *root* logger so that Python's
      default ``StreamHandler`` (which uses the current code-page on Windows)
      does not attempt to write Unicode characters that the console cannot
      encode.
    * Add our own handlers only **once** (function can be called multiple
      times safely).
    * Force UTF-8 encoding for both file and console output.
    """

    logger = logging.getLogger(name)

    # If handlers are already configured, just return the logger to avoid
    # adding duplicate handlers every time this function is called.
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    # Do **not** pass log records to the root logger. This avoids the default
    # StreamHandler that writes using the active Windows code-page, which can
    # raise ``UnicodeEncodeError`` for characters like the Rupee symbol (₹).
    logger.propagate = False

    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # File handler (always UTF-8)
    if log_file is None:
        log_file = "logs/interview_agent.log"

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Console handler with UTF-8; wrap sys.stderr in a UTF-8 TextIOWrapper so
    # that the stream can safely handle any Unicode character.
    utf8_stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
    stream_handler = logging.StreamHandler(utf8_stderr)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    return logger

# Create the default logger
logger = setup_logger(log_file=f'logs/interview_agent.log')

def log_interview_data(interview_data, stage, data):
    """Log interview progress and data for quality assurance"""
    interview_data["stage"] = stage
    interview_data[stage] = data
    interview_data["duration_minutes"] = (
        datetime.now() - datetime.fromisoformat(interview_data["start_time"])
    ).total_seconds() / 60
    logger.info(f"Interview stage: {stage}, Data: {json.dumps(data, indent=2)}")

def log_metrics(metrics_obj, metrics_type):
    """Log metrics data with proper formatting"""
    logger.info(f"{metrics_type} Metrics: {json.dumps(metrics_obj, indent=2)}")

def log_error(message, error):
    """Log error message and exception"""
    logger.error(f"{message}: {str(error)}")

def log_warning(message):
    """Log warning message"""
    logger.warning(message)

def log_info(message):
    """Log info message"""
    logger.info(message)
```

## Database Schema - Prisma Models
**File Location**: `frontend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model SkillRecord {
  id                String             @id @default(uuid())
  jobTitle          String
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  interviewLength   Int?
  rawJobDescription String?
  excelQuestionSets ExcelQuestionSet[]
  globalFeedback    GlobalFeedback?
  interviews        Interview[]
  questions         Question[]
  regenerations     Regeneration[]
  skills            Skill[]
}

model Skill {
  id             String         @id @default(uuid())
  name           String
  level          SkillLevel     @default(INTERMEDIATE)
  requirement    Requirement    @default(OPTIONAL)
  recordId       String
  difficulty     String?
  numQuestions   Int            @default(0)
  priority       Int?
  category       SkillCategory? @default(TECHNICAL)
  questionFormat String?        @default("Scenario based")
  feedbacks      Feedback[]
  questions      Question[]
  regenerations  Regeneration[]
  record         SkillRecord    @relation(fields: [recordId], references: [id], onDelete: Cascade)

  @@unique([name, recordId])
}

model Question {
  id              String         @id @default(uuid())
  content         String
  skillId         String
  recordId        String
  liked           LikeStatus?    @default(NONE)
  feedback        String?
  coding          Boolean        @default(false)
  record          SkillRecord    @relation(fields: [recordId], references: [id], onDelete: Cascade)
  skill           Skill          @relation(fields: [skillId], references: [id], onDelete: Cascade)
  regeneratedFrom Regeneration[] @relation("RegeneratedQuestion")
  regenerations   Regeneration[] @relation("OriginalQuestion")
}

model Feedback {
  id        String   @id @default(uuid())
  content   String
  skillId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  skill     Skill    @relation(fields: [skillId], references: [id], onDelete: Cascade)
}

model GlobalFeedback {
  id        String      @id @default(uuid())
  content   String
  recordId  String      @unique
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  record    SkillRecord @relation(fields: [recordId], references: [id], onDelete: Cascade)
}

model Regeneration {
  id                 String      @id @default(uuid())
  originalQuestionId String
  newQuestionId      String
  reason             String?
  userFeedback       String?
  liked              LikeStatus? @default(NONE)
  skillId            String
  recordId           String
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt
  newQuestion        Question    @relation("RegeneratedQuestion", fields: [newQuestionId], references: [id], onDelete: Cascade)
  originalQuestion   Question    @relation("OriginalQuestion", fields: [originalQuestionId], references: [id], onDelete: Cascade)
  record             SkillRecord @relation(fields: [recordId], references: [id], onDelete: Cascade)
  skill              Skill       @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@unique([originalQuestionId, newQuestionId])
}

model ExcelQuestionSet {
  id                String          @id @default(uuid())
  jobTitle          String
  experienceRange   String          @default("8 to 10 years")
  totalQuestions    Int
  skillsExtracted   String[]
  recordId          String?
  rawJobDescription String
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  questions         ExcelQuestion[]
  record            SkillRecord?    @relation(fields: [recordId], references: [id], onDelete: Cascade)
}

model ExcelQuestion {
  id                  String           @id @default(uuid())
  slNo                Int
  skill               String
  questionTitle       String
  questionDescription String
  idealAnswer         String
  setId               String
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
  coding              Boolean          @default(false)
  set                 ExcelQuestionSet @relation(fields: [setId], references: [id], onDelete: Cascade)
}

model Interview {
  id            String          @id @default(uuid())
  roomId        String          @unique
  accessCode    String          @unique
  jobTitle      String?
  recordId      String
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  record        SkillRecord     @relation(fields: [recordId], references: [id], onDelete: Cascade)
  interviewData InterviewData[]

  @@index([recordId])
  @@index([accessCode])
}

model InterviewData {
  id              String    @id @default(uuid())
  interviewId     String
  transcript      String
  startTime       DateTime
  endTime         DateTime?
  duration        Int
  analysis        Json?
  aiEvaluation    Json?
  questionAnswers Json?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  candidateName   String?
  feedback        Json?
  proctoring      Json?
  videoUrl        String?
  resumeUrl       String?
  resumeText      String?
  interview       Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)

  @@index([interviewId])
}

enum SkillLevel {
  BEGINNER
  INTERMEDIATE
  PROFESSIONAL
  EXPERT
}

enum Requirement {
  MANDATORY
  OPTIONAL
}

enum LikeStatus {
  LIKED
  DISLIKED
  NONE
}

enum SkillCategory {
  TECHNICAL
  FUNCTIONAL
  BEHAVIORAL
  COGNITIVE
}
```

## Workflow & Data Flow

### Complete Interview Flow Sequence

#### 1. Interview Setup Phase
```mermaid
graph TD
    A[Admin Creates Job Record] --> B[AI Generates Questions]
    B --> C[Save to SkillRecord]
    C --> D[Admin Creates Interview Session]
    D --> E[System Generates Room ID]
    E --> F[System Generates 6-char Access Code]
    F --> G[Save Interview to Database]
    G --> H[Share Access Code with Candidate]
```

#### 2. Candidate Connection Phase
```mermaid
graph TD
    A[Candidate Enters Access Code] --> B[Frontend Validates Code]
    B --> C[API Fetches Interview Details]
    C --> D[Generate LiveKit JWT Token]
    D --> E[Return Connection Details]
    E --> F[Frontend Connects to LiveKit]
    F --> G[Enable Microphone]
    G --> H[Start Screen Recording]
    H --> I[Initialize Proctoring]
```

#### 3. Agent Initialization Phase
```mermaid
graph TD
    A[LiveKit Detects Participant] --> B[Python Agent Receives Metadata]
    B --> C[Extract Interview Configuration]
    C --> D[Fetch Questions from Database]
    D --> E[Build Interview Instructions]
    E --> F[Initialize AI Components]
    F --> G[Start Interview Session]
```

#### 4. Interview Execution Loop
```mermaid
graph TD
    A[Agent Says Introduction] --> B[Wait for Candidate Response]
    B --> C[Process Audio with VAD]
    C --> D[Convert Speech to Text]
    D --> E[LLM Processes Response]
    E --> F[Generate Next Question/Response]
    F --> G[Convert Text to Speech]
    G --> H[Play Audio to Candidate]
    H --> I{More Questions?}
    I -->|Yes| B
    I -->|No| J[End Interview]
```

#### 5. Data Processing & Storage
```mermaid
graph TD
    A[Collect Transcript Data] --> B[Extract Q&A Pairs]
    B --> C[Calculate Metrics]
    C --> D[Save to InterviewData]
    D --> E[Upload Recording]
    E --> F[Generate AI Evaluation]
    F --> G[Calculate Proctoring Score]
    G --> H[Store Final Results]
```

## Key Features & Implementation Details

### 1. Adaptive Interview System

#### Time Management Algorithm
```python
# Lines 126-144 in agent.py: Timing plan construction
if self.template_skills_info:
    skills_total = len(self.template_skills_info)
    try:
        per_skill_time = max(1, round(self.total_duration_minutes / max(1, skills_total)))
    except Exception:
        per_skill_time = 5
    lines = [
        f"- Overall duration: ~{self.total_duration_minutes} minutes",
        f"- Skills: {skills_total} (approx {per_skill_time} min/skill)",
        "- Follow-ups: at most 1-2 per question, 6 total",
    ]
    for skill in self.template_skills_info:
        nq = max(1, int(skill.get("num_questions", 1)))
        per_q_time = max(1, round(per_skill_time / nq))
        lines.append(f"  • {skill.get('name', 'Skill')}: {nq} questions (~{per_q_time} min/question)")
    timing_plan_summary = "\n".join(lines)
```

#### Adaptive Flow Control
```python
# Lines 287-291 in agent.py: Adaptive interview flow
ADAPTIVE INTERVIEW FLOW:
- Be time-aware. In approximately the first 5 minutes from the start time, if the candidate is clearly under-qualified (roughly below 30% proficiency across the first two core topics you cover) or clearly over-qualified, you may propose shortening the interview. Say: "Based on what we've covered so far, would you like to continue with the full interview, or would you prefer we wrap up early?"
- If the candidate chooses to end early or asks to shorten at any time, confirm politely and move to the closing.
- If continuing, keep the flow efficient and focused on the remaining core questions.
```

### 2. Multi-Mode Support

#### Practice Mode
- Easy, predefined questions
- No recording
- Warm-up environment
- Immediate transition to real interview

#### Regular Mode
- Full technical assessment
- Dynamic questions from database
- Complete recording and metrics
- AI evaluation

#### Proctored Mode
- Webcam face detection
- Tab switch monitoring
- Clipboard tracking
- Network disconnect tracking

### 3. Real-Time Features

#### Voice Activity Detection (VAD)
```python
# Lines 21-34 in audio.py: VAD Configuration
def get_vad() -> silero.VAD:
    """Return a Silero VAD tuned for interview pacing.

    Uses longer minimum silence to allow thinking pauses and a higher
    speech threshold to avoid background-noise barge-in while the agent speaks.
    """
    # Falls back to library defaults if parameters are unsupported
    try:
        return silero.VAD.load(
            # Require longer continuous speech to consider it a user utterance
            min_speech_duration=0.6,
            # Keep generous silence for natural thinking pauses
            min_silence_duration=1.2,
            # Make VAD less sensitive to background noise
            threshold=0.8,
        )
    except Exception:
        return silero.VAD.load()
```

#### Turn Detection System
```python
# Lines 332-355 in agent.py: Turn detection configuration
turn_detection_impl = None
td_mode = os.getenv("TURN_DETECTION", "multimodal").lower().strip()

if td_mode in ("multimodal", "multi"):
    if MultimodalTurnDetector is not None:
        try:
            turn_detection_impl = MultimodalTurnDetector()
        except Exception:
            turn_detection_impl = None
    # If multimodal is requested but unavailable, try basic as a fallback
    if turn_detection_impl is None and BasicTurnDetector is not None:
        try:
            turn_detection_impl = BasicTurnDetector()
        except Exception:
            turn_detection_impl = None
elif td_mode == "basic":
    if BasicTurnDetector is not None:
        try:
            turn_detection_impl = BasicTurnDetector()
        except Exception:
            turn_detection_impl = None
elif td_mode in ("none", "off", "disable"):
    turn_detection_impl = None
```

## API Endpoints - Complete Reference

### 1. Connection Details Endpoint
**Path**: `/api/connection-details`
**Methods**: GET, POST

#### GET Request
```typescript
// Query Parameters
{
  name: string;           // Candidate name
  skillLevel?: string;    // Skill level (junior/mid/senior)
  role?: string;          // Job role
  accessCode: string;     // 6-character access code
  practice?: string;      // "true" for practice mode
}
```

#### POST Request
```typescript
// Request Body
{
  name: string;
  accessCode: string;
  practice?: boolean;
  resumeText?: string;    // Extracted resume text for personalization
}
```

#### Response
```typescript
interface ConnectionDetails {
  serverUrl: string;        // LiveKit server URL
  participantToken: string; // JWT token for room access
  roomName: string;         // Unique room identifier
  participantName: string;  // Candidate name
  demoMode?: boolean;       // Demo mode flag
  practiceMode?: boolean;   // Practice mode flag
  interviewId?: string;     // Database interview ID
  roomId?: string;          // LiveKit room ID
}
```

### 2. Create Interview Endpoint
**Path**: `/api/create-interview`
**Method**: POST

```typescript
// Request
{
  recordId: string;  // SkillRecord ID from database
}

// Response
{
  id: string;        // Interview ID
  roomId: string;    // LiveKit room ID
  accessCode: string; // 6-character access code
  jobTitle: string;  // Position title
  createdAt: string; // ISO timestamp
}
```

### 3. Interview Data Endpoint
**Path**: `/api/interview-data`
**Methods**: GET, POST

```typescript
// POST Request - Save/Update
{
  interviewId: string;
  transcript: string;      // JSON stringified transcript
  startTime: string;       // ISO timestamp
  endTime?: string;        // ISO timestamp
  duration: number;        // Duration in minutes
  candidateName?: string;
  analysis?: object;
  questionAnswers?: object[];
  proctoring?: object;
  videoUrl?: string;
  resumeUrl?: string;
  resumeText?: string;
  updateIfExists?: boolean;
}

// GET Response - Retrieve
{
  id: string;
  interviewId: string;
  transcript: string;
  startTime: DateTime;
  endTime?: DateTime;
  duration: number;
  candidateName?: string;
  analysis?: object;
  aiEvaluation?: object;
  questionAnswers?: object[];
  feedback?: object;
  proctoring?: object;
  videoUrl?: string;
}
```

### 4. Resume Questions Generation
**Path**: `/api/records/:recordId/resume-questions`
**Method**: POST

```typescript
// Request
{
  resumeText: string;  // Extracted text from resume PDF
  count: number;       // Number of questions to generate (default: 4)
}

// Response
{
  created: number;     // Number of questions created
  questions: Array<{
    id: string;
    content: string;   // Question JSON with metadata
    skillId: string;
    source: "resume";
  }>;
}
```

### 5. Interview Feedback Generation
**Path**: `/api/interview-feedback`
**Method**: POST

```typescript
// Request
{
  interviewDataId: string;
  practiceMode?: boolean;
}

// Response
{
  feedback: {
    overallScore: number;        // 0-100
    technicalAccuracy: number;   // 0-100
    communicationSkills: number; // 0-100
    problemSolving: number;       // 0-100
    strengths: string[];
    areasForImprovement: string[];
    recommendations: string[];
    detailedAnalysis: object;
  }
}
```

### 6. Proctoring Data
**Path**: `/api/proctoring`
**Method**: POST

```typescript
// Request
{
  interviewId: string;
  interviewDataId: string;
  candidateName?: string;
  startedAt: string;
  endedAt: string;
  events: Array<{
    type: string;
    ts: string;
    description?: string;
    meta?: any;
  }>;
  scores: {
    face_presence: object;
    attention: object;
    device_integrity: object;
    clipboard: object;
    network: object;
    automation_hints: object;
    totalScore: number;
  };
}
```

## Real-time Communication - LiveKit Integration

### LiveKit Configuration

#### Server Setup
```typescript
// Environment Variables
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=APIxxxxxxxxxxxxx
LIVEKIT_API_SECRET=secretxxxxxxxxxxxxx
```

#### Token Generation
```typescript
// Lines 282-294 in connection-details/route.ts
function createParticipantToken(userInfo: AccessTokenOptions, roomName: string) {
  const at = new AccessToken(API_KEY, API_SECRET, userInfo);
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
}
```

#### Room Connection
```typescript
// Lines 651-655 in interview/page.tsx
// Connect to LiveKit room
await room.connect(
  connectionDetails.serverUrl,
  connectionDetails.participantToken
);
```

### Audio Pipeline

#### Input Processing
1. **Microphone Capture**: Browser getUserMedia API
2. **Noise Cancellation**: LiveKit BVC (Background Voice Cancellation)
3. **VAD Processing**: Silero VAD with tuned parameters
4. **STT Conversion**: AssemblyAI with EOU detection

#### Output Processing
1. **LLM Response**: GPT-4.1 generates text
2. **Pronunciation Adjustment**: Technical term corrections
3. **TTS Conversion**: Cartesia sonic-2 model
4. **Audio Playback**: LiveKit audio track

## Security & Performance

### Security Measures

#### Access Control
- **6-character alphanumeric access codes**
- **JWT tokens with 15-minute TTL**
- **Room isolation per interview**
- **Participant metadata validation**

#### Data Protection
- **End-to-end encryption for WebRTC**
- **Parameterized database queries**
- **Input validation and sanitization**
- **Secure file upload with type checking**

#### Proctoring Security
- **Comprehensive event logging**
- **Face detection monitoring**
- **Tab switch detection**
- **Clipboard activity tracking**
- **Network disconnect monitoring**

### Performance Optimizations

#### Frontend Optimizations
```typescript
// IndexedDB for resilient recording storage
// Chunked recording (5-second intervals)
// Lazy component loading
// Debounced API calls
// Memoized computations
```

#### Backend Optimizations
```python
# Connection pooling for database
# Template caching for repeated access
# Async/await throughout
# Prewarmed audio components
# Stream processing for audio/video
```

#### AI Optimizations
- **Conservative EOU thresholds** to prevent false interruptions
- **Tuned VAD parameters** for interview context
- **Token-efficient prompts** for cost optimization
- **Cached pronunciation mappings** for TTS

## Deployment & Environment Setup

### Required Environment Variables

#### Frontend (.env.local)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# LiveKit
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=APIxxxxxxxxxxxxx
LIVEKIT_API_SECRET=secretxxxxxxxxxxxxx

# Optional
NEXT_PUBLIC_CONN_DETAILS_ENDPOINT=/api/connection-details
```

#### Backend (.env.local)
```bash
# AI Services
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
ASSEMBLYAI_API_KEY=xxxxxxxxxxxxx
CARTESIA_API_KEY=xxxxxxxxxxxxx

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# LiveKit
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=APIxxxxxxxxxxxxx
LIVEKIT_API_SECRET=secretxxxxxxxxxxxxx

# Optional Configuration
TURN_DETECTION=multimodal  # multimodal, basic, or none
STT_BACKEND=assemblyai     # assemblyai or deepgram
SESSION_STT_FROM_AUDIO=false # Use prewarmed STT
```

### Deployment Steps

#### 1. Database Setup
```bash
# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

#### 2. Frontend Deployment
```bash
# Install dependencies
npm install

# Build production bundle
npm run build

# Start production server
npm start
```

#### 3. Backend Deployment
```bash
# Install Python dependencies
pip install -r requirements.txt

# Generate Prisma Python client
prisma generate

# Start agent worker
python agent.py
```

### Scaling Considerations

#### Horizontal Scaling
- **Multiple agent instances** with LiveKit load balancing
- **Database connection pooling** for concurrent access
- **CDN for static assets** to reduce server load
- **Queue-based processing** for heavy operations

#### Monitoring
- **Metrics collection** for all AI components
- **Error tracking** with detailed logging
- **Performance monitoring** for latency tracking
- **Usage analytics** for capacity planning

## Troubleshooting Guide

### Common Issues

#### 1. Connection Issues
```typescript
// Check LiveKit server status
// Verify JWT token generation
// Confirm network connectivity
// Check CORS configuration
```

#### 2. Audio Issues
```python
# Verify microphone permissions
# Check VAD sensitivity settings
# Confirm STT API keys
# Test TTS pronunciation
```

#### 3. Recording Issues
```typescript
// Check IndexedDB storage quota
// Verify screen capture permissions
// Confirm audio mixing setup
// Test upload endpoint
```

#### 4. Database Issues
```bash
# Check connection string
# Verify Prisma migrations
# Confirm database permissions
# Test query performance
```

## Conclusion

This comprehensive documentation covers the complete implementation of the Interview Platform, including all code snippets, configurations, and architectural decisions. The platform represents a sophisticated integration of modern web technologies, AI services, and real-time communication protocols to deliver an automated, scalable, and intelligent interview experience.

The system is designed for:
- **Scalability**: Horizontal scaling with load balancing
- **Reliability**: Resilient recording, error recovery
- **Security**: Multi-layer security measures
- **Performance**: Optimized at every layer
- **Extensibility**: Modular architecture for future enhancements

For further assistance or contribution, please refer to the repository documentation or contact the development team.