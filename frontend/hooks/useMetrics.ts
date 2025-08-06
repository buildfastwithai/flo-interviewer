import { useState, useEffect } from 'react'

export interface ConversationMetrics {
  tts: {
    total: number
    ttfb: number  // Time to first byte
    ttft: number  // Time to first token
  }
  stt: {
    total: number
    ttfb: number  // Time to first byte
    ttft: number  // Time to first token
  }
  llm: {
    total: number
    ttfb: number  // Time to first byte
    ttft: number  // Time to first token
  }
  timestamp: string
}

export interface InterviewMetrics {
  conversations: {
    [key: string]: ConversationMetrics
  }
  avg_conversation_length: number
  avg_conversation_duration: number
  avg_conversation_tts: {
    total: number
    ttfb: number
    ttft: number
  }
  avg_conversation_stt: {
    total: number
    ttfb: number
    ttft: number
  }
  avg_conversation_llm: {
    total: number
    ttfb: number
    ttft: number
  }
}

export interface MetricsData {
  interviews: {
    [key: string]: InterviewMetrics
  }
  total: number
  success: number
  failed: number
}

export const useMetrics = () => {
  const [metrics, setMetrics] = useState<MetricsData>({
    interviews: {},
    total: 0,
    success: 0,
    failed: 0
  })

  // Load metrics from file
  const loadMetrics = async () => {
    try {
      const response = await fetch('/hooks/metrics.json')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
    }
  }

  // Save metrics to file
  const saveMetrics = async (newMetrics: MetricsData) => {
    try {
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMetrics),
      })
      
      if (response.ok) {
        setMetrics(newMetrics)
      }
    } catch (error) {
      console.error('Error saving metrics:', error)
    }
  }

  // Get next conversation ID for an interview
  const getNextConversationId = (interviewId: string): string => {
    const interview = metrics.interviews[interviewId]
    if (!interview) return 'conversation_1'
    
    const conversationCount = Object.keys(interview.conversations).length
    return `conversation_${conversationCount + 1}`
  }

  // Log conversation metrics
  const logConversationMetrics = async (
    interviewId: string,
    conversationData: ConversationMetrics
  ) => {
    const updatedMetrics: MetricsData = { ...metrics }
    
    if (!updatedMetrics.interviews[interviewId]) {
      updatedMetrics.interviews[interviewId] = {
        conversations: {},
        avg_conversation_length: 0,
        avg_conversation_duration: 0,
        avg_conversation_tts: { total: 0, ttfb: 0, ttft: 0 },
        avg_conversation_stt: { total: 0, ttfb: 0, ttft: 0 },
        avg_conversation_llm: { total: 0, ttfb: 0, ttft: 0 }
      }
    }

    // Get next conversation ID
    const conversationId = getNextConversationId(interviewId)
    
    // Add conversation metrics
    updatedMetrics.interviews[interviewId].conversations[conversationId] = conversationData

    // Calculate averages
    const conversations = Object.values(updatedMetrics.interviews[interviewId].conversations)
    if (conversations.length > 0) {
      const totalTts = conversations.reduce((sum, conv) => sum + conv.tts.total, 0)
      const totalStt = conversations.reduce((sum, conv) => sum + conv.stt.total, 0)
      const totalLlm = conversations.reduce((sum, conv) => sum + conv.llm.total, 0)
      const totalDuration = conversations.reduce((sum, conv) => sum + (conv.tts.total + conv.stt.total + conv.llm.total), 0)
      
      const totalTtsTtfb = conversations.reduce((sum, conv) => sum + conv.tts.ttfb, 0)
      const totalTtsTtft = conversations.reduce((sum, conv) => sum + conv.tts.ttft, 0)
      const totalSttTtfb = conversations.reduce((sum, conv) => sum + conv.stt.ttfb, 0)
      const totalSttTtft = conversations.reduce((sum, conv) => sum + conv.stt.ttft, 0)
      const totalLlmTtfb = conversations.reduce((sum, conv) => sum + conv.llm.ttfb, 0)
      const totalLlmTtft = conversations.reduce((sum, conv) => sum + conv.llm.ttft, 0)

      updatedMetrics.interviews[interviewId].avg_conversation_tts = {
        total: totalTts / conversations.length,
        ttfb: totalTtsTtfb / conversations.length,
        ttft: totalTtsTtft / conversations.length
      }
      updatedMetrics.interviews[interviewId].avg_conversation_stt = {
        total: totalStt / conversations.length,
        ttfb: totalSttTtfb / conversations.length,
        ttft: totalSttTtft / conversations.length
      }
      updatedMetrics.interviews[interviewId].avg_conversation_llm = {
        total: totalLlm / conversations.length,
        ttfb: totalLlmTtfb / conversations.length,
        ttft: totalLlmTtft / conversations.length
      }
      updatedMetrics.interviews[interviewId].avg_conversation_duration = totalDuration / conversations.length
      updatedMetrics.interviews[interviewId].avg_conversation_length = conversations.length
    }

    // Update total counters
    updatedMetrics.total += 1
    if (conversationData.tts.total > 0 && conversationData.stt.total > 0 && conversationData.llm.total > 0) {
      updatedMetrics.success += 1
    } else {
      updatedMetrics.failed += 1
    }

    await saveMetrics(updatedMetrics)
  }

  // Get conversation metrics
  const getConversationMetrics = (interviewId: string, conversationId: string): ConversationMetrics | null => {
    return metrics.interviews[interviewId]?.conversations[conversationId] || null
  }

  // Get interview metrics
  const getInterviewMetrics = (interviewId: string): InterviewMetrics | null => {
    return metrics.interviews[interviewId] || null
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  return {
    metrics,
    loadMetrics,
    saveMetrics,
    logConversationMetrics,
    getConversationMetrics,
    getInterviewMetrics,
    getNextConversationId,
  }
} 