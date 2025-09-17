"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Brain, Loader2, LinkIcon, Copy, ArrowLeft, LayoutDashboard, Plus, Video, Sparkles, BarChart3, Database, FileText } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";
import { Meteors } from "@/components/magicui/meteors";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { MagicCard } from "@/components/magicui/magic-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileUpload } from "@/components/FileUpload";

interface Record {
  id: string;
  jobTitle: string;
  skills: Array<{
    id: string;
    name: string;
    level: string;
  }>;
  questions: Array<{
    id: string;
    content: string;
  }>;
  skillsCount: number;
  questionsCount: number;
  createdAt: string;
}

interface Interview {
  id: string;
  recordId: string;
  jobTitle: string;
  roomId: string;
  accessCode: string;
  createdAt: string;
}

export default function CreateInterviewPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [uploadRecordId, setUploadRecordId] = useState<string | null>(null);
  const [viewRecordId, setViewRecordId] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewQuestions, setViewQuestions] = useState<any[]>([]);
  const [viewSortSource, setViewSortSource] = useState<"none" | "resumeFirst" | "jdFirst">("none");
  const router = useRouter();

  useEffect(() => {
    fetchRecords();
    fetchInterviews();
  }, []);

  const fetchRecords = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      console.log("Fetching records from API...");
      const response = await fetch("/api/records");
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch records. Status: ${response.status}`, errorText);
        throw new Error(`Failed to fetch records. Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Records fetched successfully:", data.length);
      setRecords(data);
    } catch (error) {
      console.error("Error fetching records:", error);
      toast.error("Failed to load records. Please check console for details.");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const fetchInterviews = async () => {
    try {
      const response = await fetch("/api/interviews");
      if (response.ok) {
        const data = await response.json();
        setInterviews(data);
      }
    } catch (error) {
      console.error("Error fetching interviews:", error);
    }
  };

  const createInterview = async (recordId: string) => {
    setCreating(recordId);
    try {
      const response = await fetch("/api/create-interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recordId }),
      });

      if (!response.ok) throw new Error("Failed to create interview");
      
      const data = await response.json();
      toast.success("Interview created successfully");
      fetchInterviews(); // Refresh the interviews list
    } catch (error) {
      console.error("Error creating interview:", error);
      toast.error("Failed to create interview");
    } finally {
      setCreating(null);
    }
  };

  const copyAccessCode = (accessCode: string) => {
    navigator.clipboard.writeText(accessCode);
    toast.success("Access code copied to clipboard");
  };

  const handleResumeUploaded = async (recordId: string, _url: string, resumeText?: string | null) => {
    try {
      if (!resumeText || resumeText.trim().length < 50) {
        toast.error("Resume parsing failed or too short. Please upload a valid PDF.");
        return;
      }
      toast.info("Generating questions from resume...", {
        duration: 10000,
      });
      const resp = await fetch(`/api/records/${recordId}/resume-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, count: 4 }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to generate questions from resume");
      }
      const j = await resp.json();
      toast.success(`Created ${j?.created || 0} resume questions`);
      setUploadRecordId(null);
      fetchRecords({ silent: true });
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate questions from resume");
    }
  };

  const openViewQuestions = async (recordId: string) => {
    try {
      setViewRecordId(recordId);
      setViewLoading(true);
      const resp = await fetch(`/api/records/${recordId}/questions`);
      if (!resp.ok) throw new Error("Failed to fetch questions");
      const j = await resp.json();
      const questions = Array.isArray(j?.questions) ? j.questions : [];
      setViewQuestions(questions);
    } catch (e) {
      toast.error("Failed to load questions");
      setViewQuestions([]);
    } finally {
      setViewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Meteors />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Loader2 className="h-12 w-12 animate-spin text-[#2663FF]" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-[#5B5F79] font-medium"
          >
            Loading interview data...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-[#1D244F] font-sans relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2663FF]/10 via-[#1D244F]/5 to-white opacity-30"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2663FF]/10 via-transparent to-transparent"></div>
      <Meteors />

      <div className="container mx-auto p-6 space-y-8 relative z-10">
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
        <motion.div 
          className="flex items-center justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="space-y-4 text-center justify-center">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-full border border-[#2663FF]/30 backdrop-blur-sm mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles className="w-4 h-4 text-[#2663FF]" />
              <span className="text-sm font-medium">AI-Powered Interview Creation</span>
            </motion.div>

            <h1 className="text-4xl font-bold tracking-tight text-center justify-center">
              Create{" "}
              <span className="relative">
                <AnimatedGradientText className="bg-gradient-to-r from-[#1D244F] via-[#2663FF] to-[#2663FF] bg-clip-text text-transparent">
                  Interview Session
                </AnimatedGradientText>
                <motion.div
                  className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#2663FF] to-[#1D244F] rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                />
              </span>
            </h1>
            <p className="text-[#5B5F79] text-lg">
              Select a job description record to create an interview session
            </p>
          </div>

          {/* <motion.div 
            className="flex gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Button
              variant="outline"
              asChild
              className="border-[#2663FF]/20 hover:bg-[#2663FF]/5 transition-all duration-300"
            >
              <Link href="/jd-qna" className="flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2 text-[#2663FF]" />
                Back to JD-QnA
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-[#2663FF]/20 hover:bg-[#2663FF]/5 transition-all duration-300"
            >
              <Link href="/interview-evaluation" className="flex items-center">
                <Video className="h-4 w-4 mr-2 text-[#2663FF]" />
                Interview Evaluation
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-[#2663FF]/20 hover:bg-[#2663FF]/5 transition-all duration-300"
            >
              <Link href="/jd-qna/dashboard" className="flex items-center">
                <LayoutDashboard className="h-4 w-4 mr-2 text-[#2663FF]" />
                Dashboard
              </Link>
            </Button>
          </motion.div> */}
        </motion.div>

      {/* Active Interviews Section */}
      {interviews.length > 0 && (
        <Card className="border border-[#F7F7FA] shadow-lg hover:shadow-xl transition-all duration-300 relative z-10">
          <CardHeader className="bg-gradient-to-r from-[#2663FF]/10 to-transparent border-b border-[#F7F7FA]">
            <CardTitle className="text-2xl font-bold text-[#1D244F] flex items-center">
              <Video className="h-5 w-5 mr-2 text-[#2663FF]" />
              Active Interviews
            </CardTitle>
            <CardDescription className="text-[#5B5F79] text-base">
              Manage your existing interview sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-white">
                <TableRow className="hover:bg-[#F7F7FA]/50">
                  <TableHead className="text-[#1D244F] font-bold">Job Title</TableHead>
                  <TableHead className="text-[#1D244F] font-bold">Room ID</TableHead>
                  <TableHead className="text-[#1D244F] font-bold">Access Code</TableHead>
                  <TableHead className="text-[#1D244F] font-bold">Created</TableHead>
                  <TableHead className="text-[#1D244F] font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map((interview) => (
                  <TableRow key={interview.id} className="hover:bg-[#F7F7FA]/50 transition-colors duration-200">
                    <TableCell className="font-medium text-[#1D244F]">
                      {interview.jobTitle}
                    </TableCell>
                    <TableCell className="text-[#5B5F79]">{interview.roomId}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <span className="font-mono bg-[#2663FF]/10 p-1.5 rounded-md text-[#2663FF] font-medium">
                        {interview.accessCode}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyAccessCode(interview.accessCode)}
                        className="text-[#5B5F79] hover:text-[#2663FF] hover:bg-[#2663FF]/10 transition-colors duration-200"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-[#5B5F79]">
                      {new Date(interview.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-[#F7F7FA] text-[#2663FF] hover:bg-[#2663FF]/10 shadow-sm transition-all duration-200"
                          onClick={() => router.push(`/interview?code=${interview.accessCode}`)}
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Join Interview
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Records Selection Section */}
      <Card className="border border-[#F7F7FA] shadow-lg hover:shadow-xl transition-all duration-300 relative z-10">
        <CardHeader className="bg-gradient-to-r from-[#f7a828]/10 to-transparent border-b border-[#F7F7FA]">
          <CardTitle className="text-2xl font-bold text-[#1D244F] flex items-center">
            <Plus className="h-5 w-5 mr-2 text-[#f7a828]" />
            Available Records
          </CardTitle>
          <CardDescription className="text-[#5B5F79] text-base">
            Select a job description record to create an interview
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white">
              <TableRow className="hover:bg-[#F7F7FA]/50">
                <TableHead className="text-[#1D244F] font-bold">Job Title</TableHead>
                <TableHead className="text-[#1D244F] font-bold">Skills</TableHead>
                <TableHead className="text-[#1D244F] font-bold">Questions</TableHead>
                <TableHead className="text-[#1D244F] font-bold">Created</TableHead>
                <TableHead className="text-[#1D244F] font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length > 0 ? (
                records.map((record) => (
                  <TableRow key={record.id} className="hover:bg-[#F7F7FA]/50 transition-colors duration-200">
                    <TableCell className="font-medium text-[#1D244F]">
                      {record.jobTitle}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {record.skills.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-[#2663FF]/10 text-[#2663FF] border-none px-2.5 py-1 font-medium">
                            {skill.name}
                          </Badge>
                        ))}
                        {record.skills.length > 3 && (
                          <Badge variant="outline" className="border-[#F7F7FA] text-[#5B5F79] px-2.5 py-1">
                            +{record.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[#5B5F79]">{record.questionsCount} questions</TableCell>
                    <TableCell className="text-[#5B5F79]">
                      {new Date(record.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => setUploadRecordId(record.id)}
                          variant="outline"
                          size="sm"
                          className="border-[#F7F7FA] text-[#2663FF] hover:bg-[#2663FF]/10 shadow-sm transition-all duration-200"
                        >
                          Upload Resume
                        </Button>
                        <Button
                          onClick={() => openViewQuestions(record.id)}
                          variant="outline"
                          size="sm"
                          className="border-[#F7F7FA] text-[#2663FF] hover:bg-[#2663FF]/10 shadow-sm transition-all duration-200"
                        >
                          View Questions
                        </Button>
                        <Button
                          onClick={() => createInterview(record.id)}
                          disabled={creating === record.id}
                          className={`bg-[#f7a828] hover:bg-[#f7a828]/90 text-white shadow-md hover:shadow-lg hover:shadow-[#f7a828]/25 transform hover:-translate-y-0.5 transition-all duration-300 ${
                            creating === record.id ? "opacity-70" : ""
                          }`}
                          size="sm"
                        >
                          {creating === record.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Brain className="mr-2 h-4 w-4" />
                              Create Interview
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 py-8">
                      <div className="bg-[#F7F7FA] rounded-full p-3">
                        <Plus className="h-6 w-6 text-[#5B5F79]" />
                      </div>
                      <p className="text-[#5B5F79] font-medium">No records found</p>
                      <p className="text-[#5B5F79] text-sm">Generate questions in JD-QnA first</p>
                      <Link href="/jd-qna">
                        <Button variant="outline" className="mt-2 border-[#F7F7FA] text-[#2663FF] hover:bg-[#2663FF]/10 shadow-sm">
                          Go to JD-QnA
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="border-t border-[#F7F7FA] bg-gradient-to-r from-[#F7F7FA]/50 to-white py-4">
          <div className="text-[#5B5F79] text-sm flex items-center">
            <Brain className="h-4 w-4 mr-2 text-[#2663FF]" />
            Create a new interview session from an existing set of questions
          </div>
        </CardFooter>
      </Card>
      {/* Upload Resume Dialog */}
      <Dialog open={!!uploadRecordId} onOpenChange={(open) => !open && setUploadRecordId(null)}>
        <DialogContent className="bg-white border-[#F7F7FA]">
          <DialogHeader>
            <DialogTitle className="text-[#1D244F]">Upload Resume (PDF)</DialogTitle>
            <DialogDescription className="text-[#5B5F79]">
              Upload a candidate resume to auto-generate 3–4 tailored questions for this record.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {uploadRecordId && (
              <FileUpload
                acceptedFileTypes=".pdf"
                label="Upload Resume"
                parseToText
                folder="resumes"
                onFileUploaded={(url, text) => {
                  try {
                    toast.success("Resume parsed — generating questions…");
                  } catch {}
                  const rid = uploadRecordId;
                  setUploadRecordId(null);
                  if (rid) {
                    handleResumeUploaded(rid, url, text);
                  }
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-[#2663FF]/30 text-[#2663FF] hover:bg-[#2663FF]/10" onClick={() => setUploadRecordId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Questions Dialog */}
      <Dialog open={!!viewRecordId} onOpenChange={(open) => !open && setViewRecordId(null)}>
        <DialogContent className="bg-white border-[#F7F7FA] max-w-6xl max-h-[70vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1D244F]">Questions</DialogTitle>
            <DialogDescription className="text-[#5B5F79]">
              Questions associated with this record. Resume-sourced questions are tagged.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            {viewLoading ? (
              <div className="flex items-center gap-2 text-[#5B5F79]"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-[#5B5F79]">Sort</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewSortSource === "none" ? "default" : "outline"}
                      className={viewSortSource === "none" ? "bg-[#2663FF] text-black" : "border-[#2663FF]/30 text-[#2663FF] hover:bg-[#2663FF]/10 hover:shadow-sm"}
                      size="sm"
                      onClick={() => setViewSortSource("none")}
                    >
                      Default
                    </Button>
                    <Button
                      variant={viewSortSource === "resumeFirst" ? "default" : "outline"}
                      className={viewSortSource === "resumeFirst" ? "bg-[#2663FF] text-black" : "border-[#2663FF]/30 text-[#2663FF] hover:bg-[#2663FF]/10 hover:shadow-sm"}
                      size="sm"
                      onClick={() => setViewSortSource("resumeFirst")}
                    >
                      Resume first
                    </Button>
                    <Button
                      variant={viewSortSource === "jdFirst" ? "default" : "outline"}
                      className={viewSortSource === "jdFirst" ? "bg-[#2663FF] text-black" : "border-[#2663FF]/30 text-[#2663FF] hover:bg-[#2663FF]/10 hover:shadow-sm"}
                      size="sm"
                      onClick={() => setViewSortSource("jdFirst")}
                    >
                      JD first
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[420px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skill</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Coding</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewQuestions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-[#5B5F79]">No questions yet</TableCell>
                      </TableRow>
                    ) : (
                      [...viewQuestions]
                        .sort((a: any, b: any) => {
                          if (viewSortSource === "none") return 0;
                          const getSource = (qq: any) => {
                            try { const cc = JSON.parse(qq?.content || '{}');
                              return cc?.source === 'resume' || (Array.isArray(cc?.tags) && cc.tags.includes('resume')) ? 'resume' : 'jd';
                            } catch { return 'jd'; }
                          };
                          const sa = getSource(a);
                          const sb = getSource(b);
                          if (viewSortSource === "resumeFirst") {
                            if (sa === sb) return 0; return sa === 'resume' ? -1 : 1;
                          }
                          if (sa === sb) return 0; return sa === 'jd' ? -1 : 1;
                        })
                        .map((q: any) => {
                        let parsed: any = {};
                        try { parsed = JSON.parse(q?.content || '{}'); } catch {}
                        const source = parsed?.source === 'resume' || (Array.isArray(parsed?.tags) && parsed.tags.includes('resume')) ? 'resume' : 'jd';
                        const coding = parsed?.coding === true || String(parsed?.questionFormat||'').toLowerCase() === 'coding';
                        return (
                          <TableRow key={q.id}>
                            <TableCell className="text-[#1D244F]">{q?.skill?.name || '-'}</TableCell>
                            <TableCell>{parsed?.category || 'Technical'}</TableCell>
                            <TableCell>{parsed?.questionFormat || 'Scenario'}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${coding ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-gray-50 text-gray-800 border-gray-200'}`}>
                                {coding ? 'Yes' : 'No'}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[520px]">
                              <div className="whitespace-normal break-words text-[#1D244F]">
                                {parsed?.question || '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {source === 'resume' ? (
                                <Badge variant="secondary" className="bg-[#f7a828]/10 text-[#f7a828] border-[#f7a828]/20">Resume</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-[#2663FF]/10 text-[#2663FF] border-none">JD</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                </ScrollArea>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-[#2663FF]/30 text-[#2663FF] hover:bg-[#2663FF]/10" onClick={() => setViewRecordId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </main>
  );
}
