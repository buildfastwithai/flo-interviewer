"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RegenerationAnalytics } from "@/components/RegenerationAnalytics";
import { BarChart3, Download, Filter, ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function RegenerationAnalyticsPage() {
  const [selectedRecord, setSelectedRecord] = useState<string>("");
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="container mx-auto py-8 space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#2663FF]/10 rounded-lg">
            <BarChart3 className="h-8 w-8 text-[#2663FF]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1D244F]">Regeneration Analytics</h1>
            <p className="text-[#5B5F79] mt-1">
              Insights into question regeneration patterns and user feedback
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-[#F7F7FA] hover:border-[#2663FF] hover:bg-[#2663FF]/5 text-[#1D244F]"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="border-[#F7F7FA] hover:border-[#2663FF] hover:bg-[#2663FF]/5 text-[#1D244F]"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            asChild
            className="border-[#F7F7FA] hover:border-[#2663FF] hover:bg-[#2663FF]/5 text-[#1D244F]"
          >
            <Link href="/jd-qna/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

      <motion.div variants={fadeInUp}>
        <Card className="border border-[#F7F7FA] shadow-sm overflow-hidden">
          <CardHeader className="bg-[#F7F7FA]/20 border-b border-[#F7F7FA]">
            <CardTitle className="flex items-center gap-2 text-[#1D244F]">
              <Filter className="h-5 w-5 text-[#2663FF]" />
              Analytics Filters
            </CardTitle>
            <CardDescription className="text-[#5B5F79]">
              Filter analytics by specific records or skills to focus your analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-[#1D244F] mb-2 block">Filter by Record</label>
                <Select
                  value={selectedRecord}
                  onValueChange={setSelectedRecord}
                >
                  <SelectTrigger className="border-[#F7F7FA] bg-white focus:border-[#2663FF] focus:ring-[#2663FF]/20">
                    <SelectValue placeholder="Select a record" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Records</SelectItem>
                    <SelectItem value="record-1">Frontend Developer</SelectItem>
                    <SelectItem value="record-2">Backend Engineer</SelectItem>
                    <SelectItem value="record-3">Full Stack Developer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-[#1D244F] mb-2 block">Filter by Skill</label>
                <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                  <SelectTrigger className="border-[#F7F7FA] bg-white focus:border-[#2663FF] focus:ring-[#2663FF]/20">
                    <SelectValue placeholder="Select a skill" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Skills</SelectItem>
                    <SelectItem value="skill-1">React</SelectItem>
                    <SelectItem value="skill-2">Node.js</SelectItem>
                    <SelectItem value="skill-3">TypeScript</SelectItem>
                    <SelectItem value="skill-4">Python</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRecord("");
                    setSelectedSkill("");
                  }}
                  className="border-[#F7F7FA] hover:border-[#2663FF] hover:bg-[#2663FF]/5 text-[#1D244F]"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-[#F7F7FA]/10 border-t border-[#F7F7FA] py-3">
            <div className="flex flex-wrap gap-2 w-full">
              <div className="text-xs text-[#5B5F79]">Active filters:</div>
              {selectedRecord && (
                <Badge variant="outline" className="bg-[#2663FF]/10 text-[#2663FF] border-[#2663FF]/30">
                  Record: {selectedRecord === "record-1" ? "Frontend Developer" : 
                          selectedRecord === "record-2" ? "Backend Engineer" : 
                          selectedRecord === "record-3" ? "Full Stack Developer" : selectedRecord}
                </Badge>
              )}
              {selectedSkill && (
                <Badge variant="outline" className="bg-[#2663FF]/10 text-[#2663FF] border-[#2663FF]/30">
                  Skill: {selectedSkill === "skill-1" ? "React" : 
                         selectedSkill === "skill-2" ? "Node.js" : 
                         selectedSkill === "skill-3" ? "TypeScript" : 
                         selectedSkill === "skill-4" ? "Python" : selectedSkill}
                </Badge>
              )}
              {!selectedRecord && !selectedSkill && (
                <span className="text-xs text-[#5B5F79]">None - showing all data</span>
              )}
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <RegenerationAnalytics
          recordId={selectedRecord || undefined}
          skillId={selectedSkill || undefined}
        />
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card className="border border-[#F7F7FA] shadow-sm overflow-hidden">
          <CardHeader className="bg-[#F7F7FA]/20 border-b border-[#F7F7FA]">
            <CardTitle className="text-[#1D244F]">Understanding Regeneration Metrics</CardTitle>
            <CardDescription className="text-[#5B5F79]">
              How to interpret the analytics data for better decision making
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#2663FF]/10 flex items-center justify-center text-[#2663FF] font-bold">1</div>
                  <h4 className="font-semibold text-[#1D244F]">
                    Total Regenerations
                  </h4>
                </div>
                <p className="text-sm text-[#5B5F79] pl-10">
                  The total number of times questions have been regenerated.
                  Higher numbers may indicate issues with initial question
                  quality for specific skills.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#2663FF]/10 flex items-center justify-center text-[#2663FF] font-bold">2</div>
                  <h4 className="font-semibold text-[#1D244F]">
                    Average per Question
                  </h4>
                </div>
                <p className="text-sm text-[#5B5F79] pl-10">
                  Average regenerations per question. Values above 1.0 suggest
                  systematic issues that need addressing.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#f7a828]/10 flex items-center justify-center text-[#f7a828] font-bold">3</div>
                  <h4 className="font-semibold text-[#1D244F]">
                    Satisfaction Rate
                  </h4>
                </div>
                <p className="text-sm text-[#5B5F79] pl-10">
                  Percentage of regenerations that users rated as better than
                  the original. Higher rates indicate successful improvements.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#f7a828]/10 flex items-center justify-center text-[#f7a828] font-bold">4</div>
                  <h4 className="font-semibold text-[#1D244F]">
                    Most Regenerated Skills
                  </h4>
                </div>
                <p className="text-sm text-[#5B5F79] pl-10">
                  Skills with the highest regeneration counts may need prompt
                  engineering improvements or additional training data.
                </p>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="bg-[#2663FF]/5 p-4 rounded-lg border border-[#2663FF]/20">
              <h4 className="font-semibold text-[#1D244F] mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#2663FF]">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Pro Tip
              </h4>
              <p className="text-sm text-[#1D244F]">
                Focus on skills with high regeneration counts but low satisfaction rates. These represent the biggest opportunities for question quality improvement.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
