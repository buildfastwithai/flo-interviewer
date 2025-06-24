"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  AlertCircle,
  Star,
  TrendingUp,
  Brain,
  MessageSquare,
  Download,
  FileText,
  User,
  Calendar,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { SkillAssessment, QuestionAnswer, InterviewInsights, AnalysisResponse } from "@/components/interview-analysis";
import { generateInterviewPDF } from "@/components/interview-analysis-pdf";

export default function AnalysisResultPage() {
  const searchParams = useSearchParams();
  const interviewId = searchParams.get("id");
  const analysisId = searchParams.get("analysisId");
  
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interviewData, setInterviewData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

  useEffect(() => {
    if (!interviewId) {
      setError("No interview ID provided");
      setLoading(false);
      return;
    }

    const fetchInterviewData = async () => {
      try {
        const response = await fetch(`/api/interview-data?interviewId=${interviewId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch interview data");
        }
        const result = await response.json();
        setInterviewData(result.data);
        
        // First check if there's an existing analysis in the database
        const analysisResponse = await fetch(`/api/interview-data/${interviewId}/analysis`);
        if (analysisResponse.ok) {
          // If analysis exists in the database, use it
          const analysisData = await analysisResponse.json();
          setAnalysisResult(analysisData.data);
          setLoading(false);
          return;
        }
        console.log("analysisId", analysisId);
        
        // If no analysis exists or we need a new one
        if (analysisId && analysisId !== 'new') {
          // Fetch existing analysis by ID if specified
          const specificAnalysisResponse = await fetch(`/api/interview-analysis/${analysisId}`);
          if (specificAnalysisResponse.ok) {
            const analysisData = await specificAnalysisResponse.json();
            setAnalysisResult(analysisData);
          }
        } else {
          // Start a new analysis if none exists
          performAnalysis(result.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewData();
  }, [interviewId, analysisId]);

  const performAnalysis = async (data: any) => {
    if (!data || !data.transcript) return;
    
    setAnalyzing(true);
    try {
      // Format transcript for analysis
      let transcript = data.transcript;
      try {
        // Parse the JSON transcript and format it for analysis
        const transcriptObj = JSON.parse(transcript);
        transcript = transcriptObj.map((entry: any) => 
          `${entry.speaker === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${entry.text}`
        ).join('\n\n');
        console.log("Successfully formatted transcript from JSON");
      } catch (e) {
        console.error("Error parsing transcript JSON:", e);
        // If we can't parse as JSON, use as is
      }
      
      // Create form data for analysis
      const formData = new FormData();
      const textBlob = new Blob([transcript], { type: 'text/plain' });
      formData.append('file', textBlob, 'transcript.txt');
      
      // Add other fields
      formData.append('skills_to_assess', 'Communication, Technical Knowledge, Problem Solving, Collaboration, Leadership');
      formData.append('job_role', data.interview?.jobTitle || 'Software Engineer');
      formData.append('company_name', 'Your Company');
      
      // Send request to analysis API
      const response = await fetch('/api/analyze-interview', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      
      const result = await response.json();
      
      setAnalysisResult(result);
      
      // Store analysis result
      await fetch(`/api/interview-data/${interviewId}/analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: result }),
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
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
      case "Expert": return "bg-green-500";
      case "Advanced": return "bg-blue-500";
      case "Intermediate": return "bg-yellow-500";
      case "Beginner": return "bg-orange-500";
      case "Not Demonstrated": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "Excellent": return "text-green-600 bg-green-50 border-green-200";
      case "Good": return "text-blue-600 bg-blue-50 border-blue-200";
      case "Average": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "Below Average": return "text-orange-600 bg-orange-50 border-orange-200";
      case "Poor": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
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

  const downloadPDF = (includeTranscript: boolean = false) => {
    if (!analysisResult) return;
    
    if (includeTranscript) {
      generateInterviewPDF(analysisResult, {
        includeRawData: false,
      });
    } else {
      generateInterviewPDF(analysisResult, {
        includeRawData: false,
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading interview data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href="..">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Interviews
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href="/interview-evaluation">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Interviews
            </Link>
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Analyzing Interview</CardTitle>
            <CardDescription>
              Our AI is analyzing the interview transcript. This may take a few minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-sm text-gray-500 animate-pulse">Extracting insights from the interview...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href="..">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Interviews
            </Link>
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>No Analysis Available</CardTitle>
            <CardDescription>
              The interview analysis could not be found or has not been generated yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => interviewData && performAnalysis(interviewData)}>
              Generate Analysis Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <Button asChild variant="outline">
          <Link href="..">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Interviews
          </Link>
        </Button>
        
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => downloadPDF(false)}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          {/* <Button 
            variant="default" 
            onClick={() => downloadPDF(true)}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Download with Transcript
          </Button> */}
        </div>
      </div>
      
      {/* Interview Info Card */}
      {interviewData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Interview Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Candidate:</span>
                  <span className="ml-2">{interviewData.interview?.candidateName || 'Unknown'}</span>
                </div>
                <div className="flex items-center text-sm">
                  {/* <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" /> */}
                  <span className="font-medium">Position:</span>
                  <span className="ml-2">{interviewData.interview?.jobTitle || 'Unknown'}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Date:</span>
                  <span className="ml-2">
                    {interviewData.startTime ? new Date(interviewData.startTime).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Duration:</span>
                  <span className="ml-2">{interviewData.duration} minutes</span>
                </div>
              </div>
              
              <div className="flex items-center justify-center">
                <Badge 
                  className={
                    analysisResult.interview_insights?.overall_performance_score >= 80
                      ? "bg-green-500"
                      : analysisResult.interview_insights?.overall_performance_score >= 60
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }
                >
                  Overall Score: {analysisResult.interview_insights?.overall_performance_score}/100
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Analysis Summary */}
      <Card className="mb-6 overflow-hidden bg-gradient-to-br from-white to-blue-50/30">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Star className="h-6 w-6 text-yellow-500" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="prose max-w-none text-lg leading-relaxed">
            <p className="whitespace-pre-wrap">{analysisResult.analysis_summary}</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Main Content */}
      <Tabs defaultValue="insights" className="mb-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="insights">
            <Brain className="mr-2 h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="skills">
            <Star className="mr-2 h-4 w-4" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="questions">
            <MessageSquare className="mr-2 h-4 w-4" />
            Q&A Analysis
          </TabsTrigger>
          <TabsTrigger value="strengths">
            <CheckCircle className="mr-2 h-4 w-4" />
            Strengths & Weaknesses
          </TabsTrigger>
          <TabsTrigger value="transcript">
            <FileText className="mr-2 h-4 w-4" />
            Transcript
          </TabsTrigger>
        </TabsList>
        
        {/* Insights Tab */}
        <TabsContent value="insights" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analysisResult.interview_insights?.overall_performance_score}
                </div>
                <div className="text-sm text-gray-600">Overall Score</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analysisResult.interview_insights?.communication_clarity}
                </div>
                <div className="text-sm text-gray-600">Communication</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analysisResult.interview_insights?.technical_depth}
                </div>
                <div className="text-sm text-gray-600">Technical Depth</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {analysisResult.interview_insights?.problem_solving_ability}
                </div>
                <div className="text-sm text-gray-600">Problem Solving</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-teal-600">
                  {analysisResult.interview_insights?.confidence_level}
                </div>
                <div className="text-sm text-gray-600">Confidence</div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Hiring Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-4">
                {analysisResult.interview_insights?.hiring_recommendation}
              </p>
              <div>
                <h4 className="font-medium mb-2">Next Steps:</h4>
                <ul className="space-y-1">
                  {analysisResult.interview_insights?.next_steps.map(
                    (step, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2"
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
        
        {/* Skills Tab */}
        <TabsContent value="skills" className="mt-6">
          <ScrollArea className="h-[600px] px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analysisResult.skill_assessments?.map((skill, index) => (
                <Card key={index} className="border-2 hover:shadow-lg transition-all duration-300">
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
                        className="flex-1"
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
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        {/* Q&A Analysis Tab */}
        <TabsContent value="questions" className="mt-6">
          <ScrollArea className="h-[600px] px-4">
            <div className="space-y-6">
              {analysisResult.questions_and_answers?.map((qa, index) => (
                <Card key={index} className="border-2 hover:shadow-lg transition-all duration-300">
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
                        className="w-full"
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        {/* Strengths & Weaknesses Tab */}
        <TabsContent value="strengths" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysisResult.interview_insights?.strengths.map(
                    (strength, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
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
                  {analysisResult.interview_insights?.weaknesses.map(
                    (weakness, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span>{weakness}</span>
                      </li>
                    )
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
          
          {analysisResult.interview_insights?.red_flags && 
           analysisResult.interview_insights?.red_flags.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-red-600">
                  Red Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysisResult.interview_insights.red_flags.map(
                    (flag, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>{flag}</span>
                      </li>
                    )
                  )}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Transcript Tab */}
        <TabsContent value="transcript" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Interview Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {(() => {
                    try {
                      // Try to parse the transcript as JSON
                      const transcriptEntries = JSON.parse(interviewData.transcript);
                      return transcriptEntries.map((entry: any, index: number) => (
                        <div 
                          key={index}
                          className={`p-3 rounded-lg ${
                            entry.speaker === 'interviewer' 
                              ? 'bg-blue-50 border-l-4 border-blue-400' 
                              : 'bg-green-50 border-l-4 border-green-400'
                          }`}
                        >
                          <div className="flex justify-between mb-1">
                            <div className="font-medium capitalize">
                              {entry.speaker === 'interviewer' ? 'Interviewer' : 'Candidate'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          <div>{entry.text}</div>
                        </div>
                      ));
                    } catch (e) {
                      // If parsing fails, display the formatted transcript from analysis
                      return (
                        <div className="prose max-w-none">
                          <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
                            {analysisResult.formatted_transcript}
                          </pre>
                        </div>
                      );
                    }
                  })()}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 