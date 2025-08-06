// useOpenAIS2SAgent.ts
// OpenAI Speech-to-Speech Agent Hook (One-shot STT fallback for browser compatibility)

import { useState, useRef, useCallback, useEffect } from "react";
import { useMetrics, ConversationMetrics } from "./useMetrics";

// Types for transcript and code state (same as original)
interface TranscriptEntry {
  speaker: "interviewer" | "candidate";
  text: string;
  timestamp: string;
  questionNumber?: number;
}

interface CodeEntry {
  code: string;
  language: string;
}

interface InterviewStage {
  stage: "intro" | "questions" | "closing";
  currentQuestionIndex: number;
  followUpCount: number;
  totalFollowUps: number;
  isReady: boolean;
  totalQuestions?: number;
}

const initialCodeState = {
  code: "",
  language: "python",
};

const initialInterviewStage: InterviewStage = {
  stage: "intro",
  currentQuestionIndex: -1,
  followUpCount: 0,
  totalFollowUps: 0,
  isReady: false,
  totalQuestions: 0,
};

export const useOpenAIS2SAgent = () => {
  // State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [codeState, setCodeState] = useState<CodeEntry>(initialCodeState);
  const [selectedVoice, setSelectedVoice] = useState("alloy"); // OpenAI S2S voices: alloy, echo, fable, onyx, nova, shimmer
  const [interviewStage, setInterviewStage] = useState<InterviewStage>(initialInterviewStage);
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  const [candidateName, setCandidateName] = useState<string>("there");

  // Metrics tracking
  const { logConversationMetrics } = useMetrics();
  const [currentInterviewId, setCurrentInterviewId] = useState<string>("");
  const [conversationStartTime, setConversationStartTime] = useState<number>(0);
  
  // STT timing
  const [sttStartTime, setSttStartTime] = useState<number>(0);
  const [sttFirstByteTime, setSttFirstByteTime] = useState<number>(0);
  const [sttFirstTokenTime, setSttFirstTokenTime] = useState<number>(0);
  
  // LLM timing
  const [llmStartTime, setLlmStartTime] = useState<number>(0);
  const [llmFirstByteTime, setLlmFirstByteTime] = useState<number>(0);
  const [llmFirstTokenTime, setLlmFirstTokenTime] = useState<number>(0);
  
  // TTS timing
  const [ttsStartTime, setTtsStartTime] = useState<number>(0);
  const [ttsFirstByteTime, setTtsFirstByteTime] = useState<number>(0);
  const [ttsFirstTokenTime, setTtsFirstTokenTime] = useState<number>(0);

  // Refs for audio and recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Audio level monitoring
  useEffect(() => {
    if (isListening && mediaStreamRef.current) {
      try {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        source.connect(analyserRef.current);

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        const updateAudioLevel = () => {
          if (analyserRef.current && isListening) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setAudioLevel(average);
            requestAnimationFrame(updateAudioLevel);
          }
        };
        updateAudioLevel();
      } catch (error) {
        // ignore
      }
    }
  }, [isListening, mediaStreamRef.current]);

  // --- Start Listening (record mic) ---
  const startListening = useCallback(async () => {
    if (isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" });
        await transcribeWithOpenAI(audioBlob);
      };

      mediaRecorder.start(1000);
      setIsListening(true);
      
      // Start STT timing
      setSttStartTime(Date.now());
    } catch (error) {
      setIsListening(false);
      setAudioLevel(0);
    }
  }, [isListening]);

  // --- Stop Listening (send audio to OpenAI STT) ---
  const stopListening = useCallback(() => {
    if (!isListening || !mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    setIsListening(false);

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  }, [isListening]);

  // --- Transcribe with OpenAI Whisper (via backend) ---
  const transcribeWithOpenAI = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      // Track STT first byte time (when request starts)
      setSttFirstByteTime(Date.now());

      const response = await fetch("/api/openai-stt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to transcribe audio");
      }

      // Track STT first token time (when response starts)
      setSttFirstTokenTime(Date.now());

      const data = await response.json();

      if (data.text && data.text.trim()) {
        let finalTranscript = data.text.trim();

        // Only append code if this is a code submission message
        if (codeState.code && (finalTranscript.toLowerCase().includes("code") || finalTranscript.toLowerCase().includes("submit"))) {
          finalTranscript += `\n\nCode:\n${codeState.code}`;
        }

        setTranscript((prev) => [
          ...prev,
          {
            speaker: "candidate",
            text: finalTranscript,
            timestamp: new Date().toISOString(),
          },
        ]);

        // Calculate STT time
        const sttTime = Date.now() - sttStartTime;
        console.log(`STT time: ${sttTime}ms`);

        // Automatically generate interviewer response
        await generateInterviewerResponse(finalTranscript, sttTime);
      }
    } catch (error) {
      // ignore
    }
  };

  // --- Detect Follow-up Question in Response ---
  const detectFollowUpQuestion = (response: string): boolean => {
    const followUpIndicators = [
      "follow-up",
      "follow up",
      "another question",
      "one more question",
      "could you elaborate",
      "could you explain",
      "can you tell me more",
      "what about",
      "how would you",
      "why did you",
      "when would you",
      "where would you",
      "which approach",
      "what if",
      "suppose that",
      "imagine that",
      "let's say",
      "consider this",
      "think about",
      "reflect on",
      "i'm curious",
      "i'm wondering",
      "tell me more",
      "elaborate on",
      "explain further",
      "give me an example",
      "show me how",
      "demonstrate",
      "walk me through",
      "describe",
      "discuss",
      "analyze",
      "compare",
      "contrast",
      "evaluate",
      "assess",
      "examine",
      "investigate",
      "explore",
      "dive deeper",
      "dig deeper"
    ];
    
    const lowerResponse = response.toLowerCase();
    
    // Check for question marks (interrogative sentences)
    const hasQuestionMark = response.includes('?');
    
    // Check for follow-up indicators
    const hasFollowUpIndicator = followUpIndicators.some(indicator => lowerResponse.includes(indicator));
    
    // Check for interrogative words at the beginning of sentences
    const interrogativeWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who', 'whose', 'whom'];
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const hasInterrogativeStart = sentences.some(sentence => {
      const trimmed = sentence.trim().toLowerCase();
      return interrogativeWords.some(word => trimmed.startsWith(word + ' '));
    });
    
    // Return true if any of the conditions are met
    return hasQuestionMark || hasFollowUpIndicator || hasInterrogativeStart;
  };

  // --- Generate Interviewer Response ---
  const generateInterviewerResponse = async (userResponse: string, sttTime: number) => {
    if (isProcessingResponse) return;
    
    setIsProcessingResponse(true);
    
    // Start LLM timing
    const llmStart = Date.now();
    setLlmStartTime(llmStart);
    
    try {
      // Create a more detailed transcript context that includes conversation flow
      const transcriptContext = transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n");
      
      // Add interview structure context to help the LLM understand the flow
      const interviewStructure = `
INTERVIEW STRUCTURE:
- Total questions: ${interviewStage.currentQuestionIndex + 1} of ${interviewStage.totalQuestions || 0} planned questions
- Current stage: ${interviewStage.stage}
- Follow-up questions used: ${interviewStage.totalFollowUps}/6 maximum
- Follow-ups for current question: ${interviewStage.followUpCount}/2 maximum
- Is last question: ${interviewStage.currentQuestionIndex + 1 === interviewStage.totalQuestions ? 'YES' : 'NO'}

CRITICAL BUTTON CONTEXT (MUST FOLLOW EXACTLY):
- Intro stage: Button says "Start Questions" - guide them to click this to begin questions
- Questions stage: Button says "Next Question" for regular questions, "Finish Interview" for last question
- Closing stage: Button says "Complete" - this is the final stage

STAGE-SPECIFIC INSTRUCTIONS:
- If in "intro" stage: Only mention "Start Questions" button
- If in "questions" stage: Only mention "Next Question" or "Finish Interview" button (never "Start Questions")
- If in "closing" stage: only mention "Complete" button

CONVERSATION CONTEXT:
- This is a natural, flowing conversation
- You should respond to what they actually said, not just follow a script
- Reference specific points from their answer
- Make the conversation feel genuine and engaging
- If asking follow-ups, make them feel natural, not interrogative
- Always reference the correct button text based on the current stage
- If this is the last question, mention "Finish Interview" button instead of "Next Question"
`;
      
      let prompt = "";
      
      if (interviewStage.stage === "intro") {
        prompt = generateIntroPrompt(userResponse, transcriptContext + "\n" + interviewStructure, candidateName);
      } else if (interviewStage.stage === "questions") {
        prompt = generateQuestionPrompt(userResponse, transcriptContext + "\n" + interviewStructure, candidateName);
      } else if (interviewStage.stage === "closing") {
        prompt = generateClosingPrompt(userResponse, transcriptContext + "\n" + interviewStructure, candidateName);
      }

      // Track LLM first byte time (when request starts)
      setLlmFirstByteTime(Date.now());

      const response = await generateResponse(prompt);
      
      // Track LLM first token time (when response starts)
      setLlmFirstTokenTime(Date.now());
      
      // Calculate LLM time
      const llmTime = Date.now() - llmStart;
      console.log(`LLM time: ${llmTime}ms`);
      
      if (response) {
        // Detect if this response contains a follow-up question and update counts
        if (interviewStage.stage === "questions") {
          const isFollowUp = detectFollowUpQuestion(response);
          console.log(`Follow-up detection: ${isFollowUp}, Current follow-ups: ${interviewStage.followUpCount}/2, Total: ${interviewStage.totalFollowUps}/6`);
          if (isFollowUp) {
            updateFollowUpCount(true);
            console.log(`Follow-up question detected and count updated`);
          }
        }
        
        await speak(response, sttTime, llmTime);
      }
    } catch (error) {
      console.error("Error generating interviewer response:", error);
    } finally {
      setIsProcessingResponse(false);
    }
  };

  // --- Generate Intro Stage Prompt ---
  const generateIntroPrompt = (userResponse: string, transcriptContext: string, candidateFirstName: string) => {
    return `
You are a warm, professional interviewer conducting a technical interview. You have just introduced yourself and asked if the candidate is ready to begin.

FULL CONVERSATION HISTORY:
${transcriptContext}

CANDIDATE'S LATEST RESPONSE: "${userResponse}"

INTERVIEW CONTEXT:
- Stage: Introduction/Readiness Check
- Your role: Confirm if candidate is ready to start the technical interview
- Next step: Once they're ready, you'll ask the first technical question

CRITICAL BUTTON INSTRUCTIONS (MUST FOLLOW):
- You are in the INTRO stage
- ONLY mention "Start Questions" button in this stage
- NEVER mention "Next Question" or "Finish Interview" buttons in intro stage
- The "Start Questions" button is for beginning the first question

YOUR RESPONSE SHOULD:
1. If they indicate they're NOT ready (e.g., "wait", "not yet", "give me a moment"):
   - Acknowledge warmly: "No worries at all, take your time. Just let me know when you're ready to start."
   - Keep the conversation open and encouraging

2. If they indicate they ARE ready (e.g., "yes", "ready", "let's start"):
   - Confirm enthusiastically: "Perfect! Let's begin then. I'd love to hear about your experience and skills."
   - Mention: "When you're ready for the first question, just click the 'Start Questions' button below."

CONVERSATION FLOW:
- Reference their specific response naturally
- Use their name: ${candidateFirstName}
- Keep it warm and professional
- Be concise (1-2 sentences)
- Maintain the natural flow of conversation
- If they seem nervous, be extra encouraging
- If they seem confident, match their energy
- Remember: You're in the INTRO stage, only mention "Start Questions" button

Remember: You're having a real conversation, not just following a script. Respond naturally to what they actually said and match their energy level. ONLY mention "Start Questions" button in this intro stage.
    `;
  };

  // --- Generate Question Stage Prompt ---
  const generateQuestionPrompt = (userResponse: string, transcriptContext: string, candidateFirstName: string) => {
    // Check if follow-up limits are reached
    const followUpLimitReached = interviewStage.followUpCount >= 2 || interviewStage.totalFollowUps >= 6;
    
    return `
You are a warm, professional interviewer conducting a technical interview. The candidate has just answered your question.

FULL CONVERSATION HISTORY:
${transcriptContext}

CANDIDATE'S LATEST RESPONSE: "${userResponse}"

INTERVIEW CONTEXT:
- Stage: Technical Questions (Question ${interviewStage.currentQuestionIndex + 1})
- Your role: Engage in natural conversation about their answer
- Follow-up count for this question: ${interviewStage.followUpCount}/2
- Total follow-ups used in interview: ${interviewStage.totalFollowUps}/6
- Question context: This is question ${interviewStage.currentQuestionIndex + 1} of the interview

CRITICAL BUTTON INSTRUCTIONS (MUST FOLLOW):
- You are in the QUESTIONS stage, NOT the intro stage
- NEVER mention "Start Questions" button - that's only for intro stage
- For regular questions: Mention "Next Question" button
- For last question: Mention "Finish Interview" button
- Current question: ${interviewStage.currentQuestionIndex + 1} of ${interviewStage.totalQuestions || 0}
- Is last question: ${interviewStage.currentQuestionIndex + 1 === interviewStage.totalQuestions ? 'YES' : 'NO'}

STRICT FOLLOW-UP RULES (MUST OBEY):
- Maximum 2 follow-up questions per main question
- Maximum 6 follow-up questions in entire interview
- Current question follow-ups used: ${interviewStage.followUpCount}/2
- Total follow-ups used: ${interviewStage.totalFollowUps}/6
- If follow-up count >= 2 for this question: DO NOT ask another follow-up
- If total follow-ups >= 6: DO NOT ask any more follow-ups
- Only ask follow-ups if answer was brief, unclear, or missing key details

FOLLOW-UP LIMIT STATUS:
- Follow-up limit reached for this question: ${interviewStage.followUpCount >= 2 ? 'YES' : 'NO'}
- Total follow-up limit reached: ${interviewStage.totalFollowUps >= 6 ? 'YES' : 'NO'}
- Can ask follow-up: ${!followUpLimitReached ? 'YES' : 'NO'}

${followUpLimitReached ? 'CRITICAL: FOLLOW-UP LIMITS REACHED - DO NOT ASK ANY MORE FOLLOW-UP QUESTIONS. ACKNOWLEDGE THEIR ANSWER AND GUIDE THEM TO THE NEXT QUESTION.' : ''}

${followUpLimitReached ? 'IMPORTANT: You have reached the maximum number of follow-up questions. You MUST acknowledge their answer and guide them to the next question. DO NOT ask any more follow-up questions.' : ''}

CONVERSATION FLOW ANALYSIS:
Based on the conversation history and their answer quality, determine if you should:
1. Acknowledge their answer and ask a follow-up question (ONLY if follow-up count < 2 AND total < 6 AND answer needs clarification)
2. Acknowledge their answer and guide them to the next question (if follow-up limit reached or answer was comprehensive)
3. Ask them if they want to add more details

YOUR RESPONSE SHOULD:
1. First, acknowledge their specific answer warmly and naturally
2. Then, based on the context:
   ${followUpLimitReached ? '- FOLLOW-UP LIMITS REACHED: Acknowledge their answer and guide them to the next question. DO NOT ask any follow-up questions.' : '- If their answer was brief, vague, or needs clarification AND follow-up count < 2 AND total follow-ups < 6: Ask 1 follow-up question'}
   - If their answer was comprehensive and detailed OR follow-up limits reached: Guide them to the next question
   - If they want to add more: "Absolutely, please go ahead and share more details."
   - If they don't want to add more: "That's perfectly fine, thank you for sharing that."
   - If ready to move on: "Great! When you're ready for the next question, just click the 'Next Question' button below."
   - If this is the last question: "Great! When you're ready to finish the interview, just click the 'Finish Interview' button below."

FOLLOW-UP DECISION LOGIC:
- Ask follow-up if: Answer was brief, unclear, or missing key details AND follow-up count < 2 AND total follow-ups < 6
- Skip follow-up if: Answer was comprehensive and detailed OR follow-up limits reached
- Always respect the follow-up limits (max 2 per question, max 6 total)

CONVERSATION GUIDELINES:
- Reference their specific answer naturally
- Use their name: ${candidateFirstName}
- Be warm, friendly, and encouraging
- Keep it conversational, not robotic
- Be concise (2-3 sentences)
- Maintain the natural flow of conversation
- If they seem enthusiastic about a topic, show interest
- If they seem unsure, be supportive and encouraging
- Match their energy level and enthusiasm
- Remember: You're in the QUESTIONS stage, not intro stage

Remember: You're having a real conversation. Respond naturally to what they actually said, not just follow a script. Make them feel heard and valued. NEVER mention "Start Questions" button in this stage.

FINAL REMINDER:
- You are in the QUESTIONS stage, not intro stage
- NEVER mention "Start Questions" button - that's only for intro stage
- For regular questions: Mention "Next Question" button
- For last question: Mention "Finish Interview" button
- Current question: ${interviewStage.currentQuestionIndex + 1} of ${interviewStage.totalQuestions || 0}
- Is last question: ${interviewStage.currentQuestionIndex + 1 === interviewStage.totalQuestions ? 'YES' : 'NO'}
- Follow-up limits: ${followUpLimitReached ? 'REACHED - DO NOT ASK FOLLOW-UPS' : 'OK - can ask follow-ups if needed'}
    `;
  };

  // --- Generate Closing Stage Prompt ---
  const generateClosingPrompt = (userResponse: string, transcriptContext: string, candidateFirstName: string) => {
    return `
You are a warm, professional interviewer at the end of a technical interview. You have just asked the candidate if they have any questions for you.

FULL CONVERSATION HISTORY:
${transcriptContext}

CANDIDATE'S LATEST RESPONSE: "${userResponse}"

INTERVIEW CONTEXT:
- Stage: Closing/Questions from Candidate
- Your role: Answer their questions about the role or company, or provide a warm closing
- Interview flow: This is the final stage before ending the interview
- Button context: Button says "Complete" - this is the final conversation

CONVERSATION FLOW ANALYSIS:
Based on their response, determine if they:
1. Have questions about the role, company, or next steps
2. Don't have questions and are ready to end

YOUR RESPONSE SHOULD:
1. If they HAVE questions:
   - Answer their questions warmly and thoroughly
   - Provide helpful, detailed responses about the role, company culture, next steps, etc.
   - Be encouraging and professional
   - Reference the conversation naturally

2. If they DON'T have questions:
   - Provide a warm, personal closing: "That's totally fine! Thank you so much for your time today, ${candidateFirstName}. It was great talking with you and learning about your experience. You can go ahead and end the call whenever you're ready. Take care!"

CONVERSATION GUIDELINES:
- Reference the interview conversation naturally
- Use their name: ${candidateFirstName}
- Be warm, friendly, and professional
- If answering questions, be thorough but concise
- If closing, make it personal and appreciative
- Maintain the natural flow of conversation
- Reference specific points from the interview to make it personal
- Show genuine appreciation for their time and insights
- Make them feel valued and heard

Remember: You're wrapping up a real conversation. Make it feel personal and genuine, not robotic. This is your chance to leave a positive impression.
    `;
  };

  // --- Speak (send text to OpenAI TTS for TTS) ---
  const speak = useCallback(
    async (text: string, sttTime?: number, llmTime?: number, questionNumber?: number) => {
      setIsSpeaking(true);
      setTranscript((prev) => [
        ...prev,
        {
          speaker: "interviewer",
          text,
          timestamp: new Date().toISOString(),
          questionNumber,
        },
      ]);
      
      // Start TTS timing
      const ttsStart = Date.now();
      setTtsStartTime(ttsStart);
      
      // Defensive: Only call TTS if text and selectedVoice are present
      if (!text || !selectedVoice) {
        setIsSpeaking(false);
        console.error("TTS error: Missing text or voice");
        return;
      }
      try {
        // Track TTS first byte time (when request starts)
        setTtsFirstByteTime(Date.now());

        const response = await fetch("/api/openai-tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice: selectedVoice,
          }),
        });
        
        // Track TTS first token time (when response starts)
        setTtsFirstTokenTime(Date.now());
        
        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          // Calculate TTS time
          const ttsTime = Date.now() - ttsStart;
          console.log(`TTS time: ${ttsTime}ms`);
          
          audio.onended = async () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            
            // Log metrics if we have all timing data
            if (sttTime && llmTime && ttsTime && currentInterviewId) {
              const metrics: ConversationMetrics = {
                tts: {
                  total: ttsTime,
                  ttfb: ttsFirstByteTime - ttsStartTime,
                  ttft: ttsFirstTokenTime - ttsStartTime
                },
                stt: {
                  total: sttTime,
                  ttfb: sttFirstByteTime - sttStartTime,
                  ttft: sttFirstTokenTime - sttStartTime
                },
                llm: {
                  total: llmTime,
                  ttfb: llmFirstByteTime - llmStartTime,
                  ttft: llmFirstTokenTime - llmStartTime
                },
                timestamp: new Date().toISOString(),
              };
              
              try {
                await logConversationMetrics(currentInterviewId, metrics);
                console.log('Conversation metrics logged:', metrics);
              } catch (error) {
                console.error('Error logging metrics:', error);
              }
            }
          };
          audio.play();
        } else {
          setIsSpeaking(false);
          const err = await response.json().catch(() => ({}));
          console.error("TTS error:", err?.error || response.statusText);
        }
      } catch (err) {
        setIsSpeaking(false);
        console.error("TTS error:", err);
      }
    },
    [selectedVoice, currentInterviewId, logConversationMetrics]
  );

  // --- Generate Response (stub: OpenAI S2S handles this in real-time) ---
  const generateResponse = useCallback(async (prompt: string): Promise<string> => {
    // Use backend endpoint to generate LLM response (same as original logic)
    try {
      const response = await fetch("/api/generate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate response");
      }
      const data = await response.json();
      return data.response || "";
    } catch (error) {
      console.error("Error generating response:", error);
      return "";
    }
  }, []);

  // --- Test Voice (play sample TTS) ---
  const testVoice = useCallback(async (voiceId: string): Promise<void> => {
    await speak("This is a sample of the selected OpenAI voice.", undefined);
  }, [speak]);

  // --- Update Interview Stage ---
  const updateInterviewStage = useCallback((newStage: Partial<InterviewStage>) => {
    setInterviewStage(prev => ({ ...prev, ...newStage }));
  }, []);

  // --- Start Introduction ---
  const startIntroduction = useCallback(async (introText: string, candidateName: string) => {
    setCandidateName(candidateName);
    setInterviewStage(prev => ({
      ...prev,
      stage: "intro",
      currentQuestionIndex: -1,
      followUpCount: 0,
      totalFollowUps: 0,
      isReady: false,
    }));
    
    await speak(introText);
  }, [speak]);

  // --- Ask Question ---
  const askQuestion = useCallback(async (questionText: string, questionIndex: number, candidateName: string, totalQuestions?: number) => {
    setCandidateName(candidateName);
    setInterviewStage(prev => ({
      ...prev,
      stage: "questions",
      currentQuestionIndex: questionIndex,
      followUpCount: 0, // Reset follow-up count for new question
      totalQuestions: totalQuestions || prev.totalQuestions,
    }));
    
    await speak(questionText, questionIndex + 1);
  }, [speak]);

  // --- Reset Follow-up Count for New Question ---
  const resetFollowUpCount = useCallback(() => {
    setInterviewStage(prev => ({
      ...prev,
      followUpCount: 0, // Reset follow-up count for new question
    }));
  }, []);

  // --- Update Follow-up Count (called after LLM response) ---
  const updateFollowUpCount = useCallback((isFollowUp: boolean) => {
    if (isFollowUp) {
      setInterviewStage(prev => ({
        ...prev,
        followUpCount: prev.followUpCount + 1,
        totalFollowUps: prev.totalFollowUps + 1,
      }));
    }
  }, []);

  // --- Clear Code State (called after code submission) ---
  const clearCodeState = useCallback(() => {
    setCodeState(initialCodeState);
  }, []);

  // --- Start Closing ---
  const startClosing = useCallback(async (closingText: string, candidateName: string) => {
    setCandidateName(candidateName);
    setInterviewStage(prev => ({
      ...prev,
      stage: "closing",
      currentQuestionIndex: -1,
    }));
    
    await speak(closingText);
  }, [speak]);

  // --- Reset All Follow-up Counts (for debugging) ---
  const resetAllFollowUpCounts = useCallback(() => {
    setInterviewStage(prev => ({
      ...prev,
      followUpCount: 0,
      totalFollowUps: 0,
    }));
  }, []);

  // --- Get Follow-up Status (for debugging) ---
  const getFollowUpStatus = useCallback(() => {
    return {
      currentQuestionFollowUps: interviewStage.followUpCount,
      totalFollowUps: interviewStage.totalFollowUps,
      canAskFollowUp: interviewStage.followUpCount < 2 && interviewStage.totalFollowUps < 6,
      stage: interviewStage.stage,
      currentQuestion: interviewStage.currentQuestionIndex + 1,
      totalQuestions: interviewStage.totalQuestions,
    };
  }, [interviewStage]);

  // --- Set Interview ID for Metrics ---
  const setInterviewAndConversationIds = useCallback((interviewId: string, conversationId: string) => {
    setCurrentInterviewId(interviewId);
    setConversationStartTime(Date.now());
  }, []);

  return {
    isListening,
    isSpeaking,
    isProcessingResponse,
    audioLevel,
    transcript,
    startListening,
    stopListening,
    speak,
    testVoice,
    generateResponse,
    setTranscript,
    codeState,
    setCodeState,
    selectedVoice,
    setSelectedVoice,
    interviewStage,
    updateInterviewStage,
    startIntroduction,
    askQuestion,
    startClosing,
    candidateName,
    setCandidateName,
    updateFollowUpCount,
    clearCodeState,
    resetFollowUpCount,
    resetAllFollowUpCounts,
    getFollowUpStatus,
    setInterviewAndConversationIds,
  };
};
