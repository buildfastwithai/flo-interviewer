"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Volume2, Play, Pause } from "lucide-react"
import { motion } from "framer-motion"

interface VoiceSelectorProps {
  selectedVoice: string
  onVoiceChange: (voice: string) => void
  onTestVoice?: (voice: string) => void
  isPlaying?: boolean
}

const VOICE_OPTIONS = [
  {
    id: "professional-female",
    name: "Nova",
    description: "Professional female voice",
    category: "Professional",
    gender: "Female",
  },
  {
    id: "professional-male",
    name: "Onyx",
    description: "Professional male voice",
    category: "Professional",
    gender: "Male",
  },
  {
    id: "friendly-female",
    name: "Shimmer",
    description: "Warm female voice",
    category: "Friendly",
    gender: "Female",
  },
  {
    id: "friendly-male",
    name: "Echo",
    description: "Friendly male voice",
    category: "Friendly",
    gender: "Male",
  },
  {
    id: "authoritative",
    name: "Fable",
    description: "Authoritative voice",
    category: "Authoritative",
    gender: "Male",
  },
  {
    id: "warm",
    name: "Alloy",
    description: "Warm encouraging voice",
    category: "Warm",
    gender: "Neutral",
  },
]

export function VoiceSelector({ selectedVoice, onVoiceChange, onTestVoice, isPlaying }: VoiceSelectorProps) {
  const [testingVoice, setTestingVoice] = useState<string | null>(null)

  const handleTestVoice = async (voiceId: string) => {
    if (isPlaying || testingVoice) return

    setTestingVoice(voiceId)
    if (onTestVoice) {
      await onTestVoice(voiceId)
    }
    setTestingVoice(null)
  }

  const selectedVoiceData = VOICE_OPTIONS.find((v) => v.id === selectedVoice)

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white text-sm">
          <Volume2 className="w-4 h-4 text-[#2663FF]" />
          AI Voice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={selectedVoice} onValueChange={onVoiceChange}>
          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
            <SelectValue placeholder="Select voice" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            {VOICE_OPTIONS.map((voice) => (
              <SelectItem key={voice.id} value={voice.id}>
                <div className="flex items-center justify-between w-full bg-slate-800/50 border-slate-700/50 backdrop-blur-sm text-white">
                  <span className="font-medium">{voice.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {voice.category}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedVoiceData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-slate-700/30 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-white text-sm">{selectedVoiceData.name}</h4>
                <Badge variant="secondary" className="text-xs mt-1">
                  {selectedVoiceData.gender}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestVoice(selectedVoice)}
                disabled={isPlaying || testingVoice === selectedVoice}
                className="bg-slate-600/50 border-slate-500 text-white hover:bg-slate-500/50"
              >
                {testingVoice === selectedVoice ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </Button>
            </div>
            <p className="text-xs text-slate-300">{selectedVoiceData.description}</p>
          </motion.div>
        )}

        <div className="text-xs text-slate-400 text-center">OpenAI TTS</div>
      </CardContent>
    </Card>
  )
}
