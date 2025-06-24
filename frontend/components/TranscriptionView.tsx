import useCombinedTranscriptions from "@/hooks/useCombinedTranscriptions";
import * as React from "react";
import { useEffect, useState } from "react";

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
      <div className="h-full flex flex-col gap-2 text-black overflow-y-auto px-4 py-8">
        {combinedTranscriptions.map((segment) => (
          <div
            id={segment.id}
            key={segment.id}
            className={
              segment.role === "assistant"
                ? "p-2 self-start fit-content max-w-[80%] w-full"
                : "bg-gray-800 rounded-md p-2 self-end fit-content text-white max-w-[80%] w-fit"
            }
          >
            {segment.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
