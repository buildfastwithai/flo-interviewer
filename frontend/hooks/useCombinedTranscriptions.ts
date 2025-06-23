import { useTrackTranscription, useVoiceAssistant } from "@livekit/components-react";
import { useMemo } from "react";
import useLocalMicTrack from "./useLocalMicTrack";

interface CombinedTranscription {
  id: string;
  text: string;
  role: "assistant" | "user";
  firstReceivedTime: number;
}

export default function useCombinedTranscriptions() {
  const { agentTranscriptions } = useVoiceAssistant();

  const micTrackRef = useLocalMicTrack();
  const { segments: userTranscriptions } = useTrackTranscription(micTrackRef);

  const combinedTranscriptions = useMemo(() => {
    // Combine all transcriptions with role information
    const allTranscriptions = [
      ...agentTranscriptions.map((val) => {
        return { ...val, role: "assistant" as const };
      }),
      ...userTranscriptions.map((val) => {
        return { ...val, role: "user" as const };
      }),
    ].sort((a, b) => a.firstReceivedTime - b.firstReceivedTime);

    // Group consecutive messages from the same speaker
    const groupedTranscriptions: CombinedTranscription[] = [];
    let currentGroup: CombinedTranscription | null = null;

    for (const transcription of allTranscriptions) {
      if (currentGroup && currentGroup.role === transcription.role) {
        // Same speaker, combine the text
        currentGroup.text += " " + transcription.text;
      } else {
        // Different speaker or first message, start new group
        if (currentGroup) {
          groupedTranscriptions.push(currentGroup);
        }
        currentGroup = {
          id: transcription.id,
          text: transcription.text,
          role: transcription.role,
          firstReceivedTime: transcription.firstReceivedTime,
        };
      }
    }

    // Don't forget to add the last group
    if (currentGroup) {
      groupedTranscriptions.push(currentGroup);
    }

    return groupedTranscriptions;
  }, [agentTranscriptions, userTranscriptions]);

  return combinedTranscriptions;
}
