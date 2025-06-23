"use client";

import { useState, useCallback, useEffect } from "react";
import { Room, RoomEvent } from "livekit-client";
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
import { Mic, MicOff, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NoAgentNotification } from "@/components/NoAgentNotification";
import TranscriptionView from "@/components/TranscriptionView";
import useCombinedTranscriptions from "@/hooks/useCombinedTranscriptions";
import type { ConnectionDetails } from "@/app/api/connection-details/route";
import { toast } from "sonner";

interface UserFormData {
  name: string;
  accessCode: string;
}

export default function InterviewPage() {
  const [room] = useState(new Room());
  const [userData, setUserData] = useState<UserFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

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
        
        // Check if we're in demo mode
        if (connectionDetails.demoMode) {
          console.log("Using demo mode with LiveKit cloud");
          setIsDemoMode(true);
          toast.info("Connected in demo mode. This is for testing purposes only.");
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
        console.log("Microphone enabled");
        
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
    };
  }, [room]);

  return (
    <div data-lk-theme="default" className="flex h-screen bg-background">
      {!userData ? (
        <UserForm 
          onSubmit={onJoinInterview} 
          isSubmitting={isSubmitting} 
          error={error} 
        />
      ) : (
        <RoomContext.Provider value={room}>
          <InterviewInterface isDemoMode={isDemoMode} />
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, accessCode });
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md p-6">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Interview Session</h1>
            <p className="text-slate-500">
              Enter your details to join the interview
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accessCode">Access Code</Label>
              <Input
                id="accessCode"
                placeholder="Enter the interview access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                required
              />
            </div>
            
            {error && (
              <div className="p-3 text-sm border rounded bg-red-50 border-red-200 text-red-600">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !name || !accessCode}
            >
              {isSubmitting ? "Connecting..." : "Join Interview"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

function InterviewInterface({ isDemoMode = false }: { isDemoMode?: boolean }) {
  const { state: agentState, audioTrack } = useVoiceAssistant();
  const transcriptions = useCombinedTranscriptions();

  const isRecording = agentState === "listening";
  const isConnected = agentState !== "disconnected";

    return (
    <>
      {/* Left Sidebar */}
      <div className="w-full max-w-sm bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="bg-amber-500 text-amber-900 text-xs text-center p-1 font-medium">
            DEMO MODE - Using LiveKit Cloud
          </div>
        )}
        
        {/* Audio Visualizer */}
        <div className="p-6">
          <h2 className="text-white text-lg font-semibold mb-4">Audio Activity</h2>
          <div className="h-[200px] w-full flex items-center justify-center">
            <BarVisualizer
              state={agentState}
              barCount={5}
              trackRef={audioTrack}
              color="white"
              className="w-full h-full bg-transparent"
              options={{
                minHeight: 24,
                maxHeight: 60,
              }}
            />
          </div>
        </div>

        {/* Controls Section */}
        <div className="flex-1 p-6 flex flex-col justify-center items-center space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key="connected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-4"
            >
              {/* Microphone Button */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-teal-600 hover:bg-teal-700 transition-all duration-200 flex items-center justify-center">
                  {isRecording ? (
                    <MicOff className="w-8 h-8 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>

              <span className="text-white text-sm font-medium">
                {isRecording ? "Listening..." : "Tap to speak"}
              </span>

              {/* Voice Assistant Controls */}
              <div className="flex items-center space-x-2">
                <VoiceAssistantControlBar controls={{ leave: false }} />
                <DisconnectButton>
                  <div className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground">
                    <X className="w-4 h-4" />
                  </div>
                </DisconnectButton>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Status */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}
            />
            <span className="text-slate-400 text-xs">
              {isConnected ? "AI Interviewer Active" : "AI Interviewer Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* Right Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Interview Session {isDemoMode && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Demo</span>}
              </h1>
              <p className="text-muted-foreground text-sm">AI-powered technical interview</p>
            </div>
            <Badge
              variant="outline"
              className={
                isConnected
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-50 text-gray-700 border-gray-200"
              }
            >
              {isConnected ? "Live Session" : "Disconnected"}
            </Badge>
          </div>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {isConnected ? (
              <TranscriptionView />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center">
                  Connection error. Please reload the page and try again.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <NoAgentNotification state={agentState} />
    </>
  );
}

function onDeviceFailure(error: Error) {
  console.error(error);
  alert(
    "Error acquiring microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
    );
}