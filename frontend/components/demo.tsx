"use client";

import { NoAgentNotification } from "@/components/NoAgentNotification";
import TranscriptionView from "@/components/TranscriptionView";
import UserInfoForm, { UserInfo } from "@/components/UserInfoForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarVisualizer,
  DisconnectButton,
  RoomAudioRenderer,
  RoomContext,
  VoiceAssistantControlBar,
  useVoiceAssistant,
} from "@livekit/components-react";
import { AnimatePresence, motion } from "framer-motion";
import { Room, RoomEvent } from "livekit-client";
import { Mic, MicOff, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ConnectionDetails } from "@/app/api/connection-details/route";

export default function Page() {
  const [room] = useState(new Room());
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const onConnectButtonClicked = useCallback(
    async (userData: UserInfo) => {
      const url = new URL(
        process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details",
        window.location.origin
      );

      // Add user info as query parameters
      url.searchParams.set("name", userData.name);
      url.searchParams.set("skillLevel", userData.skillLevel);
      url.searchParams.set("role", userData.role);
      if (userData.experience) {
        url.searchParams.set("experience", userData.experience);
      }

      const response = await fetch(url.toString());
      const connectionDetailsData: ConnectionDetails = await response.json();

      await room.connect(connectionDetailsData.serverUrl, connectionDetailsData.participantToken);
      await room.localParticipant.setMicrophoneEnabled(true);
      setUserInfo(userData);
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
      {!userInfo ? (
        <UserInfoForm onSubmit={onConnectButtonClicked} />
      ) : (
        <RoomContext.Provider value={room}>
          <AIInterviewInterface onConnectButtonClicked={() => {}} />
          <RoomAudioRenderer />
        </RoomContext.Provider>
      )}
    </div>
  );
}

function AIInterviewInterface(props: { onConnectButtonClicked: () => void }) {
  const { state: agentState, audioTrack } = useVoiceAssistant();

  const isRecording = agentState === "listening";
  const isConnected = agentState !== "disconnected";

  return (
    <>
      {/* Left Sidebar */}
      <div className="w-full max-w-sm bg-slate-900 border-r border-slate-800 flex flex-col">
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
            {!isConnected ? (
              <motion.div
                key="disconnected"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center space-y-4"
              >
                <Button
                  size="lg"
                  onClick={props.onConnectButtonClicked}
                  className="w-20 h-20 rounded-full bg-teal-600 hover:bg-teal-700 transition-all duration-200"
                >
                  <Mic className="w-8 h-8 text-white" />
                </Button>
                <span className="text-white text-sm font-medium">Start Interview</span>
              </motion.div>
            ) : (
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
                  <DisconnectButton className="!bg-transparent !border-none">
                    <Button variant="outline" size="sm" className="">
                      <X className="w-4 h-4" />
                    </Button>
                  </DisconnectButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}
            />
            <span className="text-slate-400 text-xs">
              {isConnected ? "AI Agent Active" : "AI Agent Inactive"}
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
              <h1 className="text-xl font-semibold text-foreground">Interview Practice Session</h1>
              <p className="text-muted-foreground text-sm">AI-powered interview preparation</p>
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
                  Connect to start your interview session and see the conversation here.
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
    "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
  );
}
