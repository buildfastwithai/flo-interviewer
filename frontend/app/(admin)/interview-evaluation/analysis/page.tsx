"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  AlertCircle,
  Star,
  TrendingUp,
  Brain,
  MessageSquare,
  Download,
  FileText,
  User,
  Calendar,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import {
  SkillAssessment,
  QuestionAnswer,
  InterviewInsights,
  AnalysisResponse,
} from "@/components/interview-analysis";
import { generateInterviewPDF } from "@/components/interview-analysis-pdf";

// NEW: Extended response type to include enhanced evaluation fields (mock-enabled)
interface ExtendedAnalysisResponse extends AnalysisResponse {
  evaluation_overview?: {
    overall_weighted_score: number;
    overall_recommendation: "Select" | "Review" | "Reject";
    confidence_score: number;
    proctoring_score: number;
  };
  subjective_rubric?: {
    criteria: Array<{
      name: string;
      weight: number;
      score_out_of_5: number;
      weighted_score: number;
      evidence?: string;
    }>;
    total_score_out_of_5: number;
    total_percentage: number;
  };
  objective_scores?: {
    mcq: { total: number; correct: number; score: number };
    coding: {
      tests_passed: number;
      tests_total: number;
      complexity_score: number;
      score: number;
    };
    overall_score: number;
  };
  weighted_skill_scores?: Array<{
    skill: string;
    score: number;
    weight: number;
    weighted_score: number;
  }>;
  recruiter_settings?: {
    skill_weights: Record<string, number>;
    notes?: string;
  };
  key_moments?: Array<{
    type: "critical_skill" | "project_example" | "struggle";
    title: string;
    excerpt: string;
    related_skill?: string;
    timestamp?: string | null;
    qa_index?: number;
    score?: number;
  }>;
  proctoring_analysis?: {
    summary: {
      total_events: number;
      face_presence_percent: number;
      focus_loss_events: number;
      hidden_ms: number;
      clipboard_copies: number;
      suspicious_count: number;
    };
    suspicious_incidents: Array<{
      ts: string;
      type: string;
      description?: string;
      reason: string;
      severity: "high" | "medium" | "low";
      related_question?: { text: string; timestamp?: string; index?: number } | null;
    }>;
    overall_risk_score: number;
    notes?: string[];
  };
}

// Create a client component to handle search params
function AnalysisContent() {
  const searchParams = useSearchParams();
  const interviewId = searchParams.get("id");
  const analysisId = searchParams.get("analysisId");

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [interviewData, setInterviewData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] =
    useState<ExtendedAnalysisResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  // NEW: Local UI state for recruiter weight adjustments and feedback (mock only)
  const [skillWeights, setSkillWeights] = useState<Record<
    string,
    number
  > | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [savingFeedback, setSavingFeedback] = useState(false);

  useEffect(() => {
    if (analysisResult?.recruiter_settings?.skill_weights) {
      setSkillWeights(analysisResult.recruiter_settings.skill_weights);
    } else if (analysisResult?.skill_assessments) {
      // Initialize uniform weights if not provided
      const uniform = Object.fromEntries(
        analysisResult.skill_assessments.map((sa) => [
          sa.skill,
          Number((1 / analysisResult.skill_assessments!.length).toFixed(4)),
        ])
      );
      setSkillWeights(uniform);
    }
  }, [analysisResult]);

  // Initialize recruiter feedback inputs from saved analysis
  useEffect(() => {
    try {
      const rf: any = (analysisResult as any)?.recruiter_feedback;
      if (rf) {
        if (typeof rf.rating === "number") setFeedbackRating(rf.rating);
        if (typeof rf.comment === "string") setFeedbackText(rf.comment);
      }
    } catch {}
  }, [analysisResult]);

  // NEW: Helpers for new evaluation tab
  const computeWeightedSkills = () => {
    if (!analysisResult?.skill_assessments || !skillWeights)
      return [] as Array<{
        skill: string;
        score: number;
        weight: number;
        weighted: number;
      }>;
    const sum = Object.values(skillWeights).reduce((s, v) => s + v, 0) || 1;
    return analysisResult.skill_assessments.map((sa) => {
      const weight = (skillWeights[sa.skill] ?? 0) / sum;
      const weighted = Number(((sa.confidence_score || 0) * weight).toFixed(2));
      return {
        skill: sa.skill,
        score: sa.confidence_score || 0,
        weight: Number(weight.toFixed(4)),
        weighted,
      };
    });
  };
  const computedWeighted = computeWeightedSkills();
  const computedOverallWeighted = Number(
    computedWeighted.reduce((s, x) => s + x.weighted, 0).toFixed(2)
  );

  useEffect(() => {
    if (!interviewId) {
      setError("No interview ID provided");
      setLoading(false);
      return;
    }

    const fetchInterviewData = async () => {
      try {
        // Kick off concurrent fetches
        const interviewPromise = fetch(`/api/interview-data/${interviewId}`);
        const existingAnalysisPromise = fetch(`/api/interview-data/${interviewId}/analysis`);
        const specificAnalysisPromise = analysisId && analysisId !== "new"
          ? fetch(`/api/interview-analysis/${analysisId}`)
          : null;

        const [interviewRes, existingAnalysisRes, specificAnalysisRes] = await Promise.allSettled([
          interviewPromise,
          existingAnalysisPromise,
          specificAnalysisPromise ?? Promise.resolve(null as any),
        ]);

        // Parse interview data
        let interviewDataRecord: any = null;
        if (interviewRes.status === "fulfilled" && interviewRes.value && interviewRes.value.ok) {
          const result = await interviewRes.value.json();
          interviewDataRecord = result.data;
          if (!interviewDataRecord) {
            throw new Error("No interview data found");
          }
          setInterviewData(interviewDataRecord);
        } else {
          throw new Error("Failed to fetch interview data");
        }

        // Prefer specific analysis if explicitly requested
        if (specificAnalysisRes && specificAnalysisRes.status === "fulfilled" && specificAnalysisRes.value && specificAnalysisRes.value.ok) {
          const analysisData = await specificAnalysisRes.value.json();
          setAnalysisResult(analysisData);
          setLoading(false);
          return;
        }

        // Otherwise, check for existing stored analysis
        if (existingAnalysisRes.status === "fulfilled" && existingAnalysisRes.value && existingAnalysisRes.value.ok) {
          const analysisData = await existingAnalysisRes.value.json();
          console.log("Found existing analysis in database:", analysisData.success);
          if (analysisData.success && analysisData.data) {
            setAnalysisResult(analysisData.data);
            setLoading(false);
            return;
          }
          console.log("No existing analysis found in database");
        } else if (existingAnalysisRes.status === "rejected") {
          console.error("Error fetching existing analysis:", existingAnalysisRes.reason);
        }

        // If we get here, either no analysis exists, analysis ID is 'new', or fetch failed
        console.log("Starting new analysis generation");
        performAnalysis(interviewDataRecord);
      } catch (err) {
        console.error("Error retrieving interview data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    fetchInterviewData();
  }, [interviewId, analysisId]);

  const performAnalysis = async (data: any) => {
    if (!data || !data.transcript) return;

    setAnalyzing(true);
    setProgress(5);
    setProgressStage("Initializing analysis...");
    setError(null);
    setSuccess(null);

    try {
      // Format transcript for analysis
      let transcript = data.transcript;
      try {
        // Parse the JSON transcript and format it for analysis
        const transcriptObj = JSON.parse(transcript);
        transcript = transcriptObj
          .map(
            (entry: any) =>
              `${
                entry.speaker === "interviewer" ? "Interviewer" : "Candidate"
              }: ${entry.text}`
          )
          .join("\n\n");
        console.log("Successfully formatted transcript from JSON");
        setProgress(15);
        setProgressStage("Transcript formatted");
      } catch (e) {
        console.error("Error parsing transcript JSON:", e);
        // If we can't parse as JSON, use as is
        setProgress(15);
        setProgressStage("Using raw transcript");
      }

      // Create form data for analysis
      const formData = new FormData();
      const textBlob = new Blob([transcript], { type: "text/plain" });
      formData.append("file", textBlob, "transcript.txt");
      // Include original transcript JSON (with timestamps) for server-side alignment
      try {
        if (data.transcript) {
          formData.append("transcript_json", data.transcript);
        }
      } catch {}

      // Directly fetch skills from the interview record
      let skillsToAssess = "";

      setProgress(20);
      setProgressStage("Fetching skills to assess...");

      try {
        // Fetch the full interview data with skills
        const interviewResponse = await fetch(
          `/api/interview/${data.interview.id}`
        );
        if (interviewResponse.ok) {
          const interviewData = await interviewResponse.json();
          console.log("Interview data with skills:", interviewData);

          if (
            interviewData.data.record?.skills &&
            interviewData.data.record.skills.length > 0
          ) {
            skillsToAssess = interviewData.data.record.skills
              .map((skill: any) => skill.name)
              .join(", ");
            console.log("Skills extracted from record:", skillsToAssess);
          }
        }
        setProgress(25);
        setProgressStage("Skills retrieved");
      } catch (err) {
        console.error("Error fetching skills:", err);
        setProgress(25);
        setProgressStage("Using default skills");
      }

      // If skills couldn't be fetched, use default
      if (!skillsToAssess) {
        skillsToAssess =
          "Communication, Technical Knowledge, Problem Solving, Collaboration, Leadership";
        console.log("Using default skills");
      }

      // Add other fields
      formData.append("skills_to_assess", skillsToAssess);
      formData.append(
        "job_role",
        data.interview?.jobTitle || "Software Engineer"
      );
      formData.append("company_name", "Your Company");
      // Pass interviewData id for server-side proctoring lookup
      if (interviewId) {
        formData.append("interview_data_id", interviewId);
      }

      // Send request to analysis API
      setProgress(30);
      setProgressStage("Sending data for AI analysis...");

      // Start progress simulation
      const progressInterval = startProgressSimulation();

      // Send request to analysis API
      const response = await fetch("/api/analyze-interview", {
        method: "POST",
        body: formData,
      });

      // Clear the progress simulation when the real response arrives
      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      setProgress(95);
      setProgressStage("Processing results...");

      const result = await response.json();

      setAnalysisResult(result);

      setProgress(98);
      setProgressStage("Saving analysis results to database...");

      // Store analysis result
      try {
        const saveResponse = await fetch(
          `/api/interview-data/${interviewId}/analysis`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysis: result }),
          }
        );

        if (!saveResponse.ok) {
          console.error(
            "Error saving analysis to database:",
            await saveResponse.text()
          );
          throw new Error("Failed to save analysis to database");
        }

        const saveResult = await saveResponse.json();
        console.log("Analysis saved to database:", saveResult);
        setSuccess("Analysis successfully generated and saved to database!");
      } catch (saveError) {
        console.error("Error saving analysis:", saveError);
        // We still continue since the analysis is available in the UI
        // but we should notify the user about the issue
        setError(
          "Analysis completed, but couldn't save to the database. Your results are available but not permanently stored."
        );
      }

      setProgress(100);
      setProgressStage("Analysis complete!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setTimeout(() => {
        setAnalyzing(false);
        setProgress(0);
        setProgressStage("");
      }, 1000); // Keep the 100% progress visible for a moment
    }
  };

  // Function to simulate progress during analysis
  const startProgressSimulation = () => {
    // Define the different stages of analysis with their respective progress ranges
    const stages = [
      { range: [30, 40], message: "Formatting transcript..." },
      { range: [40, 55], message: "Analyzing skills..." },
      { range: [55, 70], message: "Analyzing question-answer pairs..." },
      { range: [70, 85], message: "Generating interview insights..." },
      { range: [85, 95], message: "Creating summary..." },
    ];

    let currentStageIndex = 0;

    return setInterval(() => {
      if (currentStageIndex < stages.length) {
        const stage = stages[currentStageIndex];
        const [min, max] = stage.range;

        // Calculate a new progress value within the current stage's range
        if (progress < min) {
          setProgress(min);
          setProgressStage(stage.message);
        } else if (progress < max) {
          // Slowly increment progress within the stage
          setProgress((prev) => Math.min(prev + 0.5, max));

          // If we've reached the max for this stage, move to the next one
          if (progress >= max - 0.5) {
            currentStageIndex++;
          }
        }
      }
    }, 300); // Update progress every 300ms
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "bg-green-500 hover:bg-green-600";
    if (score >= 80) return "bg-emerald-500 hover:bg-emerald-600";
    if (score >= 70) return "bg-blue-500 hover:bg-blue-600";
    if (score >= 60) return "bg-yellow-500 hover:bg-yellow-600";
    if (score >= 50) return "bg-orange-500 hover:bg-orange-600";
    return "bg-red-500 hover:bg-red-600";
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case "Expert":
        return "bg-green-500";
      case "Advanced":
        return "bg-blue-500";
      case "Intermediate":
        return "bg-yellow-500";
      case "Beginner":
        return "bg-orange-500";
      case "Not Demonstrated":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "Excellent":
        return "text-green-600 bg-green-50 border-green-200";
      case "Good":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "Average":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "Below Average":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "Poor":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-emerald-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  // Best-effort timestamp resolution for key moments using stored transcript JSON
  const resolveMomentTimestamp = (m: { qa_index?: number; title: string }): string | null => {
    try {
      if (!interviewData?.transcript) return null;
      const entries = JSON.parse(interviewData.transcript) as Array<{ speaker: string; text: string; timestamp: string }>;
      const qaText = m.qa_index != null ? analysisResult?.questions_and_answers?.[m.qa_index]?.question : undefined;
      const needleRaw = (qaText || m.title || "").toLowerCase().slice(0, 100);
      const needle = needleRaw.length > 20 ? needleRaw : needleRaw.slice(0, 10);
      if (!needle) return null;
      const found = entries.find(e => e.speaker === 'interviewer' && (e.text || '').toLowerCase().includes(needle));
      return found?.timestamp ? new Date(found.timestamp).toISOString() : null;
    } catch {
      return null;
    }
  };

  // Descriptions for proctoring event types
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
    speaking_while_not_listening: "User spoke while interviewer was not listening",
  };

  // --- Proctoring analysis helpers ---
  type ProctoringEvent = {
    ts: string;
    type: string;
    description?: string;
    meta?: any;
  };
  type TranscriptEntry = { speaker: string; text: string; timestamp: string };

  const getTranscriptEntries = (): TranscriptEntry[] => {
    try {
      const parsed = JSON.parse(interviewData?.transcript || "[]");
      if (Array.isArray(parsed)) return parsed as TranscriptEntry[];
      return [];
    } catch {
      return [];
    }
  };

  const getProctoringData = (): { events: ProctoringEvent[] } | null => {
    try {
      if (!interviewData?.proctoring) return null;
      return typeof interviewData.proctoring === "string"
        ? JSON.parse(interviewData.proctoring)
        : (interviewData.proctoring as any);
    } catch {
      return null;
    }
  };

  const analyzeProctoring = () => {
    const proctoring = getProctoringData();
    const transcript = getTranscriptEntries();
    const events = (proctoring?.events || []) as ProctoringEvent[];
    if (!events.length) {
      return {
        summary: {
          totalEvents: 0,
          faceDetectedRatio: 0,
          focusLoss: 0,
          hiddenMs: 0,
          clipboardCopies: 0,
          suspiciousCount: 0,
        },
        suspicious: [] as any[],
        enrichedEvents: [] as ProctoringEvent[],
      };
    }

    const sorted = [...events].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );

    const faceDetected = sorted.filter((e) => e.type === "face_detected").length;
    const faceNot = sorted.filter((e) => e.type === "face_not_detected").length;
    const blurCount = sorted.filter((e) => e.type === "window_blur").length;
    const hiddenDurations = sorted
      .filter((e) => e.type === "page_hidden_duration" && e.meta?.ms)
      .map((e) => Number(e.meta.ms) || 0);
    const totalHiddenMs = hiddenDurations.reduce((s, v) => s + v, 0);
    const copyEvents = sorted.filter(
      (e) => e.type === "clipboard_copy" || (e.type === "hotkey" && /Ctrl\+C/i.test(e.description || ""))
    );

    const questions = transcript
      .map((t, idx) => ({ ...t, index: idx }))
      .filter((t) => t.speaker === "interviewer");

    const findActiveQuestionForTime = (tsIso: string) => {
      const ts = new Date(tsIso).getTime();
      const prior = [...questions]
        .reverse()
        .find((q) => new Date(q.timestamp).getTime() <= ts);
      if (!prior) return null;
      const nextInterviewer = questions.find(
        (q) => new Date(q.timestamp).getTime() > new Date(prior.timestamp).getTime()
      );
      const endTs = Math.min(
        nextInterviewer
          ? new Date(nextInterviewer.timestamp).getTime()
          : new Date(prior.timestamp).getTime() + 90_000,
        new Date(prior.timestamp).getTime() + 90_000
      );
      const inWindow =
        ts >= new Date(prior.timestamp).getTime() && ts <= endTs;
      return { prior, inWindow };
    };

    const suspicious: Array<{
      event: ProctoringEvent;
      reason: string;
      relatedQuestion?: { text: string; timestamp: string } | null;
      severity: "high" | "medium" | "low";
    }> = [];

    const markSuspicious = (
      event: ProctoringEvent,
      reason: string,
      severity: "high" | "medium" | "low" = "medium"
    ) => {
      const rel = findActiveQuestionForTime(event.ts);
      suspicious.push({
        event,
        reason,
        relatedQuestion: rel?.prior
          ? { text: rel.prior.text, timestamp: rel.prior.timestamp }
          : null,
        severity: rel?.inWindow ? severity : "low",
      });
    };

    for (const e of sorted) {
      if (e.type === "clipboard_copy") {
        markSuspicious(e, "Clipboard copy detected during/near an answer window", "high");
      }
      if (e.type === "hotkey" && /Ctrl\+C/i.test(e.description || "")) {
        markSuspicious(e, "Hotkey copy (Ctrl+C) near active question", "medium");
      }
      if (e.type === "window_blur" || e.type === "page_hidden") {
        markSuspicious(e, "Window lost focus or page hidden during potential answer", "medium");
      }
    }

    const summary = {
      totalEvents: sorted.length,
      faceDetectedRatio: sorted.length
        ? Math.round((faceDetected / Math.max(1, faceDetected + faceNot)) * 100)
        : 0,
      focusLoss: blurCount,
      hiddenMs: totalHiddenMs,
      clipboardCopies: copyEvents.length,
      suspiciousCount: suspicious.length,
    };

    return { summary, suspicious, enrichedEvents: sorted };
  };

  const downloadPDF = (includeTranscript: boolean = false) => {
    if (!analysisResult) return;

    if (includeTranscript) {
      generateInterviewPDF(analysisResult, {
        includeRawData: false,
      });
    } else {
      generateInterviewPDF(analysisResult, {
        includeRawData: false,
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading interview data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href="..">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Interviews
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href="/interview-evaluation">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Interviews
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Analyzing Interview</CardTitle>
            <CardDescription>
              Our AI is analyzing the interview transcript. This may take a few
              minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">{progressStage}</p>
              <span className="text-sm font-medium">
                {Math.round(progress)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href="..">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Interviews
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No Analysis Available</CardTitle>
            <CardDescription>
              The interview analysis could not be found or has not been
              generated yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => interviewData && performAnalysis(interviewData)}
            >
              Generate Analysis Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-6 py-6">
      <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" className="shadow-sm hover:shadow-md">
            <Link href="/interview-evaluation">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1D244F]">
              Interview Analysis
            </h1>
            <p className="text-sm text-[#5B5F79] mt-1">
              {interviewData?.candidateName || "Candidate"}
              {interviewData?.interview?.jobTitle ? ` • ${interviewData.interview.jobTitle}` : ""}
              {interviewData?.startTime ? ` • ${new Date(interviewData.startTime).toLocaleDateString()}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => downloadPDF(false)}
            className="flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button
            variant="default"
            onClick={() => performAnalysis(interviewData)}
            className="flex items-center gap-2 bg-[#f7a828] hover:bg-[#e6991f] text-white border-none shadow-sm hover:shadow-md"
          >
            <FileText className="h-4 w-4" />
            Generate Analysis
          </Button>
        </div>
      </div>

      {success && (
        <Alert className="mt-4 bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && error !== "No interview ID provided" && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: KPI + Video (sticky) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6 h-full self-start">
          <Card className="border bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#1D244F]">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5B5F79]">Recommendation</span>
                <Badge
                  className={
                    analysisResult?.evaluation_overview?.overall_recommendation === "Select"
                      ? "bg-green-600"
                      : analysisResult?.evaluation_overview?.overall_recommendation === "Reject"
                      ? "bg-red-600"
                      : "bg-yellow-600"
                  }
                >
                  {analysisResult?.evaluation_overview?.overall_recommendation || "Review"}
                </Badge>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-[#5B5F79]">Weighted Score</span>
                  <span className="ml-auto text-2xl font-bold text-blue-600">
                    {(analysisResult?.evaluation_overview?.overall_weighted_score ?? computedOverallWeighted).toFixed(0)}
                  </span>
                  <span className="text-sm text-gray-500">/100</span>
                </div>
                <Progress
                  value={analysisResult?.evaluation_overview?.overall_weighted_score ?? computedOverallWeighted}
                  className="mt-2"
                />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-[#5B5F79]">Objective Score</span>
                  <span className="ml-auto text-2xl font-bold text-purple-600">
                    {analysisResult?.objective_scores?.overall_score?.toFixed?.(0) || 0}
                  </span>
                  <span className="text-sm text-gray-500">/100</span>
                </div>
                <Progress value={analysisResult?.objective_scores?.overall_score || 0} className="mt-2" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span>Confidence</span>
                  <span className="font-medium">
                    {analysisResult?.evaluation_overview?.confidence_score || analysisResult?.interview_insights?.confidence_level || 0}
                  </span>
                </div>
                <Progress value={analysisResult?.evaluation_overview?.confidence_score || analysisResult?.interview_insights?.confidence_level || 0} />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span>Proctoring</span>
                  <span className="font-medium">
                    {analysisResult?.proctoring_analysis?.overall_risk_score || 0}
                  </span>
                </div>
                <Progress value={analysisResult?.proctoring_analysis?.overall_risk_score || 0} />
              </div>
            </CardContent>
          </Card>

          {interviewData?.videoUrl && (
            <Card className="border bg-white shadow-sm">
              <CardHeader className="flex flex-col gap-2">
                <CardTitle className="text-[#1D244F]">Interview Recording</CardTitle>
                <Button asChild variant="outline" className="w-max gap-2">
                  <a
                    href={`/api/download?url=${encodeURIComponent(interviewData.videoUrl)}&filename=${encodeURIComponent("interview.mp4")}`}
                    download
                  >
                    <Download className="h-4 w-4" /> Download Video
                  </a>
                </Button>
              </CardHeader>
              <CardContent>
                <video controls src={interviewData.videoUrl} className="w-full rounded-md border" />
              </CardContent>
            </Card>
          )}

          {interviewData?.resumeUrl && (
            <Card className="border bg-white shadow-sm">
              <CardHeader className="flex flex-col gap-2">
                <CardTitle className="text-[#1D244F]">Resume</CardTitle>
              </CardHeader>
            <CardContent>
              <iframe src={interviewData.resumeUrl} className="h-[400px] border-0"></iframe>
            </CardContent>
            </Card>
          )}

        </div>

        {/* Main content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Summary */}
          <Card className="overflow-hidden bg-gradient-to-br from-white to-blue-50/30 border shadow-sm hover:shadow-md transition rounded-xl">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl text-[#1D244F]">
                <Star className="h-6 w-6 text-[#f7a828]" /> Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose max-w-none text-base leading-relaxed text-[#1D244F]">
                <p className="whitespace-pre-wrap">{analysisResult.analysis_summary}</p>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
        

       
          <Tabs defaultValue="skills">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="skills"><Star className="mr-2 h-4 w-4" /> Skills</TabsTrigger>
              <TabsTrigger value="questions"><MessageSquare className="mr-2 h-4 w-4" /> Q&A</TabsTrigger>
              <TabsTrigger value="transcript"><FileText className="mr-2 h-4 w-4" /> Transcript</TabsTrigger>
              <TabsTrigger value="proctoring"><AlertCircle className="mr-2 h-4 w-4" /> Proctoring</TabsTrigger>
              <TabsTrigger value="moments"><Brain className="mr-2 h-4 w-4" /> Moments</TabsTrigger>
            </TabsList>
            <ScrollArea type="always" className="h-[600px] overflow-y-auto">
            <TabsContent value="skills" className="mt-6 space-y-6">
              <Card className="border bg-white shadow-sm hover:shadow-md transition">
                <CardHeader>
                  <CardTitle>Skill-wise Performance & Weights</CardTitle>
                  <CardDescription>Adjust relative importance per skill (not saved)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {analysisResult?.skill_assessments?.map((sa, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-2 rounded-md hover:bg-gray-50/60">
                        <div className="md:col-span-3 text-sm font-medium">{sa.skill}</div>
                        <div className="md:col-span-3 flex items-center gap-2">
                          <Progress value={sa.confidence_score} className="flex-1" />
                          <span className={`text-sm ${getScoreColor(sa.confidence_score)}`}>{sa.confidence_score}%</span>
                        </div>
                        <div className="md:col-span-4 flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={(skillWeights?.[sa.skill] ?? 0) * 100}
                            onChange={(e) => {
                              const next = { ...(skillWeights || {}) } as Record<string, number>;
                              next[sa.skill] = Number(e.target.value) / 100;
                              setSkillWeights(next);
                            }}
                            className="w-full"
                          />
                          <span className="text-xs w-12 text-right text-gray-600">
                            {Math.round(((skillWeights?.[sa.skill] ?? 0) / (Object.values(skillWeights || {}).reduce((s, v) => s + v, 0) || 1)) * 100)}%
                          </span>
                        </div>
                        <div className="md:col-span-2 text-right text-sm">
                          {(computedWeighted.find((c) => c.skill === sa.skill)?.weighted || 0).toFixed(1)} pts
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="text-sm text-gray-600">Overall Weighted Score</div>
                    <div className="text-lg font-semibold">
                      {(analysisResult?.evaluation_overview?.overall_weighted_score ?? computedOverallWeighted).toFixed(1)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="questions" className="mt-6">
              <ScrollArea type="always" className="h-[600px] px-1 overflow-y-auto">
                <div className="space-y-6">
                  {analysisResult.questions_and_answers?.map((qa, index) => (
                    <Card key={index} className="border hover:shadow-md transition-all duration-300">
                      <CardHeader>
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <CardTitle className="text-base leading-relaxed flex items-start gap-2">
                              <MessageSquare className="h-5 w-5 mt-0.5 flex-shrink-0 text-blue-500" />
                              {qa.question}
                            </CardTitle>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge className={getGradeColor(qa.grade)}>{qa.grade}</Badge>
                              <span className={`text-sm font-medium ${getScoreColor(qa.score)}`}>{qa.score}/100</span>
                            </div>
                          </div>
                          <Progress value={qa.score} className="w-full" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-500" /> Answer
                          </h4>
                          <div className="bg-gray-50 p-4 rounded-md text-sm leading-relaxed">{qa.answer}</div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" /> Feedback
                          </h4>
                          <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-md leading-relaxed">{qa.feedback}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="transcript" className="mt-6">
              <Card className="bg-white border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50/30 border-b border-gray-100">
                  <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    Interview Transcript
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Complete conversation record</p>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea type="always" className="h-[600px] p-6 overflow-y-auto">
                    <div className="space-y-4">
                      {(() => {
                        try {
                          const transcriptEntries = JSON.parse(interviewData.transcript);
                          return transcriptEntries.map((entry: any, index: number) => (
                            <div
                              key={index}
                              className={`p-4 rounded-xl transition-all duration-200 hover:shadow-md ${
                                entry.speaker === "interviewer"
                                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400"
                                  : "bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400"
                              }`}
                            >
                              <div className="flex justify-between mb-2">
                                <div className="font-semibold text-sm flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${entry.speaker === "interviewer" ? "bg-blue-100" : "bg-green-100"}`}>
                                    <User className={`h-3.5 w-3.5 ${entry.speaker === "interviewer" ? "text-blue-600" : "text-green-600"}`} />
                                  </div>
                                  {entry.speaker === "interviewer" ? "Interviewer" : "Candidate"}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(entry.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                              <div className="text-gray-700 leading-relaxed">{entry.text}</div>
                            </div>
                          ));
                        } catch (e) {
                          return (
                            <div className="prose max-w-none">
                              <pre className="whitespace-pre-wrap text-sm bg-gradient-to-r from-gray-50 to-white p-6 rounded-xl border border-gray-100">
                                {analysisResult.formatted_transcript}
                              </pre>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proctoring" className="mt-6 space-y-6">
              {(() => {
                const data = analyzeProctoring();
                const proctoring = getProctoringData();
                if (!proctoring) {
                  return (
                    <Alert className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 rounded-xl">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">No proctoring data available for this interview.</AlertDescription>
                    </Alert>
                  );
                }
                return (
                  <>
                    {analysisResult?.proctoring_analysis && (
                      <Card className="bg-white border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-100">
                          <CardTitle className="text-xl font-semibold text-gray-900">AI Proctoring Analysis</CardTitle>
                          <CardDescription className="text-sm text-gray-500 mt-1">Correlates clipboard/focus events with questions to flag potential cheating</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">Overall Risk Score</div>
                            <div className="text-lg font-semibold text-red-600">{analysisResult.proctoring_analysis.overall_risk_score}/100</div>
                          </div>
                          {(analysisResult.proctoring_analysis.suspicious_incidents || []).length > 0 ? (
                            <div className="space-y-3">
                              {(analysisResult.proctoring_analysis.suspicious_incidents || []).map((s, idx) => {
                                const tsValid = s.ts && !Number.isNaN(Date.parse(s.ts));
                                const timeStr = tsValid ? new Date(s.ts as any).toLocaleTimeString() : undefined;
                                return (
                                  <div key={idx} className="border rounded p-3 hover:bg-gray-50/60 text-sm">
                                    <div className="flex items-center justify-between">
                                      <div className="font-medium">{s.reason}</div>
                                      <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        {timeStr || "—"}
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {typeDescriptions[s.type] || s.type.replace(/_/g, " ")}
                                      {s.description ? ` — ${s.description}` : ""}
                                    </div>
                                    {s.related_question && (
                                      <div className="mt-2 text-xs text-gray-600">
                                        {(() => {
                                          const rq = s.related_question as any;
                                          const rqValid = rq?.timestamp && !Number.isNaN(Date.parse(rq.timestamp));
                                          const rqTime = rqValid ? new Date(rq.timestamp).toLocaleTimeString() : undefined;
                                          return (<>{`Related question${typeof rq?.index === 'number' ? ` #${rq.index + 1}` : ''}${rqTime ? ` @ ${rqTime}` : ''}: ${rq?.text}`}</>);
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600">No suspicious incidents detected by AI.</div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <Card className="bg-white border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden lg:col-span-1">
                        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-100">
                          <CardTitle className="text-lg font-semibold text-gray-900">Proctoring Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="flex items-center justify-between"><span>Total Events</span><span className="font-medium">{data.summary.totalEvents}</span></div>
                          <div className="flex items-center justify-between"><span>Face Presence</span><span className="font-medium">{data.summary.faceDetectedRatio}%</span></div>
                          <div className="flex items-center justify-between"><span>Focus Loss</span><span className="font-medium">{data.summary.focusLoss}</span></div>
                          <div className="flex items-center justify-between"><span>Hidden Duration</span><span className="font-medium">{Math.round(data.summary.hiddenMs / 1000)}s</span></div>
                          <div className="flex items-center justify-between"><span>Clipboard Copies</span><span className="font-medium">{data.summary.clipboardCopies}</span></div>
                          <div className="flex items-center justify-between"><span>Suspicious Incidents</span><span className="font-medium">{data.summary.suspiciousCount}</span></div>
                        </CardContent>
                      </Card>
                      <Card className="bg-white border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden lg:col-span-2">
                        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-gray-100">
                          <CardTitle className="text-lg font-semibold text-gray-900">Suspicious Incidents (Heuristic)</CardTitle>
                          <CardDescription className="text-sm text-gray-500 mt-1">Potential cheating based on focus/copy during answer windows</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {data.suspicious.length === 0 ? (
                            <div className="text-sm text-gray-600">No suspicious activity detected.</div>
                          ) : (
                            <div className="space-y-3">
                              {data.suspicious.map((s, idx) => (
                                <div key={idx} className="border rounded p-3 hover:bg-gray-50/60">
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium">{s.reason}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2"><Clock className="h-3 w-3" />{new Date(s.event.ts).toLocaleTimeString()}</div>
                                  </div>
                                  {s.relatedQuestion && (
                                    <div className="mt-2 text-xs text-gray-600">Related question @ {new Date(s.relatedQuestion.timestamp).toLocaleTimeString()}: {s.relatedQuestion.text}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    <Card className="bg-white border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
                        <CardTitle className="text-lg font-semibold text-gray-900">Event Timeline</CardTitle>
                        <CardDescription className="text-sm text-gray-500 mt-1">All proctoring events with timestamps</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea type="always" className="h-[400px] overflow-y-auto p-2  ">
                          <div className="space-y-2">
                            {data.enrichedEvents.map((e, idx) => (
                              <div key={idx} className="flex items-start justify-between gap-4 border rounded p-2">
                                <div className="text-sm">
                                  <div className="font-medium">{typeDescriptions[e.type] || e.type.replace(/_/g, " ")}</div>
                                  <div className="text-gray-600 text-xs">{e.description}</div>
                                  {e.meta?.confidence != null && (<div className="text-gray-500 text-xs mt-1">confidence: {Math.round(e.meta.confidence * 100)}%</div>)}
                                  {e.meta?.text && (<div className="text-gray-500 text-xs mt-1 line-clamp-1">copied: {e.meta.text}</div>)}
                                </div>
                                <div className="text-xs text-gray-500 whitespace-nowrap">{new Date(e.ts).toLocaleTimeString()}</div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
            </TabsContent>

            <TabsContent value="moments" className="mt-6">
              <Card className="border bg-white shadow-sm hover:shadow-md transition overflow-y-auto">
                <CardHeader>
                  <CardTitle>Key Moments</CardTitle>
                  <CardDescription>Important points to review quickly</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
                    {(analysisResult?.key_moments || []).map((m, i) => {
                      const ts = resolveMomentTimestamp(m);
                      return (
                        <Card key={i} className="border hover:shadow-md transition">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <Badge className={m.type === "critical_skill" ? "bg-green-600" : m.type === "struggle" ? "bg-red-600" : "bg-blue-600"}>
                                {m.type.replace("_", " ")}
                              </Badge>
                              {m.score !== undefined && (
                                <span className={`text-xs ${getScoreColor(m.score)}`}>{m.score}</span>
                              )}
                            </div>
                            <CardTitle className="text-base mt-2">{m.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-700 mb-2 leading-relaxed">{m.excerpt}</p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{m.related_skill || "General"}</span>
                              {ts && <span>{new Date(ts).toLocaleTimeString()}</span>}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
          </Tabs>

          {/* Feedback */}
          <Card className="bg-white border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl overflow-y-auto">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-100">
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-amber-600" />
                </div>
                Recruiter Feedback
              </CardTitle>
              <CardDescription className="text-sm text-gray-500 mt-1">Saved into analysis JSON for this interview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/30 rounded-xl">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm font-medium text-gray-700">Your Rating:</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setFeedbackRating(n)}
                        className={`p-2 rounded-lg transition-all duration-200 ${feedbackRating >= n ? "bg-amber-500 text-white shadow-sm" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                      >
                        <Star className="h-5 w-5" fill={feedbackRating >= n ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <textarea
                className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 resize-none"
                rows={4}
                placeholder="Share your thoughts on this AI evaluation..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl px-6 shadow-sm hover:shadow-lg transition-all duration-200"
                  disabled={savingFeedback}
                  onClick={async () => {
                    if (!interviewId) return;
                    setSavingFeedback(true);
                    setError(null);
                    setSuccess(null);
                    try {
                      const res = await fetch(`/api/interview-data/${interviewId}/analysis`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ recruiterFeedback: { rating: feedbackRating, comment: feedbackText } }),
                      });
                      if (!res.ok) {
                        const text = await res.text();
                        throw new Error(text || "Failed to save recruiter feedback");
                      }
                      const saved = await res.json();
                      // Update local analysis result with returned analysis containing recruiter_feedback
                      setAnalysisResult((prev) => ({ ...(prev || {}), ...(saved?.data || {}) } as any));
                      setSuccess("Feedback saved");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to save recruiter feedback");
                    } finally {
                      setSavingFeedback(false);
                    }
                  }}
                >
                  {savingFeedback ? "Saving..." : "Submit Feedback"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Main page component
export default function AnalysisResultPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4">Loading analysis...</p>
          </div>
        </div>
      }
    >
      <AnalysisContent />
    </Suspense>
  );
}
