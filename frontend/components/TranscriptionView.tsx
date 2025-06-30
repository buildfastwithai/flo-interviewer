import useCombinedTranscriptions from "@/hooks/useCombinedTranscriptions";
import * as React from "react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bot } from "lucide-react";

export default function TranscriptionView({ interviewId, onTranscriptUpdate }: { 
  interviewId?: string, 
  onTranscriptUpdate?: (transcriptions: any[]) => void 
}) {
  const combinedTranscriptions = useCombinedTranscriptions();
  const bottomRef = React.useRef<HTMLDivElement>(null);
  
  // Format transcriptions with timestamps
  const [formattedTranscriptions, setFormattedTranscriptions] = useState<any[]>([]);
  
  // scroll to bottom when new transcription is added
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [combinedTranscriptions]);
  
  // Format and store transcriptions with timestamps
  useEffect(() => {
    if (combinedTranscriptions.length > 0) {
      const newFormatted = combinedTranscriptions.map(segment => ({
        id: segment.id,
        timestamp: new Date().toISOString(),
        speaker: segment.role === "assistant" ? "interviewer" : "candidate",
        text: segment.text
      }));
      
      setFormattedTranscriptions(newFormatted);
      
      // Call the parent component's callback with the updated transcriptions
      if (onTranscriptUpdate) {
        onTranscriptUpdate(newFormatted);
      }
    }
  }, [combinedTranscriptions, onTranscriptUpdate]);

  return (
    <div className="relative w-full max-w-[90vw] mx-auto">
      {/* Scrollable content */}
      <div className="h-full flex flex-col gap-4 text-black px-2 py-4">
        <AnimatePresence initial={false}>
          {combinedTranscriptions.map((segment, index) => (
            <motion.div
              id={segment.id}
              key={segment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.3,
                delay: 0.05
              }}
              className={`flex ${segment.role === "assistant" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`flex gap-3 max-w-[85%] ${segment.role === "assistant" ? "flex-row" : "flex-row-reverse"}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  segment.role === "assistant" 
                    ? "bg-[#2663FF]/10 text-[#2663FF] border border-[#2663FF]/20" 
                    : "bg-[#1D244F]/10 text-[#1D244F] border border-[#1D244F]/20"
                }`}>
                  {segment.role === "assistant" ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                
                {/* Message bubble */}
                <div
                  className={`relative py-3 px-4 rounded-2xl ${
                    segment.role === "assistant"
                      ? "bg-[#F7F7FA] text-[#1D244F] border border-[#F7F7FA]/80"
                      : "bg-gradient-to-r from-[#1D244F] to-[#1D244F]/95 text-white"
                  }`}
                >
                  {/* Speaker label */}
                  <div className="text-xs font-medium mb-1 opacity-70">
                    {segment.role === "assistant" ? "AI Interviewer" : "You"}
                  </div>
                  
                  {/* Message text */}
                  <div className="text-sm leading-relaxed">
                    {segment.text}
                  </div>
                  
                  {/* Message tail */}
                  <div
                    className={`absolute top-4 w-2 h-2 ${
                      segment.role === "assistant" 
                        ? "-left-1 bg-[#F7F7FA] border-l border-t border-[#F7F7FA]/80 transform rotate-45" 
                        : "-right-1 bg-[#1D244F] transform rotate-45"
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
