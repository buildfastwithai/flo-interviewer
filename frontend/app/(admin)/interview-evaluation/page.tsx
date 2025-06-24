"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  FileText,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Briefcase,
  BarChart2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface InterviewData {
  id: string;
  interviewId: string;
  transcript: string;
  startTime: string;
  endTime?: string;
  duration: number;
  analysis?: any;
  createdAt: string;
  updatedAt: string;
  interview: {
    id: string;
    roomId: string;
    jobTitle: string;
    candidateName: string;
    status: string;
    record: {
      id: string;
      jobTitle: string;
    }
  }
}

export default function InterviewEvaluationPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<InterviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const response = await fetch('/api/interview-data/list');
        if (!response.ok) {
          throw new Error('Failed to fetch interviews');
        }
        const data = await response.json();
        setInterviews(data.data);
      } catch (error) {
        console.error('Error fetching interviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, []);

  const generateAnalysis = async (interviewId: string, transcript: string) => {
    // setAnalyzing(interviewId);
    router.push(`/interview-evaluation/analysis?id=${interviewId}&analysisId='new'}`);
    
    // try {
    //   // Format transcript for analysis - convert JSON to text
    //   let formattedTranscript = transcript;
    //   try {
    //     // Parse JSON transcript and format it as plain text
    //     const transcriptObj = JSON.parse(transcript);
    //     formattedTranscript = transcriptObj.map((entry: any) => 
    //       `${entry.speaker === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${entry.text}`
    //     ).join('\n\n');
    //   } catch (e) {
    //     console.error("Error parsing transcript JSON:", e);
    //     // If we can't parse as JSON, use as is
    //   }
      
    //   // Create a FormData object
    //   const formData = new FormData();
      
    //   // Create a text blob from the formatted transcript
    //   const textBlob = new Blob([formattedTranscript], { type: 'text/plain' });
    //   formData.append('file', textBlob, 'transcript.txt');
      
    //   // Add other optional fields
    //   formData.append('skills_to_assess', 'Communication, Technical Knowledge, Problem Solving, Collaboration, Leadership');
    //   formData.append('job_role', 'Software Engineer');
      
    //   // Send request to analysis API
    //   const response = await fetch('/api/analyze-interview', {
    //     method: 'POST',
    //     body: formData,
    //   });
      
    //   if (!response.ok) {
    //     throw new Error('Analysis failed');
    //   }
      
    //   const result = await response.json();
      
    //   // Use the Next.js 13+ App Router pattern
    //   router.push(`/interview-evaluation/analysis?id=${interviewId}&analysisId=${result.id || 'new'}`);
      
    // } catch (error) {
    //   console.error('Error generating analysis:', error);
    //   alert('Failed to generate analysis. Please try again.');
    // } finally {
    //   setAnalyzing(null);
    // }
  };

  // Parse JSON transcript to get some stats
  const getTranscriptStats = (transcriptJson: string) => {
    try {
      const transcript = JSON.parse(transcriptJson);
      const totalMessages = transcript.length;
      const candidateMessages = transcript.filter((msg: any) => msg.speaker === 'candidate').length;
      const interviewerMessages = transcript.filter((msg: any) => msg.speaker === 'interviewer').length;
      
      return {
        totalMessages,
        candidateMessages,
        interviewerMessages
      };
    } catch (e) {
      return { totalMessages: 0, candidateMessages: 0, interviewerMessages: 0 };
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interview Evaluations</h1>
          <p className="text-muted-foreground">
            View and analyze completed interviews
          </p>
        </div>
      </div>

      <Tabs defaultValue="grid" className="mb-8">
        <TabsList>
          <TabsTrigger value="grid" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            <span>Card View</span>
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Table View</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : interviews.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No interviews found</h3>
              <p className="text-muted-foreground">
                Once interviews are completed, they will appear here for analysis.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {interviews.map((interview) => {
                const stats = getTranscriptStats(interview.transcript);
                
                return (
                  <Card key={interview.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{interview.interview.candidateName || 'Unnamed Candidate'}</CardTitle>
                          <CardDescription>{interview.interview.jobTitle || 'Unknown Position'}</CardDescription>
                        </div>
                        <Badge 
                          variant={interview.interview.status === 'COMPLETED' ? 'default' : 'secondary'}
                        >
                          {interview.interview.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>
                            {interview.startTime ? format(new Date(interview.startTime), 'PP') : 'Unknown date'}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{formatDuration(interview.duration)}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <User className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{stats.totalMessages} messages ({stats.candidateMessages} from candidate)</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>Room: {interview.interview.roomId}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <Button 
                        variant="default" 
                        className="w-full"
                        disabled={analyzing === interview.interviewId}
                        onClick={() => generateAnalysis(interview.interviewId, interview.transcript)}
                      >
                        {analyzing === interview.interviewId ? (
                          <>Analyzing...</>
                        ) : (
                          <>
                            <BarChart2 className="mr-2 h-4 w-4" />
                            Generate Analysis
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Interview Records</CardTitle>
              <CardDescription>
                All completed interviews available for analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                        </TableRow>
                      ))
                    ) : interviews.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No interviews found
                        </TableCell>
                      </TableRow>
                    ) : (
                      interviews.map((interview) => {
                        const stats = getTranscriptStats(interview.transcript);
                        
                        return (
                          <TableRow key={interview.id}>
                            <TableCell className="font-medium">
                              {interview.interview.candidateName || 'Unnamed'}
                            </TableCell>
                            <TableCell>{interview.interview.jobTitle || 'Unknown'}</TableCell>
                            <TableCell>
                              {interview.startTime 
                                ? format(new Date(interview.startTime), 'PP') 
                                : 'Unknown'
                              }
                            </TableCell>
                            <TableCell>{formatDuration(interview.duration)}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={interview.interview.status === 'COMPLETED' ? 'default' : 'secondary'}
                              >
                                {interview.interview.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{stats.totalMessages}</TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={analyzing === interview.interviewId}
                                onClick={() => generateAnalysis(interview.interviewId, interview.transcript)}
                              >
                                {analyzing === interview.interviewId ? 'Analyzing...' : 'Analyze'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}