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
  Calendar,
  Clock,
  User,
  Briefcase,
  ArrowRight,
  Star,
  Search,
  Filter,
  RefreshCw,
  ArrowLeft,
  Plus,
  Video,
  BarChart3,
  Database,
  Sparkles,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import Link from "next/link";

interface InterviewData {
  id: string;
  interviewId: string;
  transcript: string;
  startTime: string;
  endTime?: string;
  duration: number;
  analysis?: any;
  candidateName?: string;
  createdAt: string;
  updatedAt: string;
  interview: {
    id: string;
    roomId: string;
    jobTitle: string;
    candidateName?: string;
    status: string;
    record: {
      id: string;
      jobTitle: string;
    }
  }
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
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

export default function InterviewEvaluationPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<InterviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    router.push(`/interview-evaluation/analysis?id=${interviewId}&analysisId='new'}`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/interview-data/list');
      if (!response.ok) {
        throw new Error('Failed to fetch interviews');
      }
      const data = await response.json();
      setInterviews(data.data);
    } catch (error) {
      console.error('Error refreshing interviews:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const filteredInterviews = interviews.filter(interview => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (interview.candidateName || interview.interview.candidateName || '').toLowerCase().includes(searchLower) ||
      interview.interview.jobTitle.toLowerCase().includes(searchLower) ||
      interview.interview.roomId.toLowerCase().includes(searchLower)
    );
  });

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      className="container mx-auto p-6 space-y-8 bg-white relative"
    >
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2663FF]/5 via-transparent to-[#f7a828]/5 pointer-events-none"></div>
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
      <div className="flex flex-col md:flex-row justify-center items-start md:items-center gap-4 mb-6 relative z-10">
        <div className="space-y-2 text-center justify-center">
          <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-full border border-[#2663FF]/30 backdrop-blur-sm mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles className="w-4 h-4 text-[#2663FF]" />
              <span className="text-sm font-medium">AI-Powered Interviews Evaluation</span>
            </motion.div>
          <h1 className="text-4xl font-bold tracking-tight text-[#1D244F]">
            Interview Evaluations
          </h1>
          <p className="text-[#5B5F79] text-lg">
            View and analyze completed interviews
          </p>
        </div>
        {/* <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" asChild className="text-[#1D244F] border-[#F7F7FA] hover:border-[#2663FF]/20 hover:bg-[#2663FF]/5 shadow-sm transition-all duration-300 h-10">
            <Link href="/jd-qna">
              <ArrowLeft className="h-4 w-4 mr-2 text-[#2663FF]" />
              Back to JD-QnA
            </Link>
          </Button>
          <Button variant="outline" asChild className="text-[#1D244F] border-[#F7F7FA] hover:border-[#2663FF]/20 hover:bg-[#2663FF]/5 shadow-sm transition-all duration-300 h-10">
            <Link href="/create-interview">
              <Plus className="h-4 w-4 mr-2 text-[#2663FF]" />
              Create Interview
            </Link>
          </Button>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5B5F79] h-4 w-4" />
            <Input
              placeholder="Search interviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-[#F7F7FA] bg-white focus:border-[#2663FF] focus:ring-[#2663FF]/20 shadow-sm rounded-lg"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-[#F7F7FA] hover:border-[#2663FF]/20 hover:bg-[#2663FF]/5 shadow-sm transition-all duration-300 h-10"
          >
            <RefreshCw className={`h-4 w-4 text-[#5B5F79] ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div> */}
      </div>

      <Tabs defaultValue="grid" className="space-y-6 justify-center relative z-10">
        <TabsList className="bg-[#F7F7FA] border border-[#F7F7FA] p-1 rounded-lg justify-center items-center text-center">
          <TabsTrigger 
            value="grid" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#1D244F] data-[state=active]:shadow-md transition-all duration-300 rounded-md"
          >
            <BarChart className="h-4 w-4 mr-2" />
            <span>Card View</span>
          </TabsTrigger>
          <TabsTrigger 
            value="table" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#1D244F] data-[state=active]:shadow-md transition-all duration-300 rounded-md"
          >
            <FileText className="h-4 w-4 mr-2" />
            <span>Table View</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          {loading ? (
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <motion.div key={i}>
                  <Card className="overflow-hidden border border-[#F7F7FA] shadow-md hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-2 bg-gradient-to-r from-[#2663FF]/10 to-transparent">
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
                </motion.div>
              ))}
            </motion.div>
          ) : filteredInterviews.length === 0 ? (
            <motion.div 
              className="text-center py-16 border border-[#F7F7FA] rounded-lg bg-white shadow-md"
            >
              <div className="bg-[#F7F7FA] rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Video className="h-12 w-12 text-[#5B5F79] opacity-60" />
              </div>
              <h3 className="text-2xl font-bold text-[#1D244F] mb-3">No interviews found</h3>
              <p className="text-[#5B5F79] max-w-md mx-auto text-lg">
                {searchQuery 
                  ? "No interviews match your search criteria. Try adjusting your search terms."
                  : "Once interviews are completed, they will appear here for analysis."}
              </p>
              <Button 
                variant="outline" 
                className="mt-6 border-[#F7F7FA] text-[#2663FF] hover:bg-[#2663FF]/10 shadow-sm transition-all duration-300"
                asChild
              >
                <Link href="/create-interview">
                  <Plus className="h-4 w-4 mr-2" />
                  Create an Interview
                </Link>
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredInterviews.map((interview) => {
                const stats = getTranscriptStats(interview.transcript);
                
                return (
                  <motion.div key={interview.id} >
                    <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 border border-[#F7F7FA] hover:border-[#2663FF]/20">
                      <CardHeader className="pb-3 bg-gradient-to-r from-[#2663FF]/10 to-transparent border-b border-[#F7F7FA]">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl font-bold text-[#1D244F] group-hover:text-[#2663FF] transition-colors">
                              {interview.candidateName || interview.interview.candidateName || 'Unnamed Candidate'}
                            </CardTitle>
                            <CardDescription className="text-[#5B5F79] text-base">
                              {interview.interview.jobTitle || 'Unknown Position'}
                            </CardDescription>
                          </div>
                          <Badge 
                            variant={interview.interview.status === 'COMPLETED' ? 'default' : 'secondary'}
                            className={
                              interview.interview.status === 'COMPLETED' 
                                ? "bg-[#2663FF]/10 text-[#2663FF] border-[#2663FF]/30 font-medium" 
                                : "bg-[#F7F7FA] text-[#5B5F79] border-[#F7F7FA]"
                            }
                          >
                            {interview.interview.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <Calendar className="mr-2 h-4 w-4 text-[#2663FF]" />
                            <span className="text-[#1D244F] font-medium">
                              {interview.startTime ? format(new Date(interview.startTime), 'PP') : 'Unknown date'}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Clock className="mr-2 h-4 w-4 text-[#2663FF]" />
                            <span className="text-[#1D244F] font-medium">{formatDuration(interview.duration)}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <User className="mr-2 h-4 w-4 text-[#2663FF]" />
                            <span className="text-[#1D244F]">
                              {stats.totalMessages} messages ({stats.candidateMessages} from candidate)
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Briefcase className="mr-2 h-4 w-4 text-[#2663FF]" />
                            <span className="text-[#1D244F]">Room: {interview.interview.roomId}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between pt-3 border-t border-[#F7F7FA] bg-gradient-to-r from-[#F7F7FA]/20 to-transparent">
                        <Button 
                          variant="default" 
                          className="w-full bg-[#f7a828] hover:bg-[#f7a828]/90 text-white shadow-md hover:shadow-lg hover:shadow-[#f7a828]/25 transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg"
                          disabled={analyzing === interview.interviewId}
                          onClick={() => generateAnalysis(interview.interviewId, interview.transcript)}
                        >
                          {analyzing === interview.interviewId ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Star className="mr-2 h-4 w-4" />
                              Generate Analysis
                            </>
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="table">
          <Card className="border border-[#F7F7FA] shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#2663FF]/10 to-transparent border-b border-[#F7F7FA]">
              <CardTitle className="text-2xl font-bold text-[#1D244F] flex items-center">
                <FileText className="h-5 w-5 mr-2 text-[#2663FF]" />
                Interview Records
              </CardTitle>
              <CardDescription className="text-[#5B5F79] text-base">
                All completed interviews available for analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow className="hover:bg-[#F7F7FA]/50">
                    <TableHead className="text-[#1D244F] font-bold">Candidate</TableHead>
                    <TableHead className="text-[#1D244F] font-bold">Position</TableHead>
                    <TableHead className="text-[#1D244F] font-bold">Date</TableHead>
                    <TableHead className="text-[#1D244F] font-bold">Duration</TableHead>
                    <TableHead className="text-[#1D244F] font-bold">Status</TableHead>
                    <TableHead className="text-[#1D244F] font-bold">Messages</TableHead>
                    <TableHead className="text-[#1D244F] font-bold">Actions</TableHead>
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
                  ) : filteredInterviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center py-8">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="bg-[#F7F7FA] rounded-full p-3">
                            <Video className="h-6 w-6 text-[#5B5F79]" />
                          </div>
                          <p className="text-[#1D244F] font-medium">No interviews found</p>
                          <p className="text-[#5B5F79] text-sm">
                            {searchQuery 
                              ? "Try adjusting your search criteria"
                              : "Create an interview to get started"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInterviews.map((interview) => {
                      const stats = getTranscriptStats(interview.transcript);
                      
                      return (
                        <TableRow 
                          key={interview.id} 
                          className="hover:bg-[#F7F7FA]/50 transition-colors duration-200"
                        >
                          <TableCell className="font-medium text-[#1D244F]">
                            {interview.candidateName || interview.interview.candidateName || 'Unnamed'}
                          </TableCell>
                          <TableCell className="text-[#1D244F]">
                            {interview.interview.jobTitle || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-[#5B5F79]">
                            {interview.startTime 
                              ? format(new Date(interview.startTime), 'PP') 
                              : 'Unknown'
                            }
                          </TableCell>
                          <TableCell className="text-[#5B5F79]">
                            {formatDuration(interview.duration)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={interview.interview.status === 'COMPLETED' ? 'default' : 'secondary'}
                              className={
                                interview.interview.status === 'COMPLETED' 
                                  ? "bg-[#2663FF]/10 text-[#2663FF] border-[#2663FF]/30 font-medium" 
                                  : "bg-[#F7F7FA] text-[#5B5F79] border-[#F7F7FA]"
                              }
                            >
                              {interview.interview.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#5B5F79]">
                            {stats.totalMessages}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={analyzing === interview.interviewId}
                              onClick={() => generateAnalysis(interview.interviewId, interview.transcript)}
                              className="border-[#F7F7FA] text-[#f7a828] hover:bg-[#f7a828]/10 hover:text-[#f7a828] hover:border-[#f7a828]/30 transition-all duration-300 shadow-sm"
                            >
                              {analyzing === interview.interviewId ? (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  Analyze
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}