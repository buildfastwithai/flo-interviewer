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
// import { InterviewVAD } from "@/lib/interview-vad"; // Client-side VAD helper for responsive UI
import Webcam from "react-webcam";
import { useFaceDetection } from "@/hooks/useFaceDetectionSimple.js";
import { AlertCircle, UserCheck, Users, Eye, Shield } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";

// Lightweight IndexedDB helpers for resilient recording persistence
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

// Pre-interview briefing content (centralized for easy updates)
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

export default function InterviewPage() {
  const [room] = useState(new Room());
  const [userData, setUserData] = useState<UserFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [interviewData, setInterviewData] = useState<InterviewData | null>(
    null
  );
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const startTimeRef = useRef<string>(new Date().toISOString());
  const [interviewDataId, setInterviewDataId] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  // Local VAD-driven speaking indicator (does not affect agent logic)
  const [isSpeaking, setIsSpeaking] = useState(false);
  // const vadRef = useRef<InterviewVAD | null>(null);
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

  const startWebcamProctoring = useCallback(async () => {
    if (!webcamProctoringEnabled) return;
    // React WebCam will handle getUserMedia; only record intent
    recordProctorEvent(
      "webcam_preview_enabled",
      "Webcam preview enabled via react-webcam"
    );
  }, [webcamProctoringEnabled, recordProctorEvent]);

  // -------- Screen Recording Helpers --------
  const pickSupportedMimeType = () => {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const type of candidates) {
      if ((window as any).MediaRecorder && MediaRecorder.isTypeSupported(type)) {
        console.log("[Recording] Using supported mimeType:", type);
        return type;
      }
    }
    console.warn("[Recording] No preferred mimeType supported; falling back to video/webm");
    return "video/webm";
  };

  const appendRecordingChunk = async (key: string, chunk: Blob) => {
    try {
      const existing = (await idbGet(key)) as StoredRecording | undefined;
      if (existing) {
        console.log(
          "[Recording] Appending chunk",
          { key, newChunkBytes: chunk.size, prevChunks: existing.chunks.length }
        );
        existing.chunks.push(chunk);
        await idbPut(existing);
      } else {
        console.log("[Recording] Creating new recording bucket for key", key);
        await idbPut({ key, chunks: [chunk], status: "recording" });
      }
    } catch (e) {
      console.warn("[Recording] Failed to persist recording chunk", e);
    }
  };

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
        console.log(
          "[Recording] Mixed audio tracks",
          { mixedAudioTracks: destination.stream.getAudioTracks().length }
        );

        // Try to include LiveKit remote audio directly (agent voice)
        try {
          let remoteAudioTracksAdded = 0;
          room.remoteParticipants.forEach((p) => {
            p.audioTrackPublications.forEach((pub: any) => {
              const track: any = pub?.track;
              try {
                const mediaStreamTrack: MediaStreamTrack | undefined = (track?.mediaStreamTrack as MediaStreamTrack) || track?.mediaStream?.getAudioTracks?.()[0];
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

        // Fallback: try to capture audio from existing <audio> elements (RoomAudioRenderer)
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
        console.log(
          "[Recording] Mixed stream ready",
          {
            videoTracks: mixedStream.getVideoTracks().length,
            audioTracks: mixedStream.getAudioTracks().length,
          }
        );

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
        console.log("[Recording] MediaRecorder state:", recorder.state);
      } catch (e) {
        console.warn("[Recording] Failed to start screen recording", e);
      }
    },
    []
  );

  const stopInterviewRecording = useCallback(async () => {
    console.log("[Recording] stopInterviewRecording invoked");
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        console.log("[Recording] Stopping MediaRecorder");
        mediaRecorderRef.current.stop();
      }
    } catch {}
    try {
      console.log("[Recording] Stopping display/mic/mixed tracks");
      displayStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      mixedStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    try {
      console.log("[Recording] Closing AudioContext");
      audioContextRef.current?.close();
    } catch {}
    displayStreamRef.current = null;
    micStreamRef.current = null;
    mixedStreamRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

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
        formData.append("folder", "recordings");

        console.log("[Upload] Posting to /api/upload", { fileName, type: file.type });
        const uploadResp = await fetch("/api/upload", { method: "POST", body: formData });
        console.log("[Upload] Response status", uploadResp.status);
        if (!uploadResp.ok) throw new Error("Upload failed");
        const uploadJson = await uploadResp.json();
        console.log("[Upload] Response json", uploadJson);
        const videoUrl: string | undefined = uploadJson?.file?.url;
        if (!videoUrl) throw new Error("No URL from upload");
        console.log("[Upload] Uploaded URL", videoUrl);

        // Update InterviewData with videoUrl if possible
        try {
          const payload: any = {
            interviewId: rec.interviewId || interviewData?.interviewId,
            startTime: rec.startTime || startTimeRef.current,
            endTime: undefined,
            duration: calculateDuration(rec.startTime || startTimeRef.current),
            analysis: {},
            questionAnswers: [],
            candidateName: rec.candidateName || userData?.name || "",
            videoUrl,
            updateIfExists: true,
          };
          if (rec.interviewDataId || interviewDataId) {
            payload.id = rec.interviewDataId || interviewDataId;
          }
          console.log("[Upload] Updating interview data with videoUrl", {
            interviewId: payload.interviewId,
            id: payload.id,
          });
          const resp = await fetch("/api/interview-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          console.log("[Upload] /api/interview-data status", resp.status);
          if (!resp.ok) throw new Error("Failed to update interview data with videoUrl");
        } catch (e) {
          console.warn("[Upload] Failed to update interview data with videoUrl", e);
        }

        // Mark uploaded and remove stored chunks to free space
        rec.status = "uploaded";
        rec.chunks = [];
        await idbPut(rec);
        console.log("[Upload] Marked recording as uploaded and cleared chunks", { key });
        await idbDelete(key);
        console.log("[Upload] Deleted recording entry from IDB", { key });
      } catch (e) {
        console.warn("[Upload] Deferred upload failed; will retry next load", e);
      }
    },
    [interviewData?.interviewId, interviewDataId, userData]
  );

  const uploadAnyPendingRecordings = useCallback(async () => {
    try {
      const all = await idbGetAll();
      console.log("[Upload] Pending recordings in IDB:", all.map((r) => ({ key: r.key, status: r.status, chunks: r.chunks?.length })));
      for (const rec of all) {
        if (rec.status === "finalized" && rec.key) {
          await uploadRecordingByKey(rec.key);
        }
      }
    } catch {}
  }, [uploadRecordingByKey]);

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

        // Setup client-side VAD based on local microphone track to drive
        // the UI "Listening..." indicator. This does not change backend flow.
        try {
          const micPub = room.localParticipant.audioTrackPublications
            .values()
            .next().value;
          const track: LocalAudioTrack | undefined = micPub?.track as
            | LocalAudioTrack
            | undefined;
          if (track) {
            const mediaStream = new MediaStream([track.mediaStreamTrack]);
            // const vad = new InterviewVAD();
            // await vad.initialize();
            // vad.onSpeechStart = () => setIsSpeaking(true);
            // vad.onSpeechEnd = () => setIsSpeaking(false);
            // await vad.startListening(mediaStream);
            // vadRef.current = vad;
          }
        } catch (e) {
          console.warn("VAD init failed:", e);
        }
        console.log("Microphone enabled");

        // Initialize interview data
        startTimeRef.current = new Date().toISOString();

        // Set interview data
        if (connectionDetails.interviewId && connectionDetails.roomId) {
          setInterviewData({
            interviewId: connectionDetails.interviewId,
            roomId: connectionDetails.roomId,
            startTime: startTimeRef.current,
            transcript: [],
          });

          // Create initial interview data in the database (skip in practice mode)
          if (!connectionDetails.practiceMode) {
            try {
              await createInterviewData({
                interviewId: connectionDetails.interviewId,
                transcript: "[]",
                startTime: startTimeRef.current,
                endTime: null,
                duration: 0,
                analysis: {},
                questionAnswers: [],
                candidateName: formData.name,
                resumeUrl: formData.resumeUrl || undefined,
                resumeText: formData.resumeText || undefined,
              });
              console.log("Created initial interview data");
            } catch (error) {
              console.error("Failed to create initial interview data:", error);
            }
          }
        }

        // Save user data to state
        setUserData(formData);

        // Start lightweight webcam proctoring if enabled
        if (formData.webcamProctoring) {
          startWebcamProctoring();
        }

        // Start screen recording for real interview (not practice)
        try {
          console.log("[Recording] Initiating recording post-join");
          await startInterviewRecording({
            interviewId: connectionDetails.interviewId,
            candidateName: formData.name,
            startTime: startTimeRef.current,
            practiceMode: !!connectionDetails.practiceMode,
          });
        } catch {}
      } catch (error) {
        console.error("Error joining interview:", error);
        let errorMessage = "Failed to join interview. Please try again.";
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        setError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [room, startWebcamProctoring]
  );

  useEffect(() => {
    room.on(RoomEvent.MediaDevicesError, onDeviceFailure);
    const onReconnecting = () =>
      recordProctorEvent("network_reconnecting", "LiveKit is reconnecting");
    const onReconnected = () => {
      recordProctorEvent("network_reconnected", "LiveKit reconnected");
      if (proctoringRef.current.lastDisconnectTs) {
        const durMs = Date.now() - proctoringRef.current.lastDisconnectTs;
        recordProctorEvent(
          "network_disconnect_duration",
          "Computed disconnect duration",
          { ms: durMs }
        );
        proctoringRef.current.lastDisconnectTs = null;
      }
    };
    const onDisconnected = () => {
      recordProctorEvent("network_disconnected", "LiveKit disconnected");
      proctoringRef.current.lastDisconnectTs = Date.now();
    };
    const onMediaDevicesChanged = () =>
      recordProctorEvent("media_devices_changed", "Media devices changed");
    room.on(RoomEvent.Reconnecting, onReconnecting as any);
    room.on(RoomEvent.Reconnected, onReconnected as any);
    room.on(RoomEvent.Disconnected, onDisconnected as any);
    room.on(RoomEvent.MediaDevicesChanged, onMediaDevicesChanged as any);
    return () => {
      room.off(RoomEvent.MediaDevicesError, onDeviceFailure);
      room.off(RoomEvent.Reconnecting, onReconnecting as any);
      room.off(RoomEvent.Reconnected, onReconnected as any);
      room.off(RoomEvent.Disconnected, onDisconnected as any);
      room.off(RoomEvent.MediaDevicesChanged, onMediaDevicesChanged as any);
      // Cleanup VAD if initialized
      // if (vadRef.current) {
      //   try {
      //     vadRef.current.stop();
      //   } catch {}
      //   vadRef.current = null;
      // }
      // Stop webcam proctoring stream if active
      try {
        if (proctoringRef.current.stream) {
          proctoringRef.current.stream.getTracks().forEach((t) => t.stop());
          proctoringRef.current.stream = null;
        }
      } catch {}
    };
  }, [room]);

  // Attempt to upload any pending finalized recordings on load
  useEffect(() => {
    uploadAnyPendingRecordings();
  }, [uploadAnyPendingRecordings]);

  // Ensure recording is gracefully finalized on tab close/refresh
  useEffect(() => {
    const onBeforeUnload = () => {
      console.log("[Recording] beforeunload — attempting to stop recorder");
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Basic page visibility/focus events for proctoring (no DB, just JSON via API)
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

  // Function to create interview data in the database
  const createInterviewData = async (data: any) => {
    try {
      // Process the data to ensure valid dates
      const processedData = {
        ...data,
        // Only include endTime if it's a non-empty string
        endTime:
          data.endTime && data.endTime.trim() !== ""
            ? new Date(data.endTime)
            : undefined, // Set to undefined so Prisma will ignore it
        startTime: new Date(data.startTime),
        updateIfExists: false, // Always create a new record initially
      };

      // Include the updated flag to ensure we always update if an entry exists
      const response = await fetch("/api/interview-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        throw new Error("Failed to create interview data");
      }

      const result = await response.json();
      // Store the ID of the created interview data record for future updates
      if (result?.data?.id) {
        setInterviewDataId(result.data.id);
        // Persist interviewDataId in recording metadata for reliable post-refresh uploads
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

  // Function to update interview data in the database
  const updateInterviewData = async (data: any) => {
    try {
      // Process the data to ensure valid dates
      const processedData = {
        ...data,
        // Only include endTime if it's a non-empty string
        endTime:
          data.endTime && data.endTime.trim() !== ""
            ? new Date(data.endTime)
            : undefined, // Set to undefined so Prisma will ignore it
        startTime: new Date(data.startTime),
        candidateName: userData?.name || data.candidateName, // Always include candidate name
        updateIfExists: interviewDataId ? true : false, // Only update if we have an ID, otherwise create
      };

      // If we have an ID, include it in the request to ensure we update the same record
      if (interviewDataId) {
        processedData.id = interviewDataId;
      }

      const response = await fetch("/api/interview-data", {
        method: "POST", // The API uses POST for both create and update
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        throw new Error("Failed to update interview data");
      }

      const result = await response.json();
      // If we didn't have an ID before and just created a new record, store its ID
      if (!interviewDataId && result?.data?.id) {
        setInterviewDataId(result.data.id);
        // Persist to recording metadata as well
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

  // Handle transcript updates from TranscriptionView
  const handleTranscriptUpdate = useCallback((newTranscriptions: any[]) => {
    setTranscriptions(newTranscriptions);
  }, []);

  // Save transcripts periodically or when disconnecting
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
          candidateName: userData?.name || "", // Always include candidate name
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
    return Math.floor((now - start) / (1000 * 60)); // Minutes
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

  // Handle room disconnect and save final data
  const handleDisconnect = useCallback(async () => {
    if (skipSaveOnDisconnectRef.current) {
      return;
    }
    if (interviewData) {
      const endTime = new Date().toISOString();
      try {
        // Stop and finalize recording first
        try {
          console.log("[Recording] Stopping recording due to disconnect");
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
          candidateName: userData?.name || "", // Always include candidate name
          resumeUrl: userData?.resumeUrl || undefined,
          resumeText: userData?.resumeText || undefined,
        });

        console.log("Successfully saved interview data on disconnect");

        // Ensure recording metadata has interviewDataId for reliable upload
        try {
          const idFromResp = updateResponse?.data?.id;
          if (idFromResp && recordingKeyRef.current) {
            const rec = (await idbGet(recordingKeyRef.current)) as StoredRecording | undefined;
            if (rec) {
              rec.interviewDataId = idFromResp;
              await idbPut(rec);
              console.log("[Recording] Stored interviewDataId in recording metadata", { key: rec.key, id: idFromResp });
            }
          }
        } catch {}

        // Attempt immediate upload; will resume on next load if interrupted
        try {
          if (recordingKeyRef.current) {
            console.log("[Upload] Attempting immediate upload after disconnect");
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
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                interviewDataId: updateResponse.data.id,
                practiceMode: isPracticeMode === true,
              }),
            });

            if (feedbackResponse.ok) {
              const feedbackData = await feedbackResponse.json();
              setFeedback(feedbackData.feedback);
            } else {
              console.error("Failed to generate feedback");
            }
          } catch (feedbackError) {
            console.error("Error generating feedback:", feedbackError);
          } finally {
            setIsFeedbackLoading(false);
          }
        }

        // Persist proctoring events to JSON via API (no DB changes now)
        try {
          if (webcamProctoringEnabled) {
            // Compute simple scores per category
            const events = proctoringRef.current.events;
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
                case "network_disconnected":
                  scores.network.disconnects += 1;
                  break;
                case "media_devices_changed":
                case "webcam_error":
                case "webcam_track_ended":
                  scores.device_integrity.issues += 1;
                  break;
                case "hotkey":
                  scores.automation_hints.hotkeys += 1;
                  break;
                case "window_blur":
                case "window_focus":
                  scores.automation_hints.focusBlurEvents += 1;
                  break;
                case "clipboard_copy":
                  scores.clipboard.copies += 1;
                  break;
                case "clipboard_paste":
                case "clipboard_cut":
                  scores.clipboard.pastes += 1;
                  break;
                // case "speaking_while_not_listening":
                //   scores.speaking_anomalies.count += 1;
                //   break;
              }
            }
            // Deductions (conservative)
            // Face presence deductions
            scores.face_presence.deductions = Math.min(
              25,
              scores.face_presence.noFaceEvents * 1 +
              scores.face_presence.multipleFaceEvents * 2 +
              scores.face_presence.prolongedNoFaceEvents * 3 +
              scores.face_presence.prolongedMultipleFaceEvents * 4
            );
            scores.attention.deductions = Math.min(
              20,
              Math.floor(scores.attention.hiddenMs / 30000) * 3
            );
            scores.network.deductions = Math.min(
              10,
              scores.network.disconnects * 2 +
                Math.floor(scores.network.totalDisconnectMs / 60000)
            );
            scores.device_integrity.deductions = Math.min(
              10,
              scores.device_integrity.issues * 2
            );
            scores.clipboard.deductions = Math.min(
              10,
              scores.clipboard.pastes * 2 +
                Math.max(0, scores.clipboard.copies - 3)
            );
            scores.automation_hints.deductions = Math.min(
              10,
              Math.floor(scores.automation_hints.hotkeys / 5) +
                Math.floor(scores.automation_hints.focusBlurEvents / 20)
            );
            // scores.speaking_anomalies.deductions = Math.min(10, scores.speaking_anomalies.count);
            const deductionSum =
              scores.face_presence.deductions +
              scores.attention.deductions +
              scores.device_integrity.deductions +
              scores.speaking_anomalies.deductions +
              scores.clipboard.deductions +
              scores.network.deductions +
              scores.automation_hints.deductions;
            totalScore = Math.max(0, totalScore - deductionSum);

            const typeDescriptions: Record<string, string> = {
              face_detection_loaded: "Face detection models loaded successfully",
              face_detection_error: "Failed to load face detection models",
              face_detected: "Single face detected in frame",
              face_not_detected: "No face detected in frame",
              multiple_faces_detected: "Multiple faces detected in frame",
              prolonged_no_face: "No face detected for extended period",
              prolonged_multiple_faces: "Multiple faces detected for extended period",
              webcam_started: "Webcam stream started for local preview only",
              webcam_track_ended: "Webcam track ended by system or user",
              webcam_error: "Failure to start or maintain webcam stream",
              page_hidden: "Page moved to background or tab hidden",
              page_visible: "Page returned to foreground",
              page_hidden_duration: "Computed duration while page was hidden",
              window_blur: "Window lost focus",
              window_focus: "Window gained focus",
              clipboard_copy: "User copied selected text",
              clipboard_cut: "User cut selected text",
              clipboard_paste: "User pasted text",
              hotkey: "Detected copy/paste hotkey usage",
              media_devices_changed: "System media devices changed",
              network_disconnected: "LiveKit disconnected",
              network_reconnecting: "LiveKit attempting to reconnect",
              network_reconnected: "LiveKit connection restored",
              network_disconnect_duration: "Computed disconnect duration",
              speaking_while_not_listening:
                "User spoke while interviewer was not listening",
            };

            await fetch("/api/proctoring", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                interviewId: interviewData.interviewId,
                interviewDataId: interviewDataId,
                candidateName: userData?.name || undefined,
                startedAt: startTimeRef.current,
                endedAt: endTime,
                events,
                typeDescriptions,
                scores: { ...scores, totalScore },
                // classification: totalScore >= 80 ? 'Healthy' : totalScore >= 60 ? 'Review' : 'Flagged',
                // NOTE: In future, move to DB: see schema.prisma comment (proctoring Json?)
              }),
            });
          }
        } catch (e) {
          console.warn("Failed to persist proctoring JSON:", e);
        }
      } catch (error) {
        console.error("Failed to save interview data on disconnect:", error);
      }
    }
  }, [interviewData, transcriptions, userData, isPracticeMode]);

  // Set up disconnect handler
  useEffect(() => {
    if (room) {
      const handleRoomDisconnect = () => {
        handleDisconnect();
      };

      room.on(RoomEvent.Disconnected, handleRoomDisconnect);

      return () => {
        room.off(RoomEvent.Disconnected, handleRoomDisconnect);
      };
    }
  }, [room, handleDisconnect]);

  return (
    <div data-lk-theme="default" className="flex h-screen bg-background">
      {!userData ? (
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4">Loading...</p>
              </div>
            </div>
          }
        >
          <UserForm
            onSubmit={onJoinInterview}
            isSubmitting={isSubmitting}
            error={error}
          />
        </Suspense>
      ) : (
        <RoomContext.Provider value={room}>
          <InterviewInterface
            isDemoMode={isDemoMode}
            isPracticeMode={isPracticeMode}
            interviewId={interviewData?.interviewId}
            onTranscriptUpdate={handleTranscriptUpdate}
            candidateName={userData.name}
            webcamProctoringEnabled={webcamProctoringEnabled}
            onProctorEvent={recordProctorEvent}
            proctoringStats={proctoringStats}
            setProctoringStats={setProctoringStats}
            isSpeakingUI={isSpeaking}
            onStartRealInterview={async () => {
              if (!userData) return;
              try {
                // prevent saving practice data on disconnect
                skipSaveOnDisconnectRef.current = true;
                await room.disconnect(true);
              } catch {
              } finally {
                skipSaveOnDisconnectRef.current = false;
              }
              // Start real interview with existing credentials
              await onJoinInterview({
                name: userData.name,
                accessCode: userData.accessCode,
              });
              setIsPracticeMode(false);
              toast.success("Starting real interview");
            }}
            showFeedbackModal={showFeedbackModal}
            setShowFeedbackModal={setShowFeedbackModal}
            feedback={feedback}
            isFeedbackLoading={isFeedbackLoading}
          />
          <RoomAudioRenderer />
        </RoomContext.Provider>
      )}
    </div>
  );
}

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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2663FF]/10 via-transparent to-transparent"></div>
      <Meteors />

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-[#2663FF]/60 rounded-full animate-pulse"></div>
      <div className="absolute top-40 right-20 w-1 h-1 bg-[#1D244F]/60 rounded-full animate-ping"></div>
      <div className="absolute bottom-20 left-20 w-3 h-3 bg-[#f7a828]/40 rounded-full animate-bounce"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10"
      >
        <Card className="w-full overflow-y-auto max-w-lg p-8 border border-[#F7F7FA] shadow-xl bg-gray-50 backdrop-blur-sm rounded-3xl">
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <BoxReveal>
              <div className="space-y-3 text-center">
                <motion.div
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-full border border-[#2663FF]/30 backdrop-blur-sm mx-auto"
                  whileHover={{ scale: 1.05 }}
                >
                  <Sparkles className="w-4 h-4 text-[#2663FF]" />
                  <span className="text-sm font-medium text-[#1D244F]">
                    AI-Powered Interview
                  </span>
                </motion.div>
                <h1 className="text-3xl font-bold text-[#1D244F]">
                  Welcome to Your{" "}
                  <AnimatedGradientText className="bg-gradient-to-r from-[#2663FF] via-[#2663FF] to-[#1D244F] bg-clip-text text-transparent">
                    Interview Session
                  </AnimatedGradientText>
                </h1>
                <p className="text-gray-700">
                  Enter your details to connect with our AI Interviewer
                </p>
              </div>
            </BoxReveal>

            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
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

                <div className="space-y-2">
                  <Label
                    htmlFor="accessCode"
                    className="text-[#1D244F] font-medium"
                  >
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

                {/* Resume Toggle */}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Label htmlFor="useResume" className="text-[#1D244F] font-medium">
                      Upload Resume
                    </Label>
                  </div>
                  <input
                    id="useResume"
                    type="checkbox"
                    className="h-5 w-5 accent-[#2663FF]"
                    checked={useResume}
                    onChange={(e) => setUseResume(e.target.checked)}
                  />
                </div>

                {useResume && (
                  <div className="space-y-2">
                    <Label className="text-[#1D244F] font-medium">Resume (PDF)</Label>
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
                      <div className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Resume parsed. You can start the interview.
                      </div>
                    ) : (
                      <p className="text-xs text-[#5B5F79]">Join Interview will be enabled after resume is parsed.</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor="webcamProctoring"
                      className="text-[#1D244F] font-medium"
                    >
                      Webcam Proctoring
                    </Label>
                    {/* <p className="text-xs text-[#5B5F79]">Optional, privacy-friendly. No images stored.</p> */}
                  </div>
                  <input
                    id="webcamProctoring"
                    type="checkbox"
                    className="h-5 w-5 accent-[#2663FF]"
                    checked={webcamProctoring}
                    onChange={(e) => setWebcamProctoring(e.target.checked)}
                  />
                </div>
              </motion.div>

              {/* Pre-Interview Briefing */}
              {/* <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <ScrollArea className="h-[300px]">
                  <Card className="border-[#F7F7FA] bg-white rounded-2xl p-5">
                    <h3 className="text-lg font-semibold text-[#1D244F] mb-2 text-center">
                      {PRE_INTERVIEW_BRIEFING.title}
                    </h3>
                    <div className="space-y-3 text-sm text-[#5B5F79]">
                      <div>
                        <div className="font-medium text-[#1D244F]">Time</div>
                        <ul className="list-disc pl-5 mt-1">
                          {PRE_INTERVIEW_BRIEFING.time.map((item, idx) => (
                            <li key={`brief-time-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-[#1D244F]">
                          Structure
                        </div>
                        <ul className="list-disc pl-5 mt-1">
                          {PRE_INTERVIEW_BRIEFING.structure.map((item, idx) => (
                            <li key={`brief-structure-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-[#1D244F]">
                          Policies
                        </div>
                        <ul className="list-disc pl-5 mt-1">
                          {PRE_INTERVIEW_BRIEFING.policies.map((item, idx) => (
                            <li key={`brief-policy-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-[#1D244F]">
                          Recommendations
                        </div>
                        <ul className="list-disc pl-5 mt-1">
                          {PRE_INTERVIEW_BRIEFING.recommendations.map(
                            (item, idx) => (
                              <li key={`brief-recommendation-${idx}`}>
                                {item}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  </Card>
                </ScrollArea>
              </motion.div> */}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 text-sm rounded-lg bg-red-50 border border-red-200 text-red-600"
                >
                  {error}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {(() => {
                  const joinDisabled = isSubmitting || !name || !accessCode || (useResume && !resumeText);
                  const baseCls = "group w-full rounded-lg px-8 py-4 text-lg font-medium transition-all duration-300 shadow-lg text-white";
                  const enabledCls = "bg-[#f7a828] hover:bg-[#f7a828]/90 hover:shadow-[#f7a828]/30 transform hover:-translate-y-1";
                  const disabledCls = "bg-[#f7a828]/60 opacity-60 cursor-not-allowed";
                  const label = isSubmitting
                    ? "Connecting..."
                    : useResume
                      ? (resumeText ? "Resume parsed — Start Interview" : "Waiting for resume parsing…")
                      : "Join Interview";
                  return (
                    <button
                      type="submit"
                      className={[baseCls, joinDisabled ? disabledCls : enabledCls].join(" ")}
                      disabled={joinDisabled}
                    >
                      <span className="flex items-center justify-center gap-2">
                        {label}
                        <ArrowRight className="w-5 h-5 transition-transform" />
                      </span>
                    </button>
                  );
                })()}

                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-[#2663FF]/30 text-[#2663FF] hover:bg-[#2663FF]/10"
                    disabled={isSubmitting || !name}
                    onClick={() =>
                      onSubmit({
                        name,
                        accessCode,
                        practice: true,
                        webcamProctoring,
                        useResume,
                        resumeUrl,
                        resumeText,
                      })
                    }
                  >
                    Try Practice Mode
                  </Button>
                </div>
              </motion.div>

              {/* Features Highlights */}
              <motion.div
                className="pt-4 flex justify-center gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <div className="flex items-center gap-2 text-xs text-[#5B5F79]">
                  <Clock className="w-3 h-3 text-[#2663FF]" />
                  <span>24/7 Available</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#5B5F79]">
                  <Zap className="w-3 h-3 text-[#f7a828]" />
                  <span>AI-Powered</span>
                </div>
              </motion.div>
            </form>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}

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
  isSpeakingUI,
  onStartRealInterview,
  showFeedbackModal,
  setShowFeedbackModal,
  feedback,
  isFeedbackLoading,
}: {
  isDemoMode?: boolean;
  isPracticeMode?: boolean;
  interviewId?: string;
  onTranscriptUpdate: (newTranscriptions: any[]) => void;
  candidateName: string;
  webcamProctoringEnabled?: boolean;
  onProctorEvent?: (type: string, description?: string, meta?: any) => void;
  proctoringStats: {
    noFaceCount: number;
    multipleFaceCount: number;
    tabSwitchCount: number;
    copyPasteCount: number;
  };
  setProctoringStats: React.Dispatch<React.SetStateAction<{
    noFaceCount: number;
    multipleFaceCount: number;
    tabSwitchCount: number;
    copyPasteCount: number;
  }>>;
  isSpeakingUI?: boolean;
  onStartRealInterview: () => void | Promise<void>;
  showFeedbackModal: boolean;
  setShowFeedbackModal: (show: boolean) => void;
  feedback: any;
  isFeedbackLoading: boolean;
}) {
  const { state: agentState, audioTrack } = useVoiceAssistant();
  const [speaking, setSpeaking] = useState(false);
  const [silentSeconds, setSilentSeconds] = useState<number>(0);
  const [showSilencePrompt, setShowSilencePrompt] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);
  const transcriptions = useCombinedTranscriptions();
  const lastAnomalyTsRef = useRef<number>(0);
  const webcamRef = useRef<any>(null);

  const isRecording = agentState === "listening";
  const isConnected = agentState !== "disconnected";
  // React WebCam handles its own media binding
  
  // Face detection proctoring
  const faceDetectionStatus = useFaceDetection(webcamRef, {
    enabled: !!(webcamProctoringEnabled && isConnected),
    detectionInterval: 2000,
    onFaceDetected: (count: number) => {
      console.log(`Face detected: ${count}`);
    },
    onNoFaceDetected: () => {
      console.log('No face detected');
      setProctoringStats(prev => ({ ...prev, noFaceCount: prev.noFaceCount + 1 }));
    },
    onMultipleFacesDetected: (count: number) => {
      console.log(`Multiple faces detected: ${count}`);
      setProctoringStats(prev => ({ ...prev, multipleFaceCount: prev.multipleFaceCount + 1 }));
    },
    onProctorEvent,
  });

  // Simple silence timer while agent is listening
  useEffect(() => {
    let interval: any;
    if (agentState === "listening") {
      setSilentSeconds(0);
      setShowSilencePrompt(false);
      interval = setInterval(() => {
        setSilentSeconds((s) => {
          const next = s + 1;
          if (next >= 7) setShowSilencePrompt(true);
          return next;
        });
      }, 1000);
    } else {
      setSilentSeconds(0);
      setShowSilencePrompt(false);
    }
    return () => interval && clearInterval(interval);
  }, [agentState]);

  // Speaking anomaly: candidate speaks while agent not listening
  // NOTE: Temporarily commented out per request
  /*
  useEffect(() => {
    if (!onProctorEvent) return;
    if (isSpeakingUI && agentState !== "listening") {
      const now = Date.now();
      if (now - lastAnomalyTsRef.current > 1000) {
        onProctorEvent("speaking_while_not_listening", "User speech detected while interviewer not listening");
        lastAnomalyTsRef.current = now;
      }
    }
  }, [isSpeakingUI, agentState, onProctorEvent]);
  */

  // Poll question count every 3s while connected
  useEffect(() => {
    let interval: any;
    async function fetchCount() {
      if (!interviewId) return;
      try {
        const res = await fetch(
          `/api/interview/${interviewId}/question-count`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data?.success && typeof data?.data?.count === "number") {
          setQuestionCount(data.data.count);
        }
      } catch (e) {
        // silent
      }
    }
    if (isConnected) {
      fetchCount();
      interval = setInterval(fetchCount, 3000);
    }
    return () => interval && clearInterval(interval);
  }, [interviewId, isConnected]);

  return (
    <>
      {/* Left Sidebar */}
      <div className="w-full max-w-sm bg-gradient-to-b from-[#1D244F] to-[#1D244F]/95 border-r border-[#2663FF]/20 flex flex-col relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#2663FF]/10 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#1D244F] to-transparent z-0"></div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-[#2663FF]/60 rounded-full animate-pulse"></div>
        <div className="absolute bottom-40 right-10 w-1 h-1 bg-[#2663FF]/60 rounded-full animate-ping"></div>

        {/* Demo/Practice Mode Banners */}
        {isDemoMode && (
          <div className="bg-[#f7a828] text-white text-xs text-center p-1 font-medium z-10">
            DEMO MODE - Using LiveKit Cloud
          </div>
        )}
        {isPracticeMode && (
          <div className="bg-[#2663FF] text-white text-xs text-center p-1 font-medium z-10">
            PRACTICE MODE - Trial questions
          </div>
        )}

        {/* Proctoring Stats Panel */}
        {webcamProctoringEnabled && isConnected && (
          <motion.div
            className="p-4 mx-6 mt-4 bg-[#1D244F]/40 backdrop-blur-sm rounded-xl border border-[#2663FF]/20 relative z-10"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[#2663FF]" />
              <span className="text-xs font-medium text-white">Proctoring Active</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between bg-[#1D244F]/60 rounded px-2 py-1">
                <span className="text-[#F7F7FA]/70">No Face</span>
                <span className={`font-medium ${proctoringStats.noFaceCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {proctoringStats.noFaceCount}
                </span>
              </div>
              <div className="flex items-center justify-between bg-[#1D244F]/60 rounded px-2 py-1">
                <span className="text-[#F7F7FA]/70">Multi Face</span>
                <span className={`font-medium ${proctoringStats.multipleFaceCount > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                  {proctoringStats.multipleFaceCount}
                </span>
              </div>
              <div className="flex items-center justify-between bg-[#1D244F]/60 rounded px-2 py-1">
                <span className="text-[#F7F7FA]/70">Tab Switch</span>
                <span className={`font-medium ${proctoringStats.tabSwitchCount > 2 ? 'text-orange-400' : 'text-green-400'}`}>
                  {proctoringStats.tabSwitchCount}
                </span>
              </div>
              <div className="flex items-center justify-between bg-[#1D244F]/60 rounded px-2 py-1">
                <span className="text-[#F7F7FA]/70">Copy/Paste</span>
                <span className={`font-medium ${proctoringStats.copyPasteCount > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                  {proctoringStats.copyPasteCount}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Audio Visualizer */}
        <div className="p-6 relative z-10">
          {webcamProctoringEnabled && (
            <motion.div
              className="mb-4 overflow-hidden rounded-xl border border-[#2663FF]/20 bg-[#1D244F]/60 backdrop-blur-sm z-50"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="relative">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  mirrored
                  videoConstraints={{
                    width: 320,
                    height: 200,
                    frameRate: { ideal: 5, max: 10 },
                  }}
                  className="w-full h-full object-cover"
                  onUserMedia={() =>
                    onProctorEvent?.(
                      "webcam_started",
                      "Webcam stream started via react-webcam"
                    )
                  }
                  onUserMediaError={(e) =>
                    onProctorEvent?.(
                      "webcam_error",
                      "Error starting webcam preview",
                      { message: (e as any)?.message || String(e) }
                    )
                  }
                />
                
                {/* Face Detection Status Overlay */}
                <div className="absolute top-2 right-2">
                  {faceDetectionStatus.isLoading ? (
                    <div className="bg-gray-800/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      Loading...
                    </div>
                  ) : faceDetectionStatus.status === 'no-face' ? (
                    <div className="bg-red-600/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                      <AlertCircle className="w-3 h-3" />
                      No Face
                    </div>
                  ) : faceDetectionStatus.status === 'multiple-faces' ? (
                    <div className="bg-orange-600/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                      <Users className="w-3 h-3" />
                      {faceDetectionStatus.faceCount} Faces
                    </div>
                  ) : faceDetectionStatus.status === 'single-face' ? (
                    <div className="bg-green-600/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      Face OK
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="px-2 py-1 text-[10px] text-[#F7F7FA] bg-[#1D244F]/70 border-t border-[#2663FF]/10 text-center">
                {faceDetectionStatus.status === 'no-face' 
                  ? 'Please position your face in view'
                  : faceDetectionStatus.status === 'multiple-faces'
                  ? 'Multiple people detected - please ensure you\'re alone'
                  : 'Proctoring active'}
              </div>
            </motion.div>
          )}
          {/* <div className="flex items-center gap-2 mb-4"> */}
          <motion.div
            className="flex items-center justify-center gap-2 px-3 py-1 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-full border border-[#2663FF]/30 backdrop-blur-sm text-center"
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4 text-[#2663FF]" />
            <span className="text-sm font-medium text-white text-center">
              Audio Activity
            </span>
          </motion.div>
          {/* </div> */}

          {/* <motion.div 
            className="h-[180px] w-full flex items-center justify-center bg-[#1D244F]/40 backdrop-blur-sm rounded-xl border border-[#2663FF]/10 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <BarVisualizer
              state={agentState}
              barCount={16}
              trackRef={audioTrack}
              color="#2663FF"
              className="w-full h-full"
              options={{
                minHeight: 5,
                maxHeight: 100
              }}
            />
          </motion.div> */}
        </div>

        {/* Controls Section */}
        <div className="flex-1 p-6 flex flex-col justify-center items-center space-y-8 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key="connected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-6"
            >
              {/* Microphone Button */}
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute -inset-4 bg-gradient-to-r from-[#2663FF] to-[#2663FF]/70 opacity-30 blur-md rounded-full animate-pulse"></div>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2663FF] to-[#2663FF]/80 hover:from-[#2663FF] hover:to-[#2663FF]/90 transition-all duration-300 flex items-center justify-center shadow-lg relative">
                  {isRecording ? (
                    <MicOff className="w-10 h-10 text-white" />
                  ) : (
                    <Mic className="w-10 h-10 text-white" />
                  )}

                  {isRecording && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-[#2663FF] animate-ping opacity-20"></span>
                      <span className="absolute inset-0 rounded-full bg-[#2663FF] animate-pulse opacity-40"></span>
                    </>
                  )}
                </div>
              </motion.div>

              <motion.span
                className="text-white text-sm font-medium bg-[#1D244F]/80 px-4 py-1 rounded-full border border-[#2663FF]/20"
                animate={{
                  backgroundColor:
                    isRecording || speaking
                      ? "rgba(38, 99, 255, 0.3)"
                      : "rgba(29, 36, 79, 0.8)",
                }}
                transition={{ duration: 0.3 }}
              >
                {isRecording || speaking ? "Listening..." : "Tap to speak"}
              </motion.span>

              {isRecording && showSilencePrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-[#F7F7FA] bg-[#1D244F]/70 mt-2 px-3 py-1 rounded-full border border-[#2663FF]/20"
                  aria-live="polite"
                >
                  Waiting for your response…
                </motion.div>
              )}

              {/* Voice Assistant Controls */}
              <motion.div
                className="flex items-center space-x-3 pt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {/* <VoiceAssistantControlBar controls={{ leave: false }} /> */}
                <DisconnectButton>
                  <Button
                    className="inline-flex h-10 items-center justify-center rounded-md bg-[#1D244F] px-4 py-2 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-[#2663FF] hover:text-white border border-[#2663FF]/30"
                    onClick={() => {
                      setShowFeedbackModal(true);
                    }}
                  >
                    <X className="w-4 h-4" />
                    <span className="text-white">End Interview</span>
                  </Button>
                </DisconnectButton>
                {isPracticeMode && (
                  <div>
                    <Button
                      className="inline-flex h-10 items-center justify-center rounded-md bg-[#2663FF] px-4 py-2 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-[#2663FF] hover:text-white border border-[#2663FF]/30"
                      onClick={() => {
                        setConfirmStartOpen(true);
                      }}
                    >
                      <span className="text-white">Start Real Interview</span>
                    </Button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div
          className="p-4 border-t border-[#2663FF]/20 relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-center space-x-2 bg-[#1D244F]/60 backdrop-blur-sm rounded-full py-2 px-4 border border-[#2663FF]/10">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-[#2663FF] animate-pulse" : "bg-gray-500"
              }`}
            />
            <span className="text-[#F7F7FA] text-xs font-medium">
              {isConnected
                ? "AI Interviewer Active"
                : "AI Interviewer Inactive"}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Right Chat Area */}
      <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 left-0 h-40 bg-gradient-to-b from-[#F7F7FA]/50 to-transparent z-0"></div>
          <div className="absolute bottom-0 right-0 left-0 h-40 bg-gradient-to-t from-[#F7F7FA]/50 to-transparent z-0"></div>
          <div className="absolute top-10 right-10 w-2 h-2 bg-[#2663FF]/30 rounded-full animate-ping"></div>
          <div className="absolute bottom-20 left-20 w-3 h-3 bg-[#f7a828]/20 rounded-full animate-pulse"></div>
        </div>

        {/* Header */}
        <motion.div
          className="border-b border-[#F7F7FA] p-6 relative z-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <motion.div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#1D244F]">
                  Interview Session
                </h1>
                {isDemoMode && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xs bg-[#f7a828]/10 text-[#f7a828] px-2 py-0.5 rounded-full font-medium border border-[#f7a828]/20"
                  >
                    Demo
                  </motion.span>
                )}
                {isPracticeMode && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xs bg-[#2663FF]/10 text-[#2663FF] px-2 py-0.5 rounded-full font-medium border border-[#2663FF]/20"
                  >
                    Practice
                  </motion.span>
                )}
              </motion.div>
              <p className="text-[#5B5F79] text-sm mt-1">
                AI-powered technical interview with real-time evaluation
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                isConnected
                  ? "bg-[#2663FF]/10 text-[#2663FF] border-[#2663FF]/30 px-3 py-1"
                  : "bg-gray-50 text-gray-700 border-gray-200 px-3 py-1"
              }
            >
              {isConnected ? "Live Session" : "Disconnected"}
            </Badge>
          </div>
        </motion.div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-6 relative z-10">
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* {isConnected && (
              <div className="flex items-center justify-end text-sm text-[#5B5F79]">
                <span className="px-3 py-1 rounded-full bg-[#F7F7FA] border border-[#F0F0F5]">
                  Questions asked: {questionCount}
                </span>
              </div>
            )} */}
            {isConnected ? (
              <TranscriptionView
                interviewId={interviewId}
                onTranscriptUpdate={onTranscriptUpdate}
              />
            ) : (
              <motion.div
                className="flex flex-col items-center justify-center h-[50vh] p-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="w-16 h-16 rounded-full bg-[#F7F7FA] flex items-center justify-center mb-4">
                  <X className="w-6 h-6 text-[#5B5F79]" />
                </div>
                <h3 className="text-xl font-semibold text-[#1D244F] mb-2">
                  Interview Ended
                </h3>
                <p className="text-[#5B5F79] max-w-md">
                  Your interview session has been completed and saved. Please
                  reload the page to start a new interview or view the feedback.
                </p>

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    className="bg-[#2663FF] text-white px-4 py-2 rounded-md hover:bg-[#2663FF]/80"
                    onClick={() => {
                      window.location.reload();
                    }}
                  >
                    Back to Interview Form
                  </Button>
                  <Button
                    className="bg-[#2663FF] text-white px-4 py-2 rounded-md hover:bg-[#2663FF]/80"
                    onClick={() => {
                      setShowFeedbackModal(true);
                    }}
                  >
                    View Feedback
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>

      <NoAgentNotification state={agentState} />

      {/* Confirm Start Real Interview Dialog */}
      <Dialog open={confirmStartOpen} onOpenChange={setConfirmStartOpen}>
        <DialogContent className="bg-white border-[#F7F7FA]">
          <DialogHeader>
            <DialogTitle className="text-[#1D244F]">
              Start Real Interview?
            </DialogTitle>
            <DialogDescription className="text-[#5B5F79]">
              This will end practice mode and begin the real interview for{" "}
              {candidateName}. Your responses will be recorded and evaluated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-[#2663FF]/30 text-[#2663FF] hover:bg-[#2663FF]/10"
              onClick={() => setConfirmStartOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#f7a828] hover:bg-[#f7a828]/90 text-white"
              onClick={async () => {
                setConfirmStartOpen(false);
                await onStartRealInterview?.();
              }}
            >
              Start Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showFeedbackModal && (
        <InterviewFeedback
          candidateName={candidateName}
          feedback={feedback}
          loading={isFeedbackLoading}
          onClose={() => setShowFeedbackModal(false)}
          isOpen={showFeedbackModal}
        />
      )}
    </>
  );
}

function onDeviceFailure(error: Error) {
  console.error(error);
  alert(
    "Error acquiring microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
  );
}
