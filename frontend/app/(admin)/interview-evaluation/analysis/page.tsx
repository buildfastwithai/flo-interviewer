"use client";

import { useState, useEffect, Suspense } from "react";
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

// NEW: Extended response type to include enhanced evaluation fields (mock-enabled)
interface ExtendedAnalysisResponse extends AnalysisResponse {
  evaluation_overview?: {
    overall_weighted_score: number;
    overall_recommendation: "Select" | "Review" | "Reject";
    confidence_score: number;
    proctoring_score: number;
  };
  subjective_rubric?: {
    criteria: Array<{
      name: string;
      weight: number;
      score_out_of_5: number;
      weighted_score: number;
      evidence?: string;
    }>;
    total_score_out_of_5: number;
    total_percentage: number;
  };
  objective_scores?: {
    mcq: { total: number; correct: number; score: number };
    coding: { tests_passed: number; tests_total: number; complexity_score: number; score: number };
    overall_score: number;
  };
  weighted_skill_scores?: Array<{
    skill: string;
    score: number;
    weight: number;
    weighted_score: number;
  }>;
  recruiter_settings?: {
    skill_weights: Record<string, number>;
    notes?: string;
  };
  key_moments?: Array<{
    type: "critical_skill" | "project_example" | "struggle";
    title: string;
    excerpt: string;
    related_skill?: string;
    timestamp?: string | null;
    qa_index?: number;
    score?: number;
  }>;
}

// Create a client component to handle search params
function AnalysisContent() {
  const searchParams = useSearchParams();
  const interviewId = searchParams.get("id");
  const analysisId = searchParams.get("analysisId");
  
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [interviewData, setInterviewData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<ExtendedAnalysisResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  // NEW: Local UI state for recruiter weight adjustments and feedback (mock only)
  const [skillWeights, setSkillWeights] = useState<Record<string, number> | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRating, setFeedbackRating] = useState<number>(5);

  useEffect(() => {
    if (analysisResult?.recruiter_settings?.skill_weights) {
      setSkillWeights(analysisResult.recruiter_settings.skill_weights);
    } else if (analysisResult?.skill_assessments) {
      // Initialize uniform weights if not provided
      const uniform = Object.fromEntries(
        analysisResult.skill_assessments.map(sa => [sa.skill, Number((1 / analysisResult.skill_assessments!.length).toFixed(4))])
      );
      setSkillWeights(uniform);
    }
  }, [analysisResult]);

  // NEW: Helpers for new evaluation tab
  const computeWeightedSkills = () => {
    if (!analysisResult?.skill_assessments || !skillWeights) return [] as Array<{ skill: string; score: number; weight: number; weighted: number }>;
    const sum = Object.values(skillWeights).reduce((s, v) => s + v, 0) || 1;
    return analysisResult.skill_assessments.map(sa => {
      const weight = (skillWeights[sa.skill] ?? 0) / sum;
      const weighted = Number(((sa.confidence_score || 0) * weight).toFixed(2));
      return { skill: sa.skill, score: sa.confidence_score || 0, weight: Number(weight.toFixed(4)), weighted };
    });
  };
  const computedWeighted = computeWeightedSkills();
  const computedOverallWeighted = Number((computedWeighted.reduce((s, x) => s + x.weighted, 0)).toFixed(2));

  useEffect(() => {
    if (!interviewId) {
      setError("No interview ID provided");
      setLoading(false);
      return;
    }

    const fetchInterviewData = async () => {
      try {
        // Use the specific interviewData ID directly instead of looking up by interviewId
        const response = await fetch(`/api/interview-data/${interviewId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch interview data");
        }
        
        const result = await response.json();
        const interviewDataRecord = result.data;
        
        if (!interviewDataRecord) {
          throw new Error("No interview data found");
        }
          
        setInterviewData(interviewDataRecord);
        
        // Check for existing analysis in the database
        try {
          console.log(`Checking for existing analysis for interview data ${interviewId}`);
          // Update path to use interviewDataId directly
          const analysisResponse = await fetch(`/api/interview-data/${interviewId}/analysis`);
          
          if (analysisResponse.ok) {
            // If analysis exists in the database, use it
            const analysisData = await analysisResponse.json();
            console.log('Found existing analysis in database:', analysisData.success);
            if (analysisData.success && analysisData.data) {
              setAnalysisResult(analysisData.data);
              setLoading(false);
              return;
            }
          }
          
          // If we got here, no analysis exists in the database
          console.log('No existing analysis found in database');
        } catch (analysisError) {
          console.error('Error fetching existing analysis:', analysisError);
          // Continue with the flow to check for specified analysis ID or generate new
        }
        
        // If specific analysisId is provided and not 'new', try to fetch it
        if (analysisId && analysisId !== 'new') {
          try {
            console.log(`Fetching specific analysis with ID: ${analysisId}`);
            const specificAnalysisResponse = await fetch(`/api/interview-analysis/${analysisId}`);
            if (specificAnalysisResponse.ok) {
              const analysisData = await specificAnalysisResponse.json();
              setAnalysisResult(analysisData);
              setLoading(false);
              return;
            } else {
              console.error('Failed to fetch specified analysis, will generate new');
            }
          } catch (specificAnalysisError) {
            console.error('Error fetching specific analysis:', specificAnalysisError);
          }
        }
        
        // If we get here, either no analysis exists, analysis ID is 'new', 
        // or we failed to fetch a specific analysis
        if (interviewDataRecord) {
          console.log('Starting new analysis generation');
          performAnalysis(interviewDataRecord);
        } else {
          setError('No interview data found');
          setLoading(false);
        }
      } catch (err) {
        console.error("Error retrieving interview data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    fetchInterviewData();
  }, [interviewId, analysisId]);

  const performAnalysis = async (data: any) => {
    if (!data || !data.transcript) return;
    
    setAnalyzing(true);
    setProgress(5);
    setProgressStage('Initializing analysis...');
    setError(null);
    setSuccess(null);

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
        setProgress(15);
        setProgressStage('Transcript formatted');
      } catch (e) {
        console.error("Error parsing transcript JSON:", e);
        // If we can't parse as JSON, use as is
        setProgress(15);
        setProgressStage('Using raw transcript');
      }
      
      // Create form data for analysis
      const formData = new FormData();
      const textBlob = new Blob([transcript], { type: 'text/plain' });
      formData.append('file', textBlob, 'transcript.txt');
      
      // Directly fetch skills from the interview record
      let skillsToAssess = '';
      
      setProgress(20);
      setProgressStage('Fetching skills to assess...');
      
      try {
        // Fetch the full interview data with skills
        const interviewResponse = await fetch(`/api/interview/${data.interview.id}`);
        if (interviewResponse.ok) {
          const interviewData = await interviewResponse.json();
          console.log("Interview data with skills:", interviewData);
          
          if (interviewData.data.record?.skills && interviewData.data.record.skills.length > 0) {
            skillsToAssess = interviewData.data.record.skills
              .map((skill: any) => skill.name)
              .join(', ');
            console.log("Skills extracted from record:", skillsToAssess);
          }
        }
        setProgress(25);
        setProgressStage('Skills retrieved');
      } catch (err) {
        console.error("Error fetching skills:", err);
        setProgress(25);
        setProgressStage('Using default skills');
      }
      
      // If skills couldn't be fetched, use default
      if (!skillsToAssess) {
        skillsToAssess = 'Communication, Technical Knowledge, Problem Solving, Collaboration, Leadership';
        console.log("Using default skills");
      }
      
      // Add other fields
      formData.append('skills_to_assess', skillsToAssess);
      formData.append('job_role', data.interview?.jobTitle || 'Software Engineer');
      formData.append('company_name', 'Your Company');
      
      // Send request to analysis API
      setProgress(30);
      setProgressStage('Sending data for AI analysis...');
      
      // Start progress simulation
      const progressInterval = startProgressSimulation();
      
      // Send request to analysis API
      const response = await fetch('/api/analyze-interview', {
        method: 'POST',
        body: formData,
      });
      
      // Clear the progress simulation when the real response arrives
      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      
      setProgress(95);
      setProgressStage('Processing results...');
      
      const result = await response.json();
      
      setAnalysisResult(result);
      
      setProgress(98);
      setProgressStage('Saving analysis results to database...');
      
      // Store analysis result
      try {
        const saveResponse = await fetch(`/api/interview-data/${interviewId}/analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysis: result }),
        });
        
        if (!saveResponse.ok) {
          console.error('Error saving analysis to database:', await saveResponse.text());
          throw new Error('Failed to save analysis to database');
        }
        
        const saveResult = await saveResponse.json();
        console.log('Analysis saved to database:', saveResult);
        setSuccess('Analysis successfully generated and saved to database!');
      } catch (saveError) {
        console.error('Error saving analysis:', saveError);
        // We still continue since the analysis is available in the UI
        // but we should notify the user about the issue
        setError("Analysis completed, but couldn't save to the database. Your results are available but not permanently stored.");
      }
      
      setProgress(100);
      setProgressStage('Analysis complete!');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setTimeout(() => {
        setAnalyzing(false);
        setProgress(0);
        setProgressStage('');
      }, 1000); // Keep the 100% progress visible for a moment
    }
  };

  // Function to simulate progress during analysis
  const startProgressSimulation = () => {
    // Define the different stages of analysis with their respective progress ranges
    const stages = [
      { range: [30, 40], message: 'Formatting transcript...' },
      { range: [40, 55], message: 'Analyzing skills...' },
      { range: [55, 70], message: 'Analyzing question-answer pairs...' },
      { range: [70, 85], message: 'Generating interview insights...' },
      { range: [85, 95], message: 'Creating summary...' }
    ];
    
    let currentStageIndex = 0;
    
    return setInterval(() => {
      if (currentStageIndex < stages.length) {
        const stage = stages[currentStageIndex];
        const [min, max] = stage.range;
        
        // Calculate a new progress value within the current stage's range
        if (progress < min) {
          setProgress(min);
          setProgressStage(stage.message);
        } else if (progress < max) {
          // Slowly increment progress within the stage
          setProgress(prev => Math.min(prev + 0.5, max));
          
          // If we've reached the max for this stage, move to the next one
          if (progress >= max - 0.5) {
            currentStageIndex++;
          }
        }
      }
    }, 300); // Update progress every 300ms
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
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-in-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">{progressStage}</p>
              <span className="text-sm font-medium">{Math.round(progress)}%</span>
            </div>
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
          <Link href="/interview-evaluation">
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
          <Button 
            variant="outline" 
            onClick={() => performAnalysis(interviewData)}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Generate Analysis
          </Button> 
        </div>
      </div>
      
      {/* Success message */}
      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      {/* Error message */}
      {error && error !== "No interview ID provided" && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* NEW: Top-level tabs for New vs Old evaluation */}
      <Tabs defaultValue="new-eval" className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new-eval">New Evaluation (Scorecard)</TabsTrigger>
          <TabsTrigger value="old-eval">Old Evaluation (Legacy)</TabsTrigger>
        </TabsList>

        {/* NEW VERSION EVALUATION TAB */}
        <TabsContent value="new-eval" className="mt-6 space-y-6">
          {/* Header KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle>Recommendation</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge className={
                  analysisResult?.evaluation_overview?.overall_recommendation === 'Select' ? 'bg-green-600' :
                  analysisResult?.evaluation_overview?.overall_recommendation === 'Reject' ? 'bg-red-600' : 'bg-yellow-600'
                }>
                  {analysisResult?.evaluation_overview?.overall_recommendation || 'Review'}
                </Badge>
                <span className="text-sm text-gray-500">Overall</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle>Weighted Score</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-blue-600">{(analysisResult?.evaluation_overview?.overall_weighted_score ?? computedOverallWeighted).toFixed(0)}</div>
                  <span className="text-sm text-gray-500">/100</span>
                </div>
                <Progress value={analysisResult?.evaluation_overview?.overall_weighted_score ?? computedOverallWeighted} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle>Objective Score</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-purple-600">{analysisResult?.objective_scores?.overall_score?.toFixed?.(0) || 0}</div>
                  <span className="text-sm text-gray-500">/100</span>
                </div>
                <Progress value={analysisResult?.objective_scores?.overall_score || 0} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle>Confidence & Proctoring</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Confidence</span>
                  <span className="font-medium">{analysisResult?.evaluation_overview?.confidence_score || analysisResult?.interview_insights?.confidence_level || 0}</span>
                </div>
                <Progress value={analysisResult?.evaluation_overview?.confidence_score || analysisResult?.interview_insights?.confidence_level || 0} />
                <div className="flex items-center justify-between text-sm">
                  <span>Proctoring</span>
                  <span className="font-medium">{analysisResult?.evaluation_overview?.proctoring_score || 0}</span>
                </div>
                <Progress value={analysisResult?.evaluation_overview?.proctoring_score || 0} />
              </CardContent>
            </Card>
          </div>

          {/* Recruiter Weights & Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skill-wise Performance & Weights</CardTitle>
              <CardDescription>Recruiters can set weighting per skill (mock, not saved)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {analysisResult?.skill_assessments?.map((sa, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-3 text-sm font-medium">{sa.skill}</div>
                    <div className="md:col-span-3 flex items-center gap-2">
                      <Progress value={sa.confidence_score} className="flex-1" />
                      <span className={`text-sm ${getScoreColor(sa.confidence_score)}`}>{sa.confidence_score}%</span>
                    </div>
                    <div className="md:col-span-4 flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={(skillWeights?.[sa.skill] ?? 0) * 100}
                        onChange={(e) => {
                          const next = { ...(skillWeights || {}) };
                          next[sa.skill] = Number(e.target.value) / 100;
                          setSkillWeights(next);
                        }}
                        className="w-full"
                      />
                      <span className="text-xs w-12 text-right">{Math.round(((skillWeights?.[sa.skill] ?? 0) / (Object.values(skillWeights || {}).reduce((s,v)=>s+v,0)||1)) * 100)}%</span>
                    </div>
                    <div className="md:col-span-2 text-right text-sm">
                      {(computedWeighted.find(c => c.skill === sa.skill)?.weighted || 0).toFixed(1)} pts
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <div className="text-sm text-gray-600">Overall Weighted Score</div>
                <div className="text-lg font-semibold">{(analysisResult?.evaluation_overview?.overall_weighted_score ?? computedOverallWeighted).toFixed(1)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Q&A Key Moments */}
          <Card>
            <CardHeader>
              <CardTitle>Key Moments</CardTitle>
              <CardDescription>Important points to review quickly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(analysisResult?.key_moments || []).map((m, i) => (
                  <Card key={i} className="border hover:shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge className={m.type === 'critical_skill' ? 'bg-green-600' : m.type === 'struggle' ? 'bg-red-600' : 'bg-blue-600'}>
                          {m.type.replace('_', ' ')}
                        </Badge>
                        {m.score !== undefined && (
                          <span className={`text-xs ${getScoreColor(m.score)}`}>{m.score}</span>
                        )}
                      </div>
                      <CardTitle className="text-base mt-2">{m.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 mb-2">{m.excerpt}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{m.related_skill || 'General'}</span>
                        {m.timestamp && <span>{new Date(m.timestamp).toLocaleTimeString()}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Subjective Rubric */}
          <Card>
            <CardHeader>
              <CardTitle>Subjective Evaluation (Rubrics)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(analysisResult?.subjective_rubric?.criteria || []).map((c, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{c.name} <span className="text-xs text-gray-500">(wt {Math.round(c.weight * 100)}%)</span></span>
                    <span className="font-medium">{c.score_out_of_5} / 5</span>
                  </div>
                  <Progress value={(c.score_out_of_5 / 5) * 100} />
                  {c.evidence && <div className="text-xs text-gray-500">{c.evidence}</div>}
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t">
                <div className="text-sm text-gray-600">Rubric Total</div>
                <div className="text-lg font-semibold">{analysisResult?.subjective_rubric?.total_percentage || 0}%</div>
              </div>
            </CardContent>
          </Card>

          {/* Recruiter Feedback (Post-MVP, mock only) */}
          <Card>
            <CardHeader>
              <CardTitle>Recruiter Feedback (calibrate AI)</CardTitle>
              <CardDescription>Mock form; not saved</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm">Rating</span>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={feedbackRating}
                  onChange={(e) => setFeedbackRating(Number(e.target.value))}
                >
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <textarea
                className="w-full border rounded p-2 text-sm"
                rows={3}
                placeholder="Share your feedback to calibrate AI (mock)"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('Recruiter feedback (mock):', { rating: feedbackRating, feedbackText });
                    setSuccess('Feedback submitted (mock). Thank you!');
                  }}
                >
                  Submit Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OLD VERSION EVALUATION TAB */}
        <TabsContent value="old-eval" className="mt-6 space-y-6">
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
                      <span className="ml-2">{interviewData.candidateName || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center text-sm">
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

          {/* Main Content (OLD) */}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Main page component
export default function AnalysisResultPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading analysis...</p>
        </div>
      </div>
    }>
      <AnalysisContent />
    </Suspense>
  );
} 