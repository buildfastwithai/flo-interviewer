import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Vapi from "@vapi-ai/web";

const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || ""; // Replace with your actual public key
const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || ""; // Replace with your actual assistant ID

interface ConversationMessage {
  role: string;
  text: string;
  timestamp: string;
  isFinal: boolean;
}

interface CallAnalysis {
  summary?: string;
  success?: boolean;
  structuredData?: any;
  callId?: string;
}

interface CallStartEvent {
  callId?: string;
  [key: string]: any;
}

const useVapi = () => {
  const router = useRouter();
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [callAnalysis, setCallAnalysis] = useState<CallAnalysis>({});
  const vapiRef = useRef<any>(null);
  const interviewContextRef = useRef<string | null>(null);
  const shouldRedirectRef = useRef<boolean>(false);

  const initializeVapi = useCallback(() => {
    if (!vapiRef.current) {
      const vapiInstance = new Vapi(publicKey);
      vapiRef.current = vapiInstance;

      vapiInstance.on("call-start", (event: any = {}) => {
        setIsSessionActive(true);
        shouldRedirectRef.current = true; // Enable redirection for this call

        // console.log("event", event);
        console.log("vapiRef.current", vapiRef.current);
        // Store callId for later use with analysis
        if (event && event.callId) {
          setCallAnalysis((prev) => ({
            ...prev,
            callId: vapiRef.current.call.callClientId,
          }));
        }

        console.log("call id", vapiRef.current.call.callClientId);

        // If we have interview context, send it to the assistant at the start of the call
        if (interviewContextRef.current) {
          setTimeout(() => {
            vapiInstance.send({
              type: "add-message",
              message: {
                role: "system",
                content: interviewContextRef.current || "",
              },
            });
          }, 500);
        }
      });

      vapiInstance.on("call-end", () => {
        setIsSessionActive(false);
        // Don't reset callAnalysis here as we need it for the feedback page
        setConversation([]); // Reset conversation on call end
        interviewContextRef.current = null; // Reset interview context

        // // Redirect to feedback page if this was an interview call
        // if (shouldRedirectRef.current) {
        //   shouldRedirectRef.current = false;
        //   // Use a small timeout to ensure analysis data is processed
        //   setTimeout(() => {
        //     router.push("/feedback");
        //   }, 1000);
        // }
      });

      vapiInstance.on("volume-level", (volume: number) => {
        setVolumeLevel(volume);
      });

      vapiInstance.on("message", (message: any) => {
        if (message.type === "transcript") {
          setConversation((prev) => {
            const timestamp = new Date().toLocaleTimeString();
            const updatedConversation = [...prev];
            if (message.transcriptType === "final") {
              // Find the partial message to replace it with the final one
              const partialIndex = updatedConversation.findIndex(
                (msg) => msg.role === message.role && !msg.isFinal
              );
              if (partialIndex !== -1) {
                updatedConversation[partialIndex] = {
                  role: message.role,
                  text: message.transcript,
                  timestamp: updatedConversation[partialIndex].timestamp,
                  isFinal: true,
                };
              } else {
                updatedConversation.push({
                  role: message.role,
                  text: message.transcript,
                  timestamp,
                  isFinal: true,
                });
              }
            } else {
              // Add partial message or update the existing one
              const partialIndex = updatedConversation.findIndex(
                (msg) => msg.role === message.role && !msg.isFinal
              );
              if (partialIndex !== -1) {
                updatedConversation[partialIndex] = {
                  ...updatedConversation[partialIndex],
                  text: message.transcript,
                };
              } else {
                updatedConversation.push({
                  role: message.role,
                  text: message.transcript,
                  timestamp,
                  isFinal: false,
                });
              }
            }
            return updatedConversation;
          });
        }

        if (
          message.type === "function-call" &&
          message.functionCall.name === "changeUrl"
        ) {
          const command = message.functionCall.parameters.url.toLowerCase();
          console.log(command);
          // const newUrl = routes[command];
          if (command) {
            window.location.href = command;
          } else {
            console.error("Unknown route:", command);
          }
        }

        // Handle call analysis data
        if (message.type === "analysis") {
          setCallAnalysis((prev) => ({
            ...prev,
            summary: message.analysis?.summary,
            success: message.analysis?.success,
            structuredData: message.analysis?.structuredData,
          }));
        }
      });

      vapiInstance.on("error", (e: Error) => {
        console.error("Vapi error:", e);
      });
    }
  }, [router]);

  useEffect(() => {
    initializeVapi();

    // Cleanup function to end call and dispose Vapi instance
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current = null;
      }
    };
  }, [initializeVapi]);

  const toggleCall = async () => {
    try {
      if (isSessionActive) {
        await vapiRef.current.stop();
      } else {
        // Reset call analysis when starting a new call
        setCallAnalysis({});
        await vapiRef.current.start(assistantId);
      }
    } catch (err) {
      console.error("Error toggling Vapi session:", err);
    }
  };

  const sendMessage = (role: string, content: string) => {
    if (role === "system") {
      // Store system messages in ref for reuse on call start
      interviewContextRef.current = content;
    }

    if (vapiRef.current && isSessionActive) {
      // If call is active, send message immediately
      vapiRef.current.send({
        type: "add-message",
        message: { role, content },
      });
    } else if (role === "system") {
      // If it's a system message and call isn't active yet,
      // we'll send it when the call starts (handled in call-start event)
      console.log("System message stored for next call start");
    } else {
      console.warn("Cannot send message: Vapi session is not active");
    }
  };

  const say = (message: string, endCallAfterSpoken = false) => {
    if (vapiRef.current) {
      vapiRef.current.say(message, endCallAfterSpoken);
    }
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      const newMuteState = !isMuted;
      vapiRef.current.setMuted(newMuteState);
      setIsMuted(newMuteState);
    }
  };

  // Function to fetch call analysis manually if needed
  const fetchCallAnalysis = async (callId?: string) => {
    const id = callId || callAnalysis.callId;
    if (!id) {
      console.error("No call ID available to fetch analysis");
      return;
    }

    try {
      // This would require a backend endpoint that uses Vapi API to fetch call analysis
      // For client-side implementation, you'd need to set up a proxy endpoint
      const response = await fetch(`/api/call-analysis/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCallAnalysis((prev) => ({
          ...prev,
          summary: data.summary,
          success: data.success,
          structuredData: data.structuredData,
        }));
        return data;
      }
    } catch (error) {
      console.error("Error fetching call analysis:", error);
    }
  };

  return {
    volumeLevel,
    isSessionActive,
    conversation,
    toggleCall,
    sendMessage,
    say,
    toggleMute,
    isMuted,
    callAnalysis,
    fetchCallAnalysis,
  };
};

export default useVapi;
