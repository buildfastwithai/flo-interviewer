"use client";

import { useState, useCallback, useEffect, useRef, Suspense, useContext } from "react";
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
import { Meteors } from "@/components/magicui/meteors";
import { BoxReveal } from "@/components/magicui/box-reveal";
import { MagicCard } from "@/components/magicui/magic-card";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { useSearchParams } from "next/navigation";
import InterviewFeedback from "@/components/interview-feedback";
import { InterviewVAD } from "@/lib/interview-vad"; // Client-side VAD helper for responsive UI

interface UserFormData {
  name: string;
  accessCode: string;
  practice?: boolean;
}

interface InterviewData {
  interviewId: string;
  roomId: string;
  startTime: string;
  transcript: any[];
}

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
  const vadRef = useRef<InterviewVAD | null>(null);

  const onJoinInterview = useCallback(
    async (formData: UserFormData) => {
      setIsSubmitting(true);
      setError(null);
      try {
        console.log("Connecting to interview with access code:", formData.accessCode);
        
        // Call API to get LiveKit connection details based on the access code
        const url = new URL(
          process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details",
          window.location.origin
        );

        // Add user info as query parameters
        url.searchParams.set("name", formData.name);
        url.searchParams.set("accessCode", formData.accessCode);
        if (formData.practice) {
          url.searchParams.set("practice", "true");
        }

        console.log("Fetching connection details from:", url.toString());
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to join interview:", errorData);
          throw new Error(errorData.message || errorData.error || "Failed to join interview");
        }
        
        const connectionDetails = await response.json();
        
        if (!connectionDetails.serverUrl || !connectionDetails.participantToken || !connectionDetails.roomName) {
          console.error("Invalid connection details:", connectionDetails);
          throw new Error("Invalid connection details received from server");
        }
        
        // Check if we're in demo or practice mode
        if (connectionDetails.demoMode) {
          console.log("Using demo mode with LiveKit cloud");
          setIsDemoMode(true);
          toast.info("Connected in demo mode. This is for testing purposes only.");
        }
        if (connectionDetails.practiceMode) {
          console.log("Using practice mode");
          setIsPracticeMode(true);
          toast.info("Practice mode: Try a few easy questions before the real interview.");
        }

        console.log("Connecting to LiveKit server:", connectionDetails.serverUrl);
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
          const micPub = room.localParticipant.audioTrackPublications.values().next().value;
          const track: LocalAudioTrack | undefined = micPub?.track as LocalAudioTrack | undefined;
          if (track) {
            const mediaStream = new MediaStream([track.mediaStreamTrack]);
            const vad = new InterviewVAD();
            await vad.initialize();
            vad.onSpeechStart = () => setIsSpeaking(true);
            vad.onSpeechEnd = () => setIsSpeaking(false);
            await vad.startListening(mediaStream);
            vadRef.current = vad;
          }
        } catch (e) {
          console.warn('VAD init failed:', e);
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
            transcript: []
          });
          
          // Create initial interview data in the database
          try {
            await createInterviewData({
              interviewId: connectionDetails.interviewId,
              transcript: "[]",
              startTime: startTimeRef.current,
              endTime: null,
              duration: 0,
              analysis: {},
              questionAnswers: [],
              candidateName: formData.name
            });
            console.log("Created initial interview data");
          } catch (error) {
            console.error("Failed to create initial interview data:", error);
          }
        }
        
        // Save user data to state
        setUserData(formData);
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
    [room]
  );

  useEffect(() => {
    room.on(RoomEvent.MediaDevicesError, onDeviceFailure);
    return () => {
      room.off(RoomEvent.MediaDevicesError, onDeviceFailure);
      // Cleanup VAD if initialized
      if (vadRef.current) {
        try { vadRef.current.stop(); } catch {}
        vadRef.current = null;
      }
    };
  }, [room]);

  // Function to create interview data in the database
  const createInterviewData = async (data: any) => {
    try {
      // Process the data to ensure valid dates
      const processedData = {
        ...data,
        // Only include endTime if it's a non-empty string
        endTime: data.endTime && data.endTime.trim() !== "" 
          ? new Date(data.endTime) 
          : undefined, // Set to undefined so Prisma will ignore it
        startTime: new Date(data.startTime),
        updateIfExists: false // Always create a new record initially
      };

      // Include the updated flag to ensure we always update if an entry exists
      const response = await fetch('/api/interview-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create interview data');
      }
      
      const result = await response.json();
      // Store the ID of the created interview data record for future updates
      if (result?.data?.id) {
        setInterviewDataId(result.data.id);
      }
      
      return result;
    } catch (error) {
      console.error('Error creating interview data:', error);
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
        endTime: data.endTime && data.endTime.trim() !== "" 
          ? new Date(data.endTime) 
          : undefined, // Set to undefined so Prisma will ignore it
        startTime: new Date(data.startTime),
        candidateName: userData?.name || data.candidateName, // Always include candidate name
        updateIfExists: interviewDataId ? true : false // Only update if we have an ID, otherwise create
      };

      // If we have an ID, include it in the request to ensure we update the same record
      if (interviewDataId) {
        processedData.id = interviewDataId;
      }

      const response = await fetch('/api/interview-data', {
        method: 'POST', // The API uses POST for both create and update
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update interview data');
      }
      
      const result = await response.json();
      // If we didn't have an ID before and just created a new record, store its ID
      if (!interviewDataId && result?.data?.id) {
        setInterviewDataId(result.data.id);
      }
      
      return result;
    } catch (error) {
      console.error('Error updating interview data:', error);
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
          candidateName: userData?.name || "" // Always include candidate name
        }).catch(error => {
          console.error('Failed to update transcript:', error);
        });
      }, 30000); // Update every 30 seconds
      
      return () => clearInterval(saveTranscriptInterval);
    }
  }, [interviewData, transcriptions, userData]);
  
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
      
      if (entry.speaker === 'interviewer') {
        // If we have a previous Q&A pair, save it
        if (currentQuestion && currentAnswers.length > 0) {
          qa.push({
            question: currentQuestion,
            answer: currentAnswers.join(' ')
          });
        }
        
        // Start a new Q&A pair
        currentQuestion = entry.text;
        currentAnswers = [];
      } else if (entry.speaker === 'candidate' && currentQuestion) {
        currentAnswers.push(entry.text);
      }
    }
    
    // Add the last Q&A pair if it exists
    if (currentQuestion && currentAnswers.length > 0) {
      qa.push({
        question: currentQuestion,
        answer: currentAnswers.join(' ')
      });
    }
    
    return qa;
  };
  
  // Handle room disconnect and save final data
  const handleDisconnect = useCallback(async () => {
    if (interviewData) {
      const endTime = new Date().toISOString();
      try {
        const updateResponse = await updateInterviewData({
          interviewId: interviewData.interviewId,
          transcript: JSON.stringify(transcriptions),
          startTime: interviewData.startTime,
          endTime,
          duration: calculateDuration(interviewData.startTime),
          analysis: {},
          questionAnswers: extractQuestionAnswers(transcriptions),
          candidateName: userData?.name || "" // Always include candidate name
        });
        
        console.log('Successfully saved interview data on disconnect');
        
        // Generate feedback after saving interview data
        if (updateResponse?.data?.id) {
          setIsFeedbackLoading(true);
          setShowFeedbackModal(true);
          
          try {
            const feedbackResponse = await fetch('/api/interview-feedback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                interviewDataId: updateResponse.data.id
              }),
            });
            
            if (feedbackResponse.ok) {
              const feedbackData = await feedbackResponse.json();
              setFeedback(feedbackData.feedback);
            } else {
              console.error('Failed to generate feedback');
            }
          } catch (feedbackError) {
            console.error('Error generating feedback:', feedbackError);
          } finally {
            setIsFeedbackLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to save interview data on disconnect:', error);
      }
    }
  }, [interviewData, transcriptions, userData]);
  
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
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4">Loading...</p>
            </div>
          </div>
        }>
          <UserForm onSubmit={onJoinInterview} isSubmitting={isSubmitting} error={error} />
        </Suspense>
      ) : (
        <RoomContext.Provider value={room}>
          <InterviewInterface 
            isDemoMode={isDemoMode}
            isPracticeMode={isPracticeMode}
            interviewId={interviewData?.interviewId}
            onTranscriptUpdate={handleTranscriptUpdate}
            candidateName={userData.name}
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
  error 
}: { 
  onSubmit: (data: UserFormData) => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get access code from URL if present
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setAccessCode(codeFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, accessCode });
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
        <Card className="w-full max-w-lg p-8 border border-[#F7F7FA] shadow-xl bg-gray-50 backdrop-blur-sm rounded-3xl">
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
                  Welcome to Your <AnimatedGradientText className="bg-gradient-to-r from-[#2663FF] via-[#2663FF] to-[#1D244F] bg-clip-text text-transparent">
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
                  <Label htmlFor="name" className="text-[#1D244F] font-medium">Your Name</Label>
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
                  <Label htmlFor="accessCode" className="text-[#1D244F] font-medium">Access Code</Label>
                  <Input
                    id="accessCode"
                    placeholder="Enter the interview access code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    required
                    className="border-[#F7F7FA] focus:border-[#2663FF] focus:ring-[#2663FF]/30 rounded-lg h-12"
                  />
                </div>
              </motion.div>
              
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
                <InteractiveHoverButton className="group w-full bg-[#f7a828] hover:bg-[#f7a828]/90 rounded-lg px-8 py-4 text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-[#f7a828]/30 transform hover:-translate-y-1 text-white" disabled={isSubmitting || !name || !accessCode}>
                  <span className="flex items-center justify-center gap-2">
                    {isSubmitting ? "Connecting..." : "Join Interview"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </InteractiveHoverButton>

                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-[#2663FF]/30 text-[#2663FF] hover:bg-[#2663FF]/10"
                    disabled={isSubmitting || !name}
                    onClick={() => onSubmit({ name, accessCode, practice: true })}
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

function InterviewInterface({ isDemoMode = false, isPracticeMode = false, interviewId, onTranscriptUpdate, candidateName, showFeedbackModal, setShowFeedbackModal, feedback, isFeedbackLoading }: { isDemoMode?: boolean, isPracticeMode?: boolean, interviewId?: string, onTranscriptUpdate: (newTranscriptions: any[]) => void, candidateName: string, showFeedbackModal: boolean, setShowFeedbackModal: (show: boolean) => void, feedback: any, isFeedbackLoading: boolean }) {
  const { state: agentState, audioTrack } = useVoiceAssistant();
  const [speaking, setSpeaking] = useState(false);
  const transcriptions = useCombinedTranscriptions();

  const isRecording = agentState === "listening";
  const isConnected = agentState !== "disconnected";

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
        
        {/* Audio Visualizer */}
        <div className="p-6 relative z-10">
          {/* <div className="flex items-center gap-2 mb-4"> */}
            <motion.div
              className="flex items-center justify-center gap-2 px-3 py-1 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-full border border-[#2663FF]/30 backdrop-blur-sm text-center"
              whileHover={{ scale: 1.05 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-4 h-4 text-[#2663FF]" />
              <span className="text-sm font-medium text-white text-center">Audio Activity</span>
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
                  backgroundColor: (isRecording || speaking) ? 'rgba(38, 99, 255, 0.3)' : 'rgba(29, 36, 79, 0.8)'
                }}
                transition={{ duration: 0.3 }}
              >
                {(isRecording || speaking) ? "Listening..." : "Tap to speak"}
              </motion.span>

              {/* Voice Assistant Controls */}
              <motion.div 
                className="flex items-center space-x-3 pt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {/* <VoiceAssistantControlBar controls={{ leave: false }} /> */}
                <DisconnectButton>
                  <Button className="inline-flex h-10 items-center justify-center rounded-md bg-[#1D244F] px-4 py-2 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-[#2663FF] hover:text-white border border-[#2663FF]/30" onClick={() => {
                    setShowFeedbackModal(true);
                  }}>
                    <X className="w-4 h-4" />
                    <span className="text-white">End Interview</span>
                  </Button>
                </DisconnectButton>
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
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-[#2663FF] animate-pulse" : "bg-gray-500"}`}
            />
            <span className="text-[#F7F7FA] text-xs font-medium">
              {isConnected ? "AI Interviewer Active" : "AI Interviewer Inactive"}
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
                <h3 className="text-xl font-semibold text-[#1D244F] mb-2">Interview Ended</h3>
                <p className="text-[#5B5F79] max-w-md">
                  Your interview session has been completed and saved. Please reload the page to start a new interview or view the feedback.
                </p>

                <div className="flex items-center gap-2 mt-4"> 

                <Button className="bg-[#2663FF] text-white px-4 py-2 rounded-md hover:bg-[#2663FF]/80" onClick={() => {
                  window.location.reload();
                }}>
                  Start New Interview
                </Button>
                <Button className="bg-[#2663FF] text-white px-4 py-2 rounded-md hover:bg-[#2663FF]/80" onClick={() => {
                  setShowFeedbackModal(true);
                }}>
                  View Feedback
                </Button>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>

      <NoAgentNotification state={agentState} />

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