"use client";

import Link from "next/link";
import { JDQnaForm } from "@/components/JDQnaForm";
import { Button } from "@/components/ui/button";
import { Database, BarChart3, FileText, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Meteors } from "@/components/magicui/meteors";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { MagicCard } from "@/components/magicui/magic-card";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-[#1D244F] font-sans relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2663FF]/10 via-[#1D244F]/5 to-white opacity-30"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2663FF]/10 via-transparent to-transparent"></div>
      <Meteors />

      <div className="container mx-auto py-10 px-4 relative z-10">
        {/* Header Section */}
        <motion.div 
          className="flex flex-col items-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Action Buttons */}
          <motion.div 
            className="w-full flex justify-center mb-6 space-x-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Button 
              variant="outline" 
              asChild
              className="border-[#2663FF]/20 hover:bg-[#2663FF]/5 transition-all duration-300"
            >
              <Link href="/jd-qna" className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 text-[#2663FF]" />
                JD QnA
              </Link>
            </Button>
            <Button 
              variant="outline" 
              asChild
              className="border-[#2663FF]/20 hover:bg-[#2663FF]/5 transition-all duration-300"
            >
              <Link href="/jd-qna/dashboard" className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 text-[#2663FF]" />
                Dashboard
              </Link>
            </Button>
            <Button 
              variant="outline" 
              asChild
              className="border-[#2663FF]/20 hover:bg-[#2663FF]/5 transition-all duration-300"
            >
              <Link href="/create-interview" className="flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-[#2663FF]" />
                Create Interview
              </Link>
            </Button>
            <Button 
              variant="outline" 
              asChild
              className="border-[#2663FF]/20 hover:bg-[#2663FF]/5 transition-all duration-300"
            >
              <Link href="/interview-evaluation" className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-[#2663FF]" />
                Interview Evaluation
              </Link>
            </Button>
            <Button 
              variant="outline" 
              asChild
              className="border-[#2663FF]/20 hover:bg-[#2663FF]/5 transition-all duration-300"
            >
              <Link href="/jd-qna/records" className="flex items-center">
                <Database className="h-4 w-4 mr-2 text-[#2663FF]" />
                View Saved Records
              </Link>
            </Button>
          </motion.div>

          {/* Title Section */}
          <motion.div
            className="text-center space-y-6 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-full border border-[#2663FF]/30 backdrop-blur-sm mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles className="w-4 h-4 text-[#2663FF]" />
              <span className="text-sm font-medium">AI-Powered Question Generator</span>
            </motion.div>

            <h1 className="text-5xl font-bold mb-4">
              Generate Perfect{" "}
              <span className="relative">
                <AnimatedGradientText className="bg-gradient-to-r from-[#1D244F] via-[#2663FF] to-[#2663FF] bg-clip-text text-transparent">
                  Interview Questions
                </AnimatedGradientText>
                <motion.div
                  className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#2663FF] to-[#1D244F] rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1, duration: 0.8 }}
                />
              </span>
            </h1>
            
            <p className="text-[#5B5F79] text-lg max-w-2xl mx-auto leading-relaxed">
              Upload a job description PDF and get customized interview questions
              based on the role and requirements, powered by our advanced AI engine.
            </p>
          </motion.div>
        </motion.div>

        {/* Form Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <MagicCard className="relative bg-white/80 backdrop-blur-sm border border-[#F7F7FA] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-8">
              <JDQnaForm />
            </div>
          </MagicCard>
        </motion.div>
      </div>
    </main>
  );
}
