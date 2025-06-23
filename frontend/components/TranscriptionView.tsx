import useCombinedTranscriptions from "@/hooks/useCombinedTranscriptions";
import * as React from "react";

export default function TranscriptionView() {
  const combinedTranscriptions = useCombinedTranscriptions();
  const bottomRef = React.useRef<HTMLDivElement>(null);
  // scroll to bottom when new transcription is added
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [combinedTranscriptions]);

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
