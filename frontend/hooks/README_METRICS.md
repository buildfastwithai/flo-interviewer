# Metrics Logging System

This system tracks TTS (Text-to-Speech), STT (Speech-to-Text), and LLM (Language Model) response times for each conversation in the interview platform.

## Structure

### Metrics Data Format
```json
{
  "interviews": {
    "interview_id": {
      "conversations": {
        "conversation_1": {
          "tts": 1500,
          "stt": 800,
          "llm": 2000,
          "timestamp": "2024-01-01T00:00:00.000Z"
        }
      },
      "avg_conversation_length": 1,
      "avg_conversation_duration": 4300,
      "avg_conversation_tts": 1500,
      "avg_conversation_stt": 800,
      "avg_conversation_llm": 2000
    }
  },
  "total": 1,
  "success": 1,
  "failed": 0
}
```

## Components

### 1. useMetrics Hook (`useMetrics.ts`)
- Manages reading/writing metrics to `metrics.json`
- Calculates averages for interview sessions
- Tracks total, success, and failed conversation counts

### 2. Metrics API (`/api/metrics`)
- Handles saving metrics data to the file system
- Provides GET endpoint to retrieve current metrics

### 3. Integration with useOpenAIS2SAgent
- Tracks timing for each step of the conversation flow
- Logs metrics when TTS audio playback completes
- Automatically updates conversation IDs for each interaction

## Timing Flow

1. **STT Start**: When user starts speaking
2. **STT End**: When transcription completes
3. **LLM Start**: When generating interviewer response
4. **LLM End**: When response generation completes
5. **TTS Start**: When starting to speak
6. **TTS End**: When audio playback completes (metrics logged here)

## Usage

```typescript
// In your component
const voiceAgent = useOpenAIS2SAgent()
const { logConversationMetrics } = useMetrics()

// Set interview and conversation IDs
voiceAgent.setInterviewAndConversationIds(interviewId, conversationId)

// Metrics are automatically logged when TTS completes
```

## File Locations

- Metrics data: `frontend/hooks/metrics.json`
- Metrics hook: `frontend/hooks/useMetrics.ts`
- Metrics API: `frontend/app/api/metrics/route.ts`
- Integration: `frontend/hooks/useOpenAIS2SAgent.ts`

## Error Handling

- Metrics logging failures don't affect the main interview flow
- All timing operations are wrapped in try-catch blocks
- Console logs provide debugging information 