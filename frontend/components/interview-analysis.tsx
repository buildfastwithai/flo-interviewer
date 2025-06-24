"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle,
  Upload,
  Clock,
  Star,
  TrendingUp,
  Brain,
  MessageSquare,
  Download,
  FileText,
  TableIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { generateInterviewPDF } from "./interview-analysis-pdf";
import { generateInterviewPDFTranscript } from "./interview-analsis-pdf-transcript";

export interface SkillAssessment {
  skill: string;
  level:
    | "Beginner"
    | "Intermediate"
    | "Advanced"
    | "Expert"
    | "Not Demonstrated";
  confidence_score: number;
  evidence: string;
  recommendations: string;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  grade: "Excellent" | "Good" | "Average" | "Below Average" | "Poor";
  score: number;
  feedback: string;
  key_points_covered: string[];
  areas_for_improvement: string[];
}

export interface InterviewInsights {
  overall_performance_score: number;
  communication_clarity: number;
  technical_depth: number;
  problem_solving_ability: number;
  confidence_level: number;
  strengths: string[];
  weaknesses: string[];
  key_achievements_mentioned: string[];
  red_flags: string[];
  interview_duration_analysis: string;
  speech_patterns: string;
  engagement_level: string;
  cultural_fit_indicators: string[];
  hiring_recommendation: string;
  next_steps: string[];
}

export interface AnalysisResponse {
  filename?: string;
  video_id?: string;
  raw_transcript: string;
  formatted_transcript: string;
  ai_provider: string;
  file_chunks?: number;
  skill_assessments: SkillAssessment[];
  questions_and_answers: QuestionAnswer[];
  interview_insights: InterviewInsights;
  analysis_summary: string;
}

export default function InterviewAnalysis() {
  const [transcriptText, setTranscriptText] = useState("");
  const [skills, setSkills] = useState("");
  const [jobRole, setJobRole] = useState("Software Developer");
  const [companyName, setCompanyName] = useState("Company");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [inputType, setInputType] = useState<"text" | "pdf">("text");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const validateInputs = () => {
    if (!transcriptText.trim() && !pdfFile) {
      setError("Please enter transcript text or upload a PDF file");
      return false;
    }

    if (!skills.trim()) {
      setError("Please enter at least one skill to assess");
      return false;
    }

    const skillsList = skills
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);
    if (skillsList.length > 20) {
      setError("Maximum 20 skills allowed");
      return false;
    }

    return true;
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError("Please upload a PDF file");
        return;
      }
      setPdfFile(file);
      setError(null);
    }
  };

  const analyzeInterview = async () => {
    if (!validateInputs()) return;

    setIsAnalyzing(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();

      if (inputType === "text") {
        // Create a text file from the input
        const textBlob = new Blob([transcriptText], { type: "text/plain" });
        formData.append("file", textBlob, "transcript.txt");
      } else if (pdfFile) {
        formData.append("file", pdfFile);
      }

      formData.append("skills_to_assess", skills);
      formData.append("job_role", jobRole);
      formData.append("company_name", companyName);
      formData.append("ai_provider", "openai");

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 2000);

      const response = await fetch("/api/analyze-interview", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Analysis failed");
      }

      const result: AnalysisResponse = await response.json();
      setAnalysisResult(result);
      setProgress(100);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setProgress(0);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "bg-green-500 hover:bg-green-600";
    if (score >= 80) return "bg-emerald-500 hover:bg-emerald-600";
    if (score >= 70) return "bg-blue-500 hover:bg-blue-600";
    if (score >= 60) return "bg-yellow-500 hover:bg-yellow-600";
    if (score >= 50) return "bg-orange-500 hover:bg-orange-600";
    return "bg-red-500 hover:bg-red-600";
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case "Expert":
        return "bg-green-500";
      case "Advanced":
        return "bg-blue-500";
      case "Intermediate":
        return "bg-yellow-500";
      case "Beginner":
        return "bg-orange-500";
      case "Not Demonstrated":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "Excellent":
        return "text-green-600 bg-green-50 border-green-200";
      case "Good":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "Average":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "Below Average":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "Poor":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-emerald-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 80) return "bg-emerald-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  const downloadPDF = (includeTranscript: boolean = false) => {
    if (!analysisResult) return;
    
    if (includeTranscript) {
      generateInterviewPDFTranscript(analysisResult, {
        includeRawData: false,
      });
    } else {
      generateInterviewPDF(analysisResult, {
        includeRawData: false,
      });
    }
  };

  // Add these helper functions before the component
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  const getSkillLevelData = (skills: SkillAssessment[]) => {
    const levels = [
      "Expert",
      "Advanced",
      "Intermediate",
      "Beginner",
      "Not Demonstrated",
    ];
    return levels
      .map((level) => ({
        name: level,
        count: skills.filter((s) => s.level === level).length,
      }))
      .filter((d) => d.count > 0);
  };

  const getQAGradeData = (qa: QuestionAnswer[]) => {
    const grades = ["Excellent", "Good", "Average", "Below Average", "Poor"];
    return grades
      .map((grade) => ({
        name: grade,
        count: qa.filter((q) => q.grade === grade).length,
      }))
      .filter((d) => d.count > 0);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI Interview Analysis
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed max-w-3xl">
          Enter interview transcript text to get comprehensive AI-powered
          analysis with skill assessment, Q&A grading, and detailed insights.
        </p>
      </motion.div>

      {!analysisResult ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-8 border-2 shadow-lg">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Upload className="h-6 w-6 text-blue-500" />
                Provide Interview Transcript for Analysis
              </CardTitle>
              <CardDescription className="text-base">
                Enter interview transcript text and specify the skills you want
                to assess
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <Tabs value={inputType} onValueChange={(v) => setInputType(v as "text" | "pdf")} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">Paste Text</TabsTrigger>
                  <TabsTrigger value="pdf">Upload PDF</TabsTrigger>
                </TabsList>
                
                <TabsContent value="text">
                  <div className="space-y-4">
                    <Label htmlFor="transcript" className="text-lg font-semibold">
                      Interview Transcript
                    </Label>
                    <ScrollArea className="h-[200px] border-2 rounded-md">
                      <Textarea
                        id="transcript"
                        placeholder="Paste your interview transcript here..."
                        value={transcriptText}
                        onChange={(e) => setTranscriptText(e.target.value)}
                        className="min-h-[400px] text-base p-4 transition-all duration-200 border-0"
                      />
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="pdf">
                  <div className="space-y-4">
                    <Label htmlFor="pdf" className="text-lg font-semibold">
                      Upload PDF Document
                    </Label>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                      <Input
                        id="pdf"
                        type="file"
                        accept=".pdf"
                        onChange={handlePdfUpload}
                        className="hidden"
                      />
                      <Label
                        htmlFor="pdf"
                        className="cursor-pointer flex flex-col items-center justify-center gap-4"
                      >
                        <div className="p-4 bg-blue-50 rounded-full">
                          <Upload className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-medium">
                            {pdfFile ? pdfFile.name : "Choose PDF file"}
                          </p>
                          <p className="text-sm text-gray-500">
                            or drag and drop your PDF file here
                          </p>
                        </div>
                      </Label>
                      {pdfFile && (
                        <Button
                          variant="outline"
                          className="mt-2"
                          onClick={() => setPdfFile(null)}
                        >
                          Remove PDF
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-4">
                <Label htmlFor="skills" className="text-lg font-semibold">
                  Skills to Assess
                </Label>
                <Textarea
                  id="skills"
                  placeholder="e.g., Python, React, Problem Solving, Communication, Leadership, SQL, Machine Learning"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="min-h-[120px] text-base p-4 transition-all duration-200 border-2 focus:border-blue-500"
                />
                <p className="text-sm text-gray-500 italic">
                  Enter comma-separated skills (maximum 20). Be specific for
                  better analysis.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="jobRole" className="text-lg font-semibold">
                    Job Role
                  </Label>
                  <Input
                    id="jobRole"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder="e.g., Software Developer"
                    className="text-base p-6 transition-all duration-200 border-2 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-4">
                  <Label
                    htmlFor="companyName"
                    className="text-lg font-semibold"
                  >
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Tech Corp"
                    className="text-base p-6 transition-all duration-200 border-2 focus:border-blue-500"
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert variant="destructive" className="border-2">
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription className="text-base ml-2">
                      {error}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 text-base text-blue-600">
                    <Clock className="h-5 w-5 animate-spin" />
                    Analyzing interview... This may take several minutes.
                  </div>
                  <Progress value={progress} className="h-2 w-full" />
                  <p className="text-sm text-gray-600 animate-pulse">
                    {progress < 30 && "Processing transcript..."}
                    {progress >= 30 && progress < 60 && "Analyzing skills..."}
                    {progress >= 60 &&
                      progress < 90 &&
                      "Extracting Q&A and generating insights..."}
                    {progress >= 90 && "Finalizing analysis..."}
                  </p>
                </motion.div>
              )}

              <Button
                onClick={analyzeInterview}
                disabled={isAnalyzing}
                className={cn(
                  "w-full text-lg py-6 transition-all duration-300",
                  "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                  "shadow-lg hover:shadow-xl",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Analyzing...
                  </span>
                ) : (
                  "Analyze Interview"
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          {/* Analysis Summary */}
          <Card className="border-2 shadow-lg overflow-hidden bg-gradient-to-br from-white to-blue-50/30">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Star className="h-6 w-6 text-yellow-500" />
                  Executive Summary
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="px-4 py-1 text-sm font-medium border-2">
                    Score: {analysisResult.interview_insights.overall_performance_score}/100
                  </Badge>
                  <Badge 
                    className={`px-4 py-1 text-sm font-medium ${getPerformanceColor(
                      analysisResult.interview_insights.overall_performance_score
                    )}`}
                  >
                    {analysisResult.interview_insights.overall_performance_score >= 90
                      ? "Outstanding"
                      : analysisResult.interview_insights.overall_performance_score >= 80
                      ? "Excellent"
                      : analysisResult.interview_insights.overall_performance_score >= 70
                      ? "Good"
                      : analysisResult.interview_insights.overall_performance_score >= 60
                      ? "Satisfactory"
                      : "Needs Improvement"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="prose max-w-none text-lg leading-relaxed"
              >
                <p className="whitespace-pre-wrap">{analysisResult.analysis_summary}</p>
              </motion.div>
            </CardContent>
          </Card>

          {/* Download Buttons */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Download className="h-6 w-6 text-blue-500" />
                Export Options
              </CardTitle>
              <CardDescription className="text-base">
                Download the analysis in different formats
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => downloadPDF(false)}
                  className={cn(
                    "flex items-center gap-2 text-base py-6 px-8",
                    "bg-gradient-to-r from-blue-600 to-purple-600",
                    "hover:from-blue-700 hover:to-purple-700",
                    "shadow-lg hover:shadow-xl transition-all duration-300"
                  )}
                >
                  <FileText className="h-5 w-5" />
                  Download PDF Report
                </Button>
                <Button
                  onClick={() => downloadPDF(true)}
                  variant="outline"
                  className="flex items-center gap-2 text-base py-6 px-8 border-2 hover:bg-gray-50 transition-all duration-300"
                >
                  <FileText className="h-5 w-5" />
                  Download PDF with Transcript
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 py-2 px-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg sticky top-0 z-10 shadow-sm h-14">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-white/50"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Overview
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-white/50"
              >
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Insights
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="skills"
                className="data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-white/50"
              >
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Skills
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="skills-table"
                className="data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-white/50"
              >
                <div className="flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  Skills Table
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="qa"
                className="data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-white/50"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Q&A Analysis
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="qa-table"
                className="data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-white/50"
              >
                <div className="flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  Q&A Table
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="transcript"
                className="data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-white/50"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Transcript
                </div>
              </TabsTrigger>
            </TabsList>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-6 space-y-6"
            >
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Performance Summary Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Performance Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Metric</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">
                              Overall Performance
                            </TableCell>
                            <TableCell>
                              <div className={`text-2xl font-bold ${getScoreColor(
                                analysisResult.interview_insights.overall_performance_score
                              )}`}>
                                {analysisResult.interview_insights.overall_performance_score}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  analysisResult.interview_insights
                                    .overall_performance_score >= 80
                                    ? "default"
                                    : analysisResult.interview_insights
                                        .overall_performance_score >= 60
                                    ? "secondary"
                                    : "destructive"
                                }
                                className={getPerformanceColor(
                                  analysisResult.interview_insights.overall_performance_score
                                )}
                              >
                                {analysisResult.interview_insights
                                  .overall_performance_score >= 90
                                  ? "Outstanding"
                                  : analysisResult.interview_insights
                                      .overall_performance_score >= 80
                                  ? "Excellent"
                                  : analysisResult.interview_insights
                                      .overall_performance_score >= 70
                                  ? "Good"
                                  : analysisResult.interview_insights
                                      .overall_performance_score >= 60
                                  ? "Satisfactory"
                                  : analysisResult.interview_insights
                                      .overall_performance_score >= 50
                                  ? "Needs Improvement"
                                  : "Poor"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              Communication
                            </TableCell>
                            <TableCell>
                              <div className={`text-2xl font-bold ${getScoreColor(
                                analysisResult.interview_insights.communication_clarity
                              )}`}>
                                {analysisResult.interview_insights.communication_clarity}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  analysisResult.interview_insights
                                    .communication_clarity >= 80
                                    ? "default"
                                    : analysisResult.interview_insights
                                        .communication_clarity >= 60
                                    ? "secondary"
                                    : "destructive"
                                }
                                className={getPerformanceColor(
                                  analysisResult.interview_insights.communication_clarity
                                )}
                              >
                                {analysisResult.interview_insights
                                  .communication_clarity >= 80
                                  ? "Clear"
                                  : analysisResult.interview_insights
                                      .communication_clarity >= 60
                                  ? "Adequate"
                                  : "Unclear"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              Technical Depth
                            </TableCell>
                            <TableCell>
                              <div className={`text-2xl font-bold ${getScoreColor(
                                analysisResult.interview_insights.technical_depth
                              )}`}>
                                {analysisResult.interview_insights.technical_depth}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  analysisResult.interview_insights
                                    .technical_depth >= 80
                                    ? "default"
                                    : analysisResult.interview_insights
                                        .technical_depth >= 60
                                    ? "secondary"
                                    : "destructive"
                                }
                                className={getPerformanceColor(
                                  analysisResult.interview_insights.technical_depth
                                )}
                              >
                                {analysisResult.interview_insights
                                  .technical_depth >= 80
                                  ? "Deep"
                                  : analysisResult.interview_insights
                                      .technical_depth >= 60
                                  ? "Adequate"
                                  : "Shallow"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              Problem Solving
                            </TableCell>
                            <TableCell>
                              <div className={`text-2xl font-bold ${getScoreColor(
                                analysisResult.interview_insights.problem_solving_ability
                              )}`}>
                                {analysisResult.interview_insights.problem_solving_ability}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  analysisResult.interview_insights
                                    .problem_solving_ability >= 80
                                    ? "default"
                                    : analysisResult.interview_insights
                                        .problem_solving_ability >= 60
                                    ? "secondary"
                                    : "destructive"
                                }
                                className={getPerformanceColor(
                                  analysisResult.interview_insights.problem_solving_ability
                                )}
                              >
                                {analysisResult.interview_insights
                                  .problem_solving_ability >= 80
                                  ? "Strong"
                                  : analysisResult.interview_insights
                                      .problem_solving_ability >= 60
                                  ? "Adequate"
                                  : "Weak"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              Confidence Level
                            </TableCell>
                            <TableCell>
                              <div className={`text-2xl font-bold ${getScoreColor(
                                analysisResult.interview_insights.confidence_level
                              )}`}>
                                {analysisResult.interview_insights.confidence_level}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  analysisResult.interview_insights
                                    .confidence_level >= 80
                                    ? "default"
                                    : analysisResult.interview_insights
                                        .confidence_level >= 60
                                    ? "secondary"
                                    : "destructive"
                                }
                                className={getPerformanceColor(
                                  analysisResult.interview_insights.confidence_level
                                )}
                              >
                                {analysisResult.interview_insights
                                  .confidence_level >= 80
                                  ? "High"
                                  : analysisResult.interview_insights
                                      .confidence_level >= 60
                                  ? "Moderate"
                                  : "Low"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Skills Summary Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Skills Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Skill Level</TableHead>
                            <TableHead>Count</TableHead>
                            <TableHead>Average Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            "Expert",
                            "Advanced",
                            "Intermediate",
                            "Beginner",
                            "Not Demonstrated",
                          ]
                            .map((level) => {
                              const skillsAtLevel =
                                analysisResult.skill_assessments.filter(
                                  (s) => s.level === level
                                );
                              const avgScore =
                                skillsAtLevel.length > 0
                                  ? Math.round(
                                      skillsAtLevel.reduce(
                                        (sum, s) => sum + s.confidence_score,
                                        0
                                      ) / skillsAtLevel.length
                                    )
                                  : 0;

                              if (skillsAtLevel.length === 0) return null;

                              return (
                                <TableRow key={level}>
                                  <TableCell>
                                    <Badge
                                      className={getSkillLevelColor(level)}
                                    >
                                      {level}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {skillsAtLevel.length}
                                  </TableCell>
                                  <TableCell>{avgScore}%</TableCell>
                                </TableRow>
                              );
                            })
                            .filter(Boolean)}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* Q&A Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Q&A Performance Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Grade</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Average Score</TableHead>
                          <TableHead>Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          "Excellent",
                          "Good",
                          "Average",
                          "Below Average",
                          "Poor",
                        ]
                          .map((grade) => {
                            const qaAtGrade =
                              analysisResult.questions_and_answers.filter(
                                (qa) => qa.grade === grade
                              );
                            const avgScore =
                              qaAtGrade.length > 0
                                ? Math.round(
                                    qaAtGrade.reduce(
                                      (sum, qa) => sum + qa.score,
                                      0
                                    ) / qaAtGrade.length
                                  )
                                : 0;
                            const percentage = Math.round(
                              (qaAtGrade.length /
                                analysisResult.questions_and_answers.length) *
                                100
                            );

                            if (qaAtGrade.length === 0) return null;

                            return (
                              <TableRow key={grade}>
                                <TableCell>
                                  <Badge className={getGradeColor(grade)}>
                                    {grade}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {qaAtGrade.length}
                                </TableCell>
                                <TableCell>{avgScore}/100</TableCell>
                                <TableCell>{percentage}%</TableCell>
                              </TableRow>
                            );
                          })
                          .filter(Boolean)}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Performance Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          data={[
                            {
                              name: "Overall",
                              value:
                                analysisResult.interview_insights
                                  .overall_performance_score,
                            },
                            {
                              name: "Communication",
                              value:
                                analysisResult.interview_insights
                                  .communication_clarity,
                            },
                            {
                              name: "Technical",
                              value:
                                analysisResult.interview_insights
                                  .technical_depth,
                            },
                            {
                              name: "Problem Solving",
                              value:
                                analysisResult.interview_insights
                                  .problem_solving_ability,
                            },
                            {
                              name: "Confidence",
                              value:
                                analysisResult.interview_insights
                                  .confidence_level,
                            },
                          ]}
                        >
                          <PolarGrid />
                          <PolarAngleAxis dataKey="name" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} />
                          <Radar
                            name="Performance"
                            dataKey="value"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.6}
                          />
                          <Tooltip />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Skill Level Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getSkillLevelData(
                              analysisResult.skill_assessments
                            )}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} (${(percent || 0 * 100).toFixed(0)}%)`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {getSkillLevelData(
                              analysisResult.skill_assessments
                            ).map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Q&A Grade Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getQAGradeData(
                          analysisResult.questions_and_answers
                        )}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Questions" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Interview Insights Tab */}
              <TabsContent value="insights" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {
                          analysisResult.interview_insights
                            .overall_performance_score
                        }
                      </div>
                      <div className="text-sm text-gray-600">Overall Score</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {
                          analysisResult.interview_insights
                            .communication_clarity
                        }
                      </div>
                      <div className="text-sm text-gray-600">Communication</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {analysisResult.interview_insights.technical_depth}
                      </div>
                      <div className="text-sm text-gray-600">
                        Technical Depth
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {
                          analysisResult.interview_insights
                            .problem_solving_ability
                        }
                      </div>
                      <div className="text-sm text-gray-600">
                        Problem Solving
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-teal-600">
                        {analysisResult.interview_insights.confidence_level}
                      </div>
                      <div className="text-sm text-gray-600">Confidence</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-600">
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysisResult.interview_insights.strengths.map(
                          (strength, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{strength}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-orange-600">
                        Areas for Improvement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysisResult.interview_insights.weaknesses.map(
                          (weakness, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{weakness}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Hiring Recommendation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">
                      {analysisResult.interview_insights.hiring_recommendation}
                    </p>
                    <div>
                      <h4 className="font-medium mb-2">Next Steps:</h4>
                      <ul className="space-y-1">
                        {analysisResult.interview_insights.next_steps.map(
                          (step, index) => (
                            <li
                              key={index}
                              className="text-sm flex items-start gap-2"
                            >
                              <span className="text-blue-500">•</span>
                              {step}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Skills Assessment Tab */}
              <TabsContent value="skills" className="space-y-4">
                <ScrollArea className="h-[600px] px-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {analysisResult.skill_assessments.map((skill, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="border-2 hover:shadow-lg transition-all duration-300">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg font-semibold">
                                {skill.skill}
                              </CardTitle>
                              <Badge className={`${getSkillLevelColor(skill.level)} px-3 py-1`}>
                                {skill.level}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Progress
                                value={skill.confidence_score}
                                className={`flex-1 ${getProgressColor(skill.confidence_score)}`}
                              />
                              <span className={`text-sm font-medium ${getScoreColor(skill.confidence_score)}`}>
                                {skill.confidence_score}%
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Evidence
                              </h4>
                              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                {skill.evidence}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                                Recommendations
                              </h4>
                              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                                {skill.recommendations}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Skills Table Tab */}
              <TabsContent value="skills-table">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TableIcon className="h-5 w-5" />
                      Skills Assessment Table
                    </CardTitle>
                    <CardDescription>
                      Tabular view of all assessed skills with scores and
                      recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <ScrollArea className="h-[500px] w-full">
                        <div className="w-full">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Skill</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Confidence Score</TableHead>
                                <TableHead>Evidence</TableHead>
                                <TableHead>Recommendations</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {analysisResult.skill_assessments.map(
                                (skill, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">
                                      {skill.skill}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        className={getSkillLevelColor(
                                          skill.level
                                        )}
                                      >
                                        {skill.level}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Progress
                                          value={skill.confidence_score}
                                          className={`flex-1 ${getProgressColor(skill.confidence_score)}`}
                                        />
                                        <span className="text-sm font-medium">
                                          {skill.confidence_score}%
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs">
                                      <div
                                        className="text-sm text-gray-600 truncate"
                                        title={skill.evidence}
                                      >
                                        {skill.evidence.length > 100
                                          ? `${skill.evidence.substring(
                                              0,
                                              100
                                            )}...`
                                          : skill.evidence}
                                      </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs">
                                      <div
                                        className="text-sm text-gray-600 truncate"
                                        title={skill.recommendations}
                                      >
                                        {skill.recommendations.length > 100
                                          ? `${skill.recommendations.substring(
                                              0,
                                              100
                                            )}...`
                                          : skill.recommendations}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Q&A Analysis Tab */}
              <TabsContent value="qa" className="space-y-4">
                <ScrollArea className="h-[600px] px-4">
                  <div className="space-y-6">
                    {analysisResult.questions_and_answers.map((qa, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="border-2 hover:shadow-lg transition-all duration-300">
                          <CardHeader>
                            <div className="space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <CardTitle className="text-base leading-relaxed flex items-start gap-2">
                                  <MessageSquare className="h-5 w-5 mt-0.5 flex-shrink-0 text-blue-500" />
                                  {qa.question}
                                </CardTitle>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge className={getGradeColor(qa.grade)}>
                                    {qa.grade}
                                  </Badge>
                                  <span className={`text-sm font-medium ${getScoreColor(qa.score)}`}>
                                    {qa.score}/100
                                  </span>
                                </div>
                              </div>
                              <Progress
                                value={qa.score}
                                className={getProgressColor(qa.score)}
                              />
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-blue-500" />
                                Answer
                              </h4>
                              <div className="bg-gray-50 p-4 rounded-md text-sm">
                                {qa.answer}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-medium text-sm flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Feedback
                              </h4>
                              <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-md">
                                {qa.feedback}
                              </p>
                            </div>

                            {qa.key_points_covered.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  Key Points Covered
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {qa.key_points_covered.map((point, pointIndex) => (
                                    <Badge
                                      key={pointIndex}
                                      variant="secondary"
                                      className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
                                    >
                                      {point}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {qa.areas_for_improvement.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-orange-500" />
                                  Areas for Improvement
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {qa.areas_for_improvement.map((area, areaIndex) => (
                                    <Badge
                                      key={areaIndex}
                                      variant="outline"
                                      className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                                    >
                                      {area}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Q&A Table Tab */}
              <TabsContent value="qa-table">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TableIcon className="h-5 w-5" />
                      Q&A Analysis Table
                    </CardTitle>
                    <CardDescription>
                      Tabular view of all questions and answers with grades and
                      feedback
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <ScrollArea className="h-[500px] w-full">
                        <div className="w-full">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Question</TableHead>
                                <TableHead>Answer</TableHead>
                                <TableHead>Grade</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Feedback</TableHead>
                                <TableHead>Key Points</TableHead>
                                <TableHead>Improvements</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {analysisResult.questions_and_answers.map(
                                (qa, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="max-w-xs">
                                      <div
                                        className="text-sm font-medium truncate"
                                        title={qa.question}
                                      >
                                        {qa.question.length > 80
                                          ? `${qa.question.substring(0, 80)}...`
                                          : qa.question}
                                      </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs">
                                      <div
                                        className="text-sm text-gray-600 truncate"
                                        title={qa.answer}
                                      >
                                        {qa.answer.length > 100
                                          ? `${qa.answer.substring(0, 100)}...`
                                          : qa.answer}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        className={getGradeColor(qa.grade)}
                                      >
                                        {qa.grade}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <span className="font-medium">
                                        {qa.score}/100
                                      </span>
                                    </TableCell>
                                    <TableCell className="max-w-xs">
                                      <div
                                        className="text-sm text-gray-600 truncate"
                                        title={qa.feedback}
                                      >
                                        {qa.feedback.length > 100
                                          ? `${qa.feedback.substring(
                                              0,
                                              100
                                            )}...`
                                          : qa.feedback}
                                      </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs">
                                      <div className="flex flex-wrap gap-1">
                                        {qa.key_points_covered
                                          .slice(0, 2)
                                          .map((point, pointIndex) => (
                                            <Badge
                                              key={pointIndex}
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              {point.length > 20
                                                ? `${point.substring(0, 20)}...`
                                                : point}
                                            </Badge>
                                          ))}
                                        {qa.key_points_covered.length > 2 && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            +{qa.key_points_covered.length - 2}{" "}
                                            more
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs">
                                      <div className="flex flex-wrap gap-1">
                                        {qa.areas_for_improvement
                                          .slice(0, 2)
                                          .map((area, areaIndex) => (
                                            <Badge
                                              key={areaIndex}
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {area.length > 20
                                                ? `${area.substring(0, 20)}...`
                                                : area}
                                            </Badge>
                                          ))}
                                        {qa.areas_for_improvement.length >
                                          2 && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            +
                                            {qa.areas_for_improvement.length -
                                              2}{" "}
                                            more
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Transcript Tab */}
              <TabsContent value="transcript">
                <Card>
                  <CardHeader>
                    <CardTitle>Interview Transcript</CardTitle>
                    <CardDescription>
                      Formatted transcript with {analysisResult.file_chunks}{" "}
                      audio chunks processed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
                          {analysisResult.formatted_transcript}
                        </pre>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </motion.div>
          </Tabs>

          <Button
            onClick={() => {
              setAnalysisResult(null);
              setTranscriptText("");
              setSkills("");
              setError(null);
              setProgress(0);
            }}
            variant="outline"
            className={cn(
              "w-full text-lg py-6 border-2",
              "hover:bg-gray-50 transition-all duration-300"
            )}
          >
            Analyze Another Interview
          </Button>
        </motion.div>
      )}
    </div>
  );
}