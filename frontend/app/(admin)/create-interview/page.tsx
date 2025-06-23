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
import { Brain, Loader2, LinkIcon, Copy } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
  const router = useRouter();

  useEffect(() => {
    fetchRecords();
    fetchInterviews();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Interview</h1>
          <p className="text-muted-foreground">
            Select a job description record to create an interview session
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/jd-qna">
            <Button variant="outline">Back to JD-QnA</Button>
          </Link>
          <Link href="/jd-qna/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Active Interviews Section */}
      {interviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Interviews</CardTitle>
            <CardDescription>
              Manage your existing interview sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Room ID</TableHead>
                  <TableHead>Access Code</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map((interview) => (
                  <TableRow key={interview.id}>
                    <TableCell className="font-medium">
                      {interview.jobTitle}
                    </TableCell>
                    <TableCell>{interview.roomId}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <span className="font-mono bg-gray-100 p-1 rounded">
                        {interview.accessCode}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyAccessCode(interview.accessCode)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      {new Date(interview.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Share
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
      <Card>
        <CardHeader>
          <CardTitle>Available Records</CardTitle>
          <CardDescription>
            Select a job description record to create an interview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length > 0 ? (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.jobTitle}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {record.skills.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="secondary">
                            {skill.name}
                          </Badge>
                        ))}
                        {record.skills.length > 3 && (
                          <Badge variant="outline">
                            +{record.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{record.questionsCount || record.questions.length} questions</TableCell>
                    <TableCell>
                      {new Date(record.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => createInterview(record.id)}
                        disabled={creating === record.id}
                      >
                        {creating === record.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4 mr-2" />
                            Create Interview
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-muted-foreground">
                      No records found. Create job descriptions in the JD-QnA section first.
                    </div>
                    <Link href="/jd-qna">
                      <Button variant="outline" className="mt-4">
                        Go to JD-QnA
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
