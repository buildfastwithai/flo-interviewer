"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, X, Clock, Sparkles, Zap, ArrowRight, Code, Play, Pause, Square } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Meteors } from "@/components/magicui/meteors";
import { BoxReveal } from "@/components/magicui/box-reveal";
import { MagicCard } from "@/components/magicui/magic-card";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { useSearchParams } from "next/navigation";
import InterviewFeedback from "@/components/interview-feedback";
import { Textarea } from "@/components/ui/textarea";
import { CodeEditor } from "@/components/CodeEditor";
import { SelectTrigger, SelectValue, SelectContent, SelectItem ,Select} from "@/components/ui/select";
// import { Select } from "react-day-picker";

interface UserFormData {
  name: string;
  accessCode: string;
}

interface Question {
  id: string;
  content: string;
  skillId: string;
  coding: boolean;
}

interface InterviewTemplate {
  id: string;
  jobTitle: string;
  interviewLength: number;
  introTemplate: string;
  closingTemplate: string;
  skills: Array<{
    id: string;
    name: string;
    level: string;
    category: string;
  }>;
  questions: Question[];
}

interface InterviewData {
  interviewId: string;
  recordId: string;
  startTime: string;
  transcript: any[];
}

interface TranscriptEntry {
  speaker: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
  questionNumber?: number;
}

interface CodeEntry {
  code: string;
  language: string;
}
const initialCodeState = {
    code: '',
    language: 'python'
}

// Custom Voice Agent Hook
const useCustomVoiceAgent = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [codeState, setCodeState] = useState<CodeEntry>(initialCodeState);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
            if(codeState.code){
                finalTranscript += `\n\n${codeState.code}`;
            }
          }
        }
        
        if (finalTranscript) {
          setTranscript(prev => [...prev, {
            speaker: 'candidate',
            text: finalTranscript,
            timestamp: new Date().toISOString()
          }]);
        }
        console.log(finalTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Audio level monitoring
  useEffect(() => {
    if (isListening) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          mediaStreamRef.current = stream;
          audioContextRef.current = new AudioContext();
          analyserRef.current = audioContextRef.current.createAnalyser();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          source.connect(analyserRef.current);
          
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          const updateAudioLevel = () => {
            if (analyserRef.current && isListening) {
              analyserRef.current.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
              setAudioLevel(average);
              requestAnimationFrame(updateAudioLevel);
            }
          };
          updateAudioLevel();
        })
        .catch(err => console.error('Error accessing microphone:', err));
    }
  }, [isListening]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const speak = useCallback(async (text: string, questionNumber?: number) => {
    return new Promise<void>((resolve) => {
      if (synthesisRef.current) {
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => {
          setIsSpeaking(false);
          setTranscript(prev => [...prev, {
            speaker: 'interviewer',
            text,
            timestamp: new Date().toISOString(),
            questionNumber
          }]);
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          setIsSpeaking(false);
          resolve();
        };

        synthesisRef.current.speak(utterance);
      } else {
        resolve();
      }
    });
  }, []);

  const generateResponse = useCallback(async (prompt: string): Promise<string> => {
    try {
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error generating response:', error);
      return "I apologize, but I'm having trouble processing that. Let's continue with the next question.";
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    audioLevel,
    transcript,
    startListening,
    stopListening,
    speak,
    generateResponse,
    setTranscript
  };
};

export default function InterviewV21Page() {
  const [userData, setUserData] = useState<UserFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [template, setTemplate] = useState<InterviewTemplate | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1); // -1 for intro
  const [interviewStage, setInterviewStage] = useState<'form' | 'intro' | 'questions' | 'closing' | 'feedback'>('form');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [isQuestionReady, setIsQuestionReady] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [interviewDataId, setInterviewDataId] = useState<string | null>(null);
  // const[language, setLanguage] = useState('javascript');
  // const[code, setCode] = useState('');
  const [codeState, setCodeState] = useState<CodeEntry>(initialCodeState);


  const voiceAgent = useCustomVoiceAgent();
  const searchParams = useSearchParams();
  const startTimeRef = useRef<string>(new Date().toISOString());

  // Get access code from URL
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      // Auto-populate access code from URL
      setUserData(prev => prev ? { ...prev, accessCode: codeFromUrl } : null);
    }
  }, [searchParams]);

  // Fetch interview by access code
  const fetchInterviewByAccessCode = async (accessCode: string) => {
    try {
      const response = await fetch(`/api/interview?accessCode=${accessCode}`);
      if (!response.ok) {
        throw new Error('Interview not found');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching interview:', error);
      throw error;
    }
  };

  // Fetch interview template
  const fetchInterviewTemplate = async (recordId: string, candidateName: string) => {
    try {
      const response = await fetch(`/api/interview-template?recordId=${recordId}&candidateName=${candidateName}`);
      if (!response.ok) {
        throw new Error('Failed to fetch interview template');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  };

  // Start interview
  const onJoinInterview = useCallback(async (formData: UserFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Fetch interview by access code
      const interviewResponse = await fetchInterviewByAccessCode(formData.accessCode);
      
      // Fetch interview template
      const templateData = await fetchInterviewTemplate(interviewResponse.recordId, formData.name);
      
      setTemplate(templateData);
      setInterviewData({
        interviewId: interviewResponse.id,
        recordId: interviewResponse.recordId,
        startTime: startTimeRef.current,
        transcript: []
      });
      setUserData(formData);
      setInterviewStage('intro');
      
      // Create initial interview data
      await createInterviewData({
        interviewId: interviewResponse.id,
        transcript: "[]",
        startTime: startTimeRef.current,
        endTime: null,
        duration: 0,
        analysis: {},
        questionAnswers: [],
        candidateName: formData.name
      });

      toast.success('Interview loaded successfully!');
      
      // Start with introduction after a short delay
      setTimeout(() => {
        startIntroduction(templateData.introTemplate);
      }, 1000);
      
    } catch (error) {
      console.error('Error joining interview:', error);
      setError(error instanceof Error ? error.message : 'Failed to join interview');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Start introduction
  const startIntroduction = async (introText: string) => {
    await voiceAgent.speak(introText);
    setIsQuestionReady(true);
  };

  // Move to next question
  const handleSaveAndNext = async () => {
    if (!template) return;

    if (interviewStage === 'intro') {
      setInterviewStage('questions');
      setCurrentQuestionIndex(0);
      await askQuestion(0);
    } else if (interviewStage === 'questions') {
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < template.questions.length) {
        setCurrentQuestionIndex(nextIndex);
        await askQuestion(nextIndex);
      } else {
        setInterviewStage('closing');
        await voiceAgent.speak(template.closingTemplate);
        setIsQuestionReady(true);
      }
    } else if (interviewStage === 'closing') {
      await endInterview();
    }
  };

  // Ask specific question
  const askQuestion = async (questionIndex: number) => {
    if (!template) return;
    
    const question = template.questions[questionIndex];
    let questionText = question.content;
    
    // Parse JSON content if needed
    if (questionText.startsWith('{')) {
      try {
        const parsed = JSON.parse(questionText);
        questionText = parsed.question || questionText;
      } catch (e) {
        // Use original text if parsing fails
      }
    }

    // Show code editor if this is a coding question
    if (question.coding) {
      setShowCodeEditor(true);
      setCodeContent('// Write your code here\n\n');
    } else {
      setShowCodeEditor(false);
    }

    // Create prompt with previous transcript
    const transcriptContext = voiceAgent.transcript.map(t => 
      `${t.speaker}: ${t.text}`
    ).join('\n');
    
    const prompt = `
Previous conversation:
${transcriptContext}

Current question (Question ${questionIndex + 1}):
${questionText}


Please ask this question in a natural, conversational manner. Don't mention question numbers.
    `;

    try {
      const response = await voiceAgent.generateResponse(prompt);
      await voiceAgent.speak(response, questionIndex + 1);
      setIsQuestionReady(true);
    } catch (error) {
      console.error('Error asking question:', error);
      await voiceAgent.speak(questionText, questionIndex + 1);
      setIsQuestionReady(true);
    }
  };

  // End interview
  const endInterview = async () => {
    const endTime = new Date().toISOString();
    
    try {
      await updateInterviewData({
        interviewId: interviewData?.interviewId,
        transcript: JSON.stringify(voiceAgent.transcript),
        startTime: startTimeRef.current,
        endTime,
        duration: calculateDuration(startTimeRef.current),
        analysis: {},
        questionAnswers: extractQuestionAnswers(voiceAgent.transcript),
        candidateName: userData?.name || ""
      });

      setInterviewStage('feedback');
      setIsFeedbackLoading(true);
      setShowFeedbackModal(true);

      // Generate feedback
      if (interviewDataId) {
        try {
          const feedbackResponse = await fetch('/api/interview-feedback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              interviewDataId: interviewDataId
            }),
          });
          
          if (feedbackResponse.ok) {
            const feedbackData = await feedbackResponse.json();
            setFeedback(feedbackData.feedback);
          }
        } catch (feedbackError) {
          console.error('Error generating feedback:', feedbackError);
        } finally {
          setIsFeedbackLoading(false);
        }
      }
    } catch (error) {
      console.error('Error ending interview:', error);
      toast.error('Failed to save interview data');
    }
  };

  // Create interview data
  const createInterviewData = async (data: any) => {
    try {
      const processedData = {
        ...data,
        endTime: data.endTime && data.endTime.trim() !== "" 
          ? new Date(data.endTime) 
          : undefined,
        startTime: new Date(data.startTime),
        updateIfExists: false
      };

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
      if (result?.data?.id) {
        setInterviewDataId(result.data.id);
      }
      
      return result;
    } catch (error) {
      console.error('Error creating interview data:', error);
      throw error;
    }
  };

  // Update interview data
  const updateInterviewData = async (data: any) => {
    try {
      const processedData = {
        ...data,
        endTime: data.endTime && data.endTime.trim() !== "" 
          ? new Date(data.endTime) 
          : undefined,
        startTime: new Date(data.startTime),
        candidateName: userData?.name || data.candidateName,
        updateIfExists: interviewDataId ? true : false
      };

      if (interviewDataId) {
        processedData.id = interviewDataId;
      }

      const response = await fetch('/api/interview-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update interview data');
      }
      
      const result = await response.json();
      if (!interviewDataId && result?.data?.id) {
        setInterviewDataId(result.data.id);
      }
      
      return result;
    } catch (error) {
      console.error('Error updating interview data:', error);
      throw error;
    }
  };

  // Calculate duration
  const calculateDuration = (startTime: string): number => {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    return Math.floor((now - start) / (1000 * 60));
  };

  // Extract Q&A pairs
  const extractQuestionAnswers = (transcript: TranscriptEntry[]): any[] => {
    const qa: any[] = [];
    let currentQuestion = null;
    let currentAnswers: string[] = [];
    
    for (let i = 0; i < transcript.length; i++) {
      const entry = transcript[i];
      
      if (entry.speaker === 'interviewer') {
        if (currentQuestion && currentAnswers.length > 0) {
          qa.push({
            question: currentQuestion,
            answer: currentAnswers.join(' ')
          });
        }
        
        currentQuestion = entry.text;
        currentAnswers = [];
      } else if (entry.speaker === 'candidate' && currentQuestion) {
        currentAnswers.push(entry.text);
      }
    }
    
    if (currentQuestion && currentAnswers.length > 0) {
      qa.push({
        question: currentQuestion,
        answer: currentAnswers.join(' ')
      });
    }
    
    return qa;
  };

  const getCurrentQuestion = () => {
    if (!template || currentQuestionIndex < 0 || currentQuestionIndex >= template.questions.length) {
      return null;
    }
    
    const question = template.questions[currentQuestionIndex];
    let questionText = question.content;
    
    if (questionText.startsWith('{')) {
      try {
        const parsed = JSON.parse(questionText);
        questionText = parsed.question || questionText;
      } catch (e) {
        // Use original text if parsing fails
      }
    }
    
    return {
      ...question,
      displayText: questionText
    };
  };

  if (interviewStage === 'form') {
    return (
      <div className="w-full h-screen flex items-center justify-center relative bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2663FF]/10 via-[#1D244F]/5 to-white opacity-30"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2663FF]/10 via-transparent to-transparent"></div>
        <Meteors />

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
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Interview Controls */}
      <div className="w-full max-w-sm bg-gradient-to-b from-[#1D244F] to-[#1D244F]/95 border-r border-[#2663FF]/20 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#2663FF]/10 via-transparent to-transparent"></div>
        
        {/* Header */}
        <div className="p-6 relative z-10">
          <motion.div
            className="flex items-center justify-center gap-2 px-3 py-1 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-full border border-[#2663FF]/30 backdrop-blur-sm text-center"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="w-4 h-4 text-[#2663FF]" />
            <span className="text-sm font-medium text-white">Interview Progress</span>
          </motion.div>
        </div>

        {/* Progress */}
        <div className="px-6 mb-6 relative z-10">
          <div className="space-y-3">
            <div className="flex justify-between text-white text-sm">
              <span>Question</span>
              <span>
                {interviewStage === 'intro' ? 'Introduction' : 
                 interviewStage === 'questions' ? `${currentQuestionIndex + 1}/${template?.questions.length || 0}` :
                 interviewStage === 'closing' ? 'Closing' : 'Complete'}
              </span>
            </div>
            <div className="w-full bg-[#1D244F] rounded-full h-2">
              <div 
                className="bg-[#2663FF] h-2 rounded-full transition-all duration-300"
                style={{
                  width: interviewStage === 'intro' ? '10%' :
                         interviewStage === 'questions' ? `${((currentQuestionIndex + 1) / (template?.questions.length || 1)) * 80 + 10}%` :
                         interviewStage === 'closing' ? '95%' : '100%'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Voice Controls */}
        <div className="flex-1 p-6 flex flex-col justify-center items-center space-y-8 relative z-10">
          <motion.div
            key="voice-controls"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center space-y-6"
          >
            {/* Microphone Button */}
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute -inset-4 bg-gradient-to-r from-[#2663FF] to-[#2663FF]/70 opacity-30 blur-md rounded-full animate-pulse"></div>
              <Button
                onClick={voiceAgent.isListening ? voiceAgent.stopListening : voiceAgent.startListening}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2663FF] to-[#2663FF]/80 hover:from-[#2663FF] hover:to-[#2663FF]/90 transition-all duration-300 flex items-center justify-center shadow-lg relative"
              >
                {voiceAgent.isListening ? (
                  <MicOff className="w-10 h-10 text-white" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
                
                {voiceAgent.isListening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-[#2663FF] animate-ping opacity-20"></span>
                    <span className="absolute inset-0 rounded-full bg-[#2663FF] animate-pulse opacity-40"></span>
                  </>
                )}
              </Button>
            </motion.div>

            <motion.span 
              className="text-white text-sm font-medium bg-[#1D244F]/80 px-4 py-1 rounded-full border border-[#2663FF]/20"
              animate={{ 
                backgroundColor: voiceAgent.isListening ? 'rgba(38, 99, 255, 0.3)' : 'rgba(29, 36, 79, 0.8)'
              }}
            >
              {voiceAgent.isSpeaking ? "AI Speaking..." : 
               voiceAgent.isListening ? "Listening..." : "Tap to speak"}
            </motion.span>

            {/* Save & Next Button */}
            {isQuestionReady && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={handleSaveAndNext}
                  className="bg-[#f7a828] hover:bg-[#f7a828]/90 text-white px-6 py-3 rounded-lg font-medium"
                  disabled={voiceAgent.isSpeaking}
                >
                  {interviewStage === 'intro' ? 'Start Questions' :
                   interviewStage === 'questions' && currentQuestionIndex < (template?.questions.length || 0) - 1 ? 'Save & Next' :
                   interviewStage === 'questions' ? 'Finish Questions' : 'End Interview'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Status */}
        <motion.div 
          className="p-4 border-t border-[#2663FF]/20 relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center justify-center space-x-2 bg-[#1D244F]/60 backdrop-blur-sm rounded-full py-2 px-4 border border-[#2663FF]/10">
            <div className="w-2 h-2 rounded-full bg-[#2663FF] animate-pulse" />
            <span className="text-[#F7F7FA] text-xs font-medium">
              Interview Active
            </span>
          </div>
        </motion.div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Question Display */}
        <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
          {/* Header */}
          <motion.div 
            className="border-b border-[#F7F7FA] p-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#1D244F]">
                  {template?.jobTitle} Interview
                </h1>
                <p className="text-[#5B5F79] text-sm mt-1">
                  AI-powered technical interview with real-time evaluation
                </p>
              </div>
              <Badge className="bg-[#2663FF]/10 text-[#2663FF] border-[#2663FF]/30 px-3 py-1">
                Live Session
              </Badge>
            </div>
          </motion.div>

          {/* Content */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6 max-w-4xl mx-auto">
              {interviewStage === 'intro' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center p-8"
                >
                                     {/* <MagicCard className="p-8"> */}
                     <BoxReveal>
                       <div>
                         <h2 className="text-xl font-semibold text-[#1D244F] mb-4">
                           Welcome to Your Interview
                         </h2>
                         <p className="text-[#5B5F79] mb-6">
                           The AI interviewer will introduce the interview process. 
                           Listen carefully and respond when ready to begin.
                         </p>
                         <div className="flex items-center justify-center gap-2 text-[#2663FF]">
                           <Sparkles className="w-5 h-5" />
                           <span className="font-medium">Introduction in Progress</span>
                         </div>
                       </div>
                     </BoxReveal>
                   {/* </MagicCard> */}
                </motion.div>
              )}

              {interviewStage === 'questions' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={currentQuestionIndex}
                  className="space-y-6"
                >
                  {/* <MagicCard className="p-8"> */}
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className="text-[#f7a828] border-[#f7a828]">
                        Question {currentQuestionIndex + 1} of {template?.questions.length}
                      </Badge>
                      {getCurrentQuestion()?.coding && (
                        <Badge className="bg-[#2663FF]/10 text-[#2663FF] border-[#2663FF]/30">
                          <Code className="w-3 h-3 mr-1" />
                          Coding Question
                        </Badge>
                      )}
                    </div>
                    
                    <BoxReveal>
                      <div className="prose max-w-none">
                        <p className="text-lg text-[#1D244F] leading-relaxed">
                          {getCurrentQuestion()?.displayText}
                        </p>
                      </div>
                    </BoxReveal>

                    <div className="mt-6 flex items-center gap-2 text-[#5B5F79] text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Take your time to think through your answer</span>
                    </div>
                  {/* </MagicCard> */}
                </motion.div>
              )}

              {interviewStage === 'closing' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center p-8"
                >
                                     {/* <MagicCard className="p-8"> */}
                     <BoxReveal>
                       <div>
                         <h2 className="text-xl font-semibold text-[#1D244F] mb-4">
                           Interview Complete
                         </h2>
                         <p className="text-[#5B5F79] mb-6">
                           Thank you for completing all the questions. 
                           The interviewer will now provide closing remarks.
                         </p>
                         <div className="flex items-center justify-center gap-2 text-[#2663FF]">
                           <Sparkles className="w-5 h-5" />
                           <span className="font-medium">Closing Remarks</span>
                         </div>
                       </div>
                     </BoxReveal>
                   {/* </MagicCard> */}
                </motion.div>
              )}

              {/* Transcript Display */}
              <div className="mt-16">
                <h3 className="text-lg font-semibold text-[#1D244F] mb-4">Interview Transcript</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {voiceAgent.transcript.map((entry, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: entry.speaker === 'interviewer' ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${entry.speaker === 'interviewer' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        entry.speaker === 'interviewer' 
                          ? 'bg-[#F7F7FA] text-[#1D244F]' 
                          : 'bg-[#2663FF] text-white'
                      }`}>
                        <div className="text-xs opacity-70 mb-1">
                          {entry.speaker === 'interviewer' ? 'AI Interviewer' : userData?.name || 'You'}
                        </div>
                        <div className="text-sm">{entry.text}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Code Editor (Conditional) */}
        {showCodeEditor && (
        //   <motion.div
        //     initial={{ width: 0, opacity: 0 }}
        //     animate={{ width: '50%', opacity: 1 }}
        //     exit={{ width: 0, opacity: 0 }}
        //     className="border-l border-[#F7F7FA] bg-[#1e1e1e] text-white"
        //   >
        //     <div className="h-full flex flex-col">
        //       <div className="p-4 bg-[#2d2d2d] border-b border-[#3e3e3e] flex items-center justify-between">
        //         <div className="flex items-center gap-2">
        //           <Code className="w-4 h-4" />
        //           <span className="font-medium">Code Editor</span>
        //         </div>
        //         <Button
        //           onClick={() => setShowCodeEditor(false)}
        //           variant="ghost"
        //           size="sm"
        //           className="text-white hover:bg-[#3e3e3e]"
        //         >
        //           <X className="w-4 h-4" />
        //         </Button>
        //       </div>
        //       <div className="flex-1 p-4">
        //         <Textarea
        //           value={codeContent}
        //           onChange={(e) => setCodeContent(e.target.value)}
        //           className="w-full h-full bg-[#1e1e1e] text-white font-mono text-sm resize-none border-none focus:ring-0"
        //           placeholder="Write your code here..."
        //         />
        //       </div>
        //       <div className="p-4 bg-[#2d2d2d] border-t border-[#3e3e3e]">
        //         <Button className="w-full bg-[#007acc] hover:bg-[#005a9e] text-white">
        //           <Play className="w-4 h-4 mr-2" />
        //           Run Code
        //         </Button>
        //       </div>
        //     </div>
        //   </motion.div>
        <div className="flex flex-col gap-4 items-center">
 <CardContent>
            <div className="mb-4">
              <Select
                value={codeState.language}
                onValueChange={(value) => setCodeState({ ...codeState, language: value })}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="c">C</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        <CodeEditor
          language={codeState.language}
          defaultValue={codeState.code}
          onChange={(value) => setCodeState({ ...codeState, code: value || '' })}
        //   onChange={setCodeContent}
        //   onRun={handleRunCode}
        />
        </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <InterviewFeedback
          candidateName={userData?.name || ''}
          feedback={feedback}
          loading={isFeedbackLoading}
          onClose={() => setShowFeedbackModal(false)}
          isOpen={showFeedbackModal}
        />
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
                  AI-Powered Interview v2.1
                </span>
              </motion.div>
              <h1 className="text-3xl font-bold text-[#1D244F]">
                Welcome to Your <AnimatedGradientText className="bg-gradient-to-r from-[#2663FF] via-[#2663FF] to-[#1D244F] bg-clip-text text-transparent">
                  Interview Session
                </AnimatedGradientText>
              </h1>
              <p className="text-gray-700">
                Enter your details to start the structured interview experience
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
              <InteractiveHoverButton 
                className="group w-full bg-[#f7a828] hover:bg-[#f7a828]/90 rounded-lg px-8 py-4 text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-[#f7a828]/30 transform hover:-translate-y-1 text-white" 
                disabled={isSubmitting || !name || !accessCode}
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting ? "Loading Interview..." : "Start Interview"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </InteractiveHoverButton>
            </motion.div>

            <motion.div
              className="pt-4 flex justify-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <div className="flex items-center gap-2 text-xs text-[#5B5F79]">
                <Clock className="w-3 h-3 text-[#2663FF]" />
                <span>Structured Format</span>
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
  );
}
