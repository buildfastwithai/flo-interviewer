"use client"

import type React from "react"

import { useState, useCallback, useEffect, useRef, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Mic,
  MicOff,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  Code,
  MessageSquare,
  User,
  Bot,
  Maximize2,
  Minimize2,
  Settings,
  Volume2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Meteors } from "@/components/magicui/meteors"
import { BoxReveal } from "@/components/magicui/box-reveal"
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button"
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text"
import { useSearchParams } from "next/navigation"
import InterviewFeedback from "@/components/interview-feedback"
import { CodeEditor } from "@/components/CodeEditor"
import { SelectTrigger, SelectValue, SelectContent, SelectItem, Select } from "@/components/ui/select"
import { useAssemblyVoiceAgent } from "@/hooks/useAssemblyVoiceAgent"
import { VoiceSelector } from "@/components/VoiceSelector"

interface UserFormData {
  name: string
  accessCode: string
}

interface Question {
  id: string
  content: string
  skillId: string
  coding: boolean
}

interface InterviewTemplate {
  id: string
  jobTitle: string
  interviewLength: number
  introTemplate: string
  closingTemplate: string
  skills: Array<{
    id: string
    name: string
    level: string
    category: string
  }>
  questions: Question[]
}

interface InterviewData {
  interviewId: string
  recordId: string
  startTime: string
  transcript: any[]
}

interface TranscriptEntry {
  speaker: "interviewer" | "candidate"
  text: string
  timestamp: string
  questionNumber?: number
}

export default function InterviewV21Page() {
  const [userData, setUserData] = useState<UserFormData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null)
  const [template, setTemplate] = useState<InterviewTemplate | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1)
  const [interviewStage, setInterviewStage] = useState<"form" | "intro" | "questions" | "closing" | "feedback">("form")
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const [codeContent, setCodeContent] = useState("")
  const [isQuestionReady, setIsQuestionReady] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false)
  const [interviewDataId, setInterviewDataId] = useState<string | null>(null)
  const [isCodeEditorExpanded, setIsCodeEditorExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState("question")
  const transcriptScrollRef = useRef<HTMLDivElement>(null)

  const voiceAgent = useAssemblyVoiceAgent()
  const searchParams = useSearchParams()
  const startTimeRef = useRef<string>(new Date().toISOString())

  // Get access code from URL
  useEffect(() => {
    const codeFromUrl = searchParams.get("code")
    if (codeFromUrl) {
      setUserData((prev) => (prev ? { ...prev, accessCode: codeFromUrl } : null))
    }
  }, [searchParams])

  // Fetch interview by access code
  const fetchInterviewByAccessCode = async (accessCode: string) => {
    try {
      const response = await fetch(`/api/interview?accessCode=${accessCode}`)
      if (!response.ok) {
        throw new Error("Interview not found")
      }
      return await response.json()
    } catch (error) {
      console.error("Error fetching interview:", error)
      throw error
    }
  }

  // Fetch interview template
  const fetchInterviewTemplate = async (recordId: string, candidateName: string) => {
    try {
      const response = await fetch(`/api/interview-template?recordId=${recordId}&candidateName=${candidateName}`)
      if (!response.ok) {
        throw new Error("Failed to fetch interview template")
      }
      return await response.json()
    } catch (error) {
      console.error("Error fetching template:", error)
      throw error
    }
  }

  // Start interview
  const onJoinInterview = useCallback(async (formData: UserFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const interviewResponse = await fetchInterviewByAccessCode(formData.accessCode)
      const templateData = await fetchInterviewTemplate(interviewResponse.recordId, formData.name)

      setTemplate(templateData)
      setInterviewData({
        interviewId: interviewResponse.id,
        recordId: interviewResponse.recordId,
        startTime: startTimeRef.current,
        transcript: [],
      })
      setUserData(formData)
      setInterviewStage("intro")

      await createInterviewData({
        interviewId: interviewResponse.id,
        transcript: "[]",
        startTime: startTimeRef.current,
        endTime: null,
        duration: 0,
        analysis: {},
        questionAnswers: [],
        candidateName: formData.name,
      })

      toast.success("Interview loaded successfully!")

      setTimeout(() => {
        startIntroduction(templateData.introTemplate)
      }, 1000)
    } catch (error) {
      console.error("Error joining interview:", error)
      setError(error instanceof Error ? error.message : "Failed to join interview")
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  // Start introduction
  const startIntroduction = async (introText: string) => {
    await voiceAgent.speak(introText)
    setIsQuestionReady(true)
  }

  // Move to next question
  const handleSaveAndNext = async () => {
    if (!template) return

    if (interviewStage === "intro") {
      setInterviewStage("questions")
      setCurrentQuestionIndex(0)
      await askQuestion(0)
    } else if (interviewStage === "questions") {
      const nextIndex = currentQuestionIndex + 1
      if (nextIndex < template.questions.length) {
        setCurrentQuestionIndex(nextIndex)
        await askQuestion(nextIndex)
      } else {
        setInterviewStage("closing")
        await voiceAgent.speak(template.closingTemplate)
        setIsQuestionReady(true)
      }
    } else if (interviewStage === "closing") {
      await endInterview()
    }
  }

  // Ask specific question
  const askQuestion = async (questionIndex: number) => {
    if (!template) return

    const question = template.questions[questionIndex]
    let questionText = question.content

    if (questionText.startsWith("{")) {
      try {
        const parsed = JSON.parse(questionText)
        questionText = parsed.question || questionText
      } catch (e) {
        // Use original text if parsing fails
      }
    }

    if (question.coding) {
      setShowCodeEditor(true)
      setCodeContent("// Write your code here\n\n")
      setActiveTab("code")
    } else {
      setShowCodeEditor(false)
      setActiveTab("question")
    }

    const transcriptContext = voiceAgent.transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n")

    const prompt = `
Previous conversation:
${transcriptContext}

Current question (Question ${questionIndex + 1}):
${questionText}

Please ask this question in a natural, conversational manner. Don't mention question numbers.
    `

    try {
      const response = await voiceAgent.generateResponse(prompt)
      await voiceAgent.speak(response, questionIndex + 1)
      setIsQuestionReady(true)
    } catch (error) {
      console.error("Error asking question:", error)
      await voiceAgent.speak(questionText, questionIndex + 1)
      setIsQuestionReady(true)
    }
  }

  // End interview
  const endInterview = async () => {
    const endTime = new Date().toISOString()

    try {
      await updateInterviewData({
        interviewId: interviewData?.interviewId,
        transcript: JSON.stringify(voiceAgent.transcript),
        startTime: startTimeRef.current,
        endTime,
        duration: calculateDuration(startTimeRef.current),
        analysis: {},
        questionAnswers: extractQuestionAnswers(voiceAgent.transcript),
        candidateName: userData?.name || "",
      })

      setInterviewStage("feedback")
      setIsFeedbackLoading(true)
      setShowFeedbackModal(true)

      if (interviewDataId) {
        try {
          const feedbackResponse = await fetch("/api/interview-feedback", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              interviewDataId: interviewDataId,
            }),
          })

          if (feedbackResponse.ok) {
            const feedbackData = await feedbackResponse.json()
            setFeedback(feedbackData.feedback)
          }
        } catch (feedbackError) {
          console.error("Error generating feedback:", feedbackError)
        } finally {
          setIsFeedbackLoading(false)
        }
      }
    } catch (error) {
      console.error("Error ending interview:", error)
      toast.error("Failed to save interview data")
    }
  }

  // Create interview data
  const createInterviewData = async (data: any) => {
    try {
      const processedData = {
        ...data,
        endTime: data.endTime && data.endTime.trim() !== "" ? new Date(data.endTime) : undefined,
        startTime: new Date(data.startTime),
        updateIfExists: false,
      }

      const response = await fetch("/api/interview-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedData),
      })

      if (!response.ok) {
        throw new Error("Failed to create interview data")
      }

      const result = await response.json()
      if (result?.data?.id) {
        setInterviewDataId(result.data.id)
      }

      return result
    } catch (error) {
      console.error("Error creating interview data:", error)
      throw error
    }
  }

  // Update interview data
  const updateInterviewData = async (data: any) => {
    try {
      const processedData = {
        ...data,
        endTime: data.endTime && data.endTime.trim() !== "" ? new Date(data.endTime) : undefined,
        startTime: new Date(data.startTime),
        candidateName: userData?.name || data.candidateName,
        updateIfExists: interviewDataId ? true : false,
      }

      if (interviewDataId) {
        processedData.id = interviewDataId
      }

      const response = await fetch("/api/interview-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedData),
      })

      if (!response.ok) {
        throw new Error("Failed to update interview data")
      }

      const result = await response.json()
      if (!interviewDataId && result?.data?.id) {
        setInterviewDataId(result.data.id)
      }

      return result
    } catch (error) {
      console.error("Error updating interview data:", error)
      throw error
    }
  }

  // Calculate duration
  const calculateDuration = (startTime: string): number => {
    const start = new Date(startTime).getTime()
    const now = new Date().getTime()
    return Math.floor((now - start) / (1000 * 60))
  }

  // Extract Q&A pairs
  const extractQuestionAnswers = (transcript: TranscriptEntry[]): any[] => {
    const qa: any[] = []
    let currentQuestion = null
    let currentAnswers: string[] = []

    for (let i = 0; i < transcript.length; i++) {
      const entry = transcript[i]

      if (entry.speaker === "interviewer") {
        if (currentQuestion && currentAnswers.length > 0) {
          qa.push({
            question: currentQuestion,
            answer: currentAnswers.join(" "),
          })
        }

        currentQuestion = entry.text
        currentAnswers = []
      } else if (entry.speaker === "candidate" && currentQuestion) {
        currentAnswers.push(entry.text)
      }
    }

    if (currentQuestion && currentAnswers.length > 0) {
      qa.push({
        question: currentQuestion,
        answer: currentAnswers.join(" "),
      })
    }

    return qa
  }

  const getCurrentQuestion = () => {
    if (!template || currentQuestionIndex < 0 || currentQuestionIndex >= template.questions.length) {
      return null
    }

    const question = template.questions[currentQuestionIndex]
    let questionText = question.content

    if (questionText.startsWith("{")) {
      try {
        const parsed = JSON.parse(questionText)
        questionText = parsed.question || questionText
      } catch (e) {
        // Use original text if parsing fails
      }
    }

    return {
      ...question,
      displayText: questionText,
    }
  }

  // Auto-scroll transcript when new messages come in
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight
    }
  }, [voiceAgent.transcript])

  // Handle code submission
  const handleCodeSubmit = () => {
    if (!voiceAgent.codeState.code.trim()) {
      toast.error("Please write some code before submitting")
      return
    }

    const codeMessage = `Code submission:\n\nLanguage: ${voiceAgent.codeState.language}\n\n${voiceAgent.codeState.code}`
    
    voiceAgent.setTranscript((prev: TranscriptEntry[]) => [
      ...prev,
      {
        speaker: "candidate",
        text: codeMessage,
        timestamp: new Date().toISOString(),
      },
    ])

    toast.success("Code submitted successfully!")
  }

  if (interviewStage === "form") {
    return (
      <div className="w-full h-screen flex items-center justify-center relative bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2663FF]/10 via-[#1D244F]/5 to-white opacity-30"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2663FF]/10 via-transparent to-transparent"></div>
        <Meteors />

        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4">Loading...</p>
              </div>
            </div>
          }
        >
          <UserForm onSubmit={onJoinInterview} isSubmitting={isSubmitting} error={error} />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Top Header Bar */}
      <motion.div
        className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-6 py-4 flex items-center justify-between shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#2663FF] to-[#1D244F] rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{template?.jobTitle} Interview</h1>
              {/* <p className="text-xs text-slate-500">Assembly STT + OpenAI TTS</p> */}
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-3 ml-8">
            <div className="text-sm text-slate-600">
              {interviewStage === "intro"
                ? "Introduction"
                : interviewStage === "questions"
                  ? `Question ${currentQuestionIndex + 1}/${template?.questions.length || 0}`
                  : interviewStage === "closing"
                    ? "Closing"
                    : "Complete"}
            </div>
            <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2663FF] to-[#f7a828] transition-all duration-500"
                style={{
                  width:
                    interviewStage === "intro"
                      ? "10%"
                      : interviewStage === "questions"
                        ? `${((currentQuestionIndex + 1) / (template?.questions.length || 1)) * 80 + 10}%`
                        : interviewStage === "closing"
                          ? "95%"
                          : "100%",
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            Live Session
          </Badge>
          {/* <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button> */}
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Voice Controls */}
        <motion.div
          className="w-80 bg-gradient-to-b from-[#1D244F] to-[#0F172A] flex flex-col relative overflow-hidden"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#2663FF]/20 via-transparent to-transparent" />

          {/* Voice Controls */}
          <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10">
            {/* Audio Level Indicator */}
            <AnimatePresence>
              {voiceAgent.isListening && (
                <motion.div
                  className="w-40 h-3 bg-slate-800 rounded-full overflow-hidden mb-6"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <div
                    className="h-full bg-gradient-to-r from-[#2663FF] via-[#f7a828] to-[#2663FF] transition-all duration-100"
                    style={{ width: `${Math.min(voiceAgent.audioLevel * 2, 100)}%` }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Microphone Button */}
            <motion.div className="relative mb-8" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <div className="absolute -inset-6 bg-gradient-to-r from-[#2663FF]/30 to-[#f7a828]/30 rounded-full blur-xl animate-pulse" />
              <Button
                onClick={voiceAgent.isListening ? voiceAgent.stopListening : voiceAgent.startListening}
                className="w-28 h-28 rounded-full bg-gradient-to-br from-[#2663FF] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#2663FF] transition-all duration-300 shadow-2xl relative z-10"
                disabled={voiceAgent.isSpeaking}
              >
                <AnimatePresence mode="wait">
                  {voiceAgent.isListening ? (
                    <motion.div key="listening" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <MicOff className="w-12 h-12 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div key="not-listening" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Mic className="w-12 h-12 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {voiceAgent.isListening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-[#2663FF] animate-ping opacity-20" />
                    <span className="absolute inset-0 rounded-full bg-[#2663FF] animate-pulse opacity-30" />
                  </>
                )}
              </Button>
            </motion.div>

            {/* Status Text */}
            <motion.div
              className="text-center mb-8"
              animate={{
                color: voiceAgent.isSpeaking ? "#f7a828" : voiceAgent.isListening ? "#2663FF" : "#94A3B8",
              }}
            >
              <div className="text-lg font-medium mb-1">
                {voiceAgent.isSpeaking ? "AI Speaking..." : voiceAgent.isListening ? "Listening..." : "Ready to Listen"}
              </div>
              <div className="text-sm opacity-75">
                {voiceAgent.isSpeaking
                  ? "Please wait for the AI to finish"
                  : voiceAgent.isListening
                    ? "Flo Interviewer is processing your speech"
                    : "Tap the microphone to start speaking"}
              </div>
            </motion.div>

            {/* Action Button */}
            <AnimatePresence>
              {isQuestionReady && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Button
                    onClick={handleSaveAndNext}
                    className="bg-gradient-to-r from-[#f7a828] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#f7a828] text-white px-8 py-3 rounded-xl font-medium shadow-lg"
                    disabled={voiceAgent.isSpeaking}
                  >
                    {interviewStage === "intro"
                      ? "Start Questions"
                      : interviewStage === "questions" && currentQuestionIndex < (template?.questions.length || 0) - 1
                        ? "Next Question"
                        : interviewStage === "questions"
                          ? "Finish Interview"
                          : "Complete"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Voice Selector */}
          <div className="p-6 border-t border-slate-700/50 relative z-10">
            <VoiceSelector
              selectedVoice={voiceAgent.selectedVoice}
              onVoiceChange={voiceAgent.setSelectedVoice}
              onTestVoice={voiceAgent.testVoice}
              isPlaying={voiceAgent.isSpeaking}
            />
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Content Tabs */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200/60 px-6">
                <TabsList className="grid w-full max-w-md grid-cols-3 bg-slate-100/80">
                  <TabsTrigger value="question" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Question
                  </TabsTrigger>
                  <TabsTrigger value="code" disabled={!showCodeEditor} className="flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Code
                  </TabsTrigger>
                  {/* <TabsTrigger value="transcript" className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Transcript
                  </TabsTrigger> */}
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="question" className="h-full m-0">
                  <ScrollArea className="h-full">
                    <div className="p-8">
                      <motion.div
                        key={`${interviewStage}-${currentQuestionIndex}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl mx-auto"
                      >
                        {interviewStage === "intro" && (
                          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/50">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-3 text-blue-900">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Sparkles className="w-5 h-5 text-blue-600" />
                                </div>
                                Welcome to Your Interview
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-blue-700 leading-relaxed">
                                The AI interviewer will introduce the interview process. Listen carefully and respond
                                when ready to begin.
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        {interviewStage === "questions" && (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[#f7a828] border-[#f7a828] bg-orange-50">
                                Question {currentQuestionIndex + 1} of {template?.questions.length}
                              </Badge>
                              {getCurrentQuestion()?.coding && (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                  <Code className="w-3 h-3 mr-1" />
                                  Coding Challenge
                                </Badge>
                              )}
                            </div>

                            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                              <CardContent className="p-8">
                                <div className="prose prose-slate max-w-none">
                                  <p className="text-xl text-slate-800 leading-relaxed font-medium">
                                    {getCurrentQuestion()?.displayText}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            <div className="flex items-center gap-2 text-slate-600 text-sm bg-slate-50 rounded-lg p-4">
                              <Clock className="w-4 h-4" />
                              <span>Take your time to think through your answer thoroughly</span>
                            </div>
                          </div>
                        )}

                        {interviewStage === "closing" && (
                          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-3 text-green-900">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <Sparkles className="w-5 h-5 text-green-600" />
                                </div>
                                Interview Complete
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-green-700 leading-relaxed">
                                Thank you for completing all the questions. The interviewer will now provide closing
                                remarks.
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </motion.div>
                    </div>
                  <div className="flex flex-col mx-auto h-[45vh]">
                    <div className="p-4 bg-white/60 backdrop-blur-sm border-b border-slate-200/60">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-center mx-auto">
                        <MessageSquare className="w-5 h-5" />
                        Interview Transcript
                      </h3>
                      <p className="text-sm text-slate-600">Real-time conversation history</p>
                    </div>
                    <ScrollArea className="p-4 h-full" ref={transcriptScrollRef}>
                      <div className="space-y-4 max-w-4xl mx-auto">
                        <AnimatePresence>
                          {voiceAgent.transcript.map((entry, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex gap-3 ${entry.speaker === "interviewer" ? "" : "flex-row-reverse"}`}
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  entry.speaker === "interviewer"
                                    ? "bg-blue-100 text-blue-600"
                                    : "bg-green-100 text-green-600"
                                }`}
                              >
                                {entry.speaker === "interviewer" ? (
                                  <Bot className="w-4 h-4" />
                                ) : (
                                  <User className="w-4 h-4" />
                                )}
                              </div>
                              <div className={`max-w-lg ${entry.speaker === "candidate" ? "text-right" : ""}`}>
                                <div className="text-xs text-slate-500 mb-1">
                                  {entry.speaker === "interviewer" ? "AI Interviewer" : userData?.name || "You"}
                                  <span className="ml-2">
                                    {new Date(entry.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <div
                                  className={`rounded-2xl px-4 py-3 ${
                                    entry.speaker === "interviewer"
                                      ? "bg-blue-50 text-blue-900 border border-blue-200"
                                      : "bg-green-50 text-green-900 border border-green-200"
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.text}</p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {voiceAgent.transcript.length === 0 && (
                          <div className="text-center text-slate-500 py-12">
                            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No conversation yet</p>
                            <p className="text-sm">Your interview transcript will appear here</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                  </ScrollArea>

                </TabsContent>

                <TabsContent value="code" className="h-full m-0">
                  <div className="h-full p-4">
                    {showCodeEditor ? (
                      <div className="h-full flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Select
                              value={voiceAgent.codeState.language}
                              onValueChange={(value) =>
                                voiceAgent.setCodeState({ ...voiceAgent.codeState, language: value })
                              }
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
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
                          {/* <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCodeEditorExpanded(!isCodeEditorExpanded)}
                          >
                            {isCodeEditorExpanded ? (
                              <Minimize2 className="w-4 h-4" />
                            ) : (
                              <Maximize2 className="w-4 h-4" />
                            )}
                          </Button> */}
                        </div>
                        <div className="flex-1">
                          <CodeEditor
                            language={voiceAgent.codeState.language}
                            defaultValue={voiceAgent.codeState.code}
                            onChange={(value) =>
                              voiceAgent.setCodeState({ ...voiceAgent.codeState, code: value || "" })
                            }
                            // height="100%"
                          />
                        </div>
                        <Button
                          onClick={handleCodeSubmit}
                          className="bg-gradient-to-r from-[#f7a828] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#f7a828] text-white px-8 py-3 rounded-xl font-medium shadow-lg"
                          disabled={voiceAgent.isSpeaking}
                        >
                          Submit Code
                        </Button>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center text-slate-500">
                          <Code className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No Coding Question</p>
                          <p className="text-sm">The code editor will appear for coding challenges</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* <TabsContent value="transcript" className="h-full m-0"> */}
                  
                {/* </TabsContent> */}
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <InterviewFeedback
          candidateName={userData?.name || ""}
          feedback={feedback}
          loading={isFeedbackLoading}
          onClose={() => setShowFeedbackModal(false)}
          isOpen={showFeedbackModal}
        />
      )}
    </div>
  )
}

function UserForm({
  onSubmit,
  isSubmitting,
  error,
}: {
  onSubmit: (data: UserFormData) => void
  isSubmitting: boolean
  error: string | null
}) {
  const [name, setName] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const searchParams = useSearchParams()

  useEffect(() => {
    const codeFromUrl = searchParams.get("code")
    if (codeFromUrl) {
      setAccessCode(codeFromUrl)
    }
  }, [searchParams])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, accessCode })
  }

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
                <span className="text-sm font-medium text-[#1D244F]">Professional Audio Interview v2.1</span>
              </motion.div>
              <h1 className="text-3xl font-bold text-[#1D244F]">
                Welcome to Your{" "}
                <AnimatedGradientText className="bg-gradient-to-r from-[#2663FF] via-[#2663FF] to-[#1D244F] bg-clip-text text-transparent">
                  Interview Session
                </AnimatedGradientText>
              </h1>
              {/* <p className="text-[#5B5F79]">Experience professional-grade audio with Assembly STT & OpenAI TTS</p> */}
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
                <Label htmlFor="name" className="text-[#1D244F] font-medium">
                  Your Name
                </Label>
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
                <Label htmlFor="accessCode" className="text-[#1D244F] font-medium">
                  Access Code
                </Label>
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

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}>
              <InteractiveHoverButton
                className="group w-full bg-[#f7a828] hover:bg-[#f7a828]/90 rounded-lg px-8 py-4 text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-[#f7a828]/30 transform hover:-translate-y-1 text-white"
                disabled={isSubmitting || !name || !accessCode}
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting ? "Loading Interview..." : "Start Professional Interview"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </InteractiveHoverButton>
            </motion.div>

            {/* <motion.div
              className="pt-4 flex justify-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <div className="flex items-center gap-2 text-xs text-[#5B5F79]">
                <Clock className="w-3 h-3 text-[#2663FF]" />
                <span>Assembly STT</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#5B5F79]">
                <Zap className="w-3 h-3 text-[#f7a828]" />
                <span>OpenAI TTS</span>
              </div>
            </motion.div> */}
          </form>
        </motion.div>
      </Card>
    </motion.div>
  )
}
