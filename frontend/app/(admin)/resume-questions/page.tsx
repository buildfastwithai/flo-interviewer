"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/FileUpload";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Download, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface ResumeData {
  name: string;
  email: string;
  phone?: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year?: string;
  }>;
  summary?: string;
  totalExperience?: string;
}

interface InterviewQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
  difficulty: string;
  skillName: string;
  questionFormat: string;
  coding: boolean;
  source: string;
}

export default function ResumeQuestionsPage() {
  const [step, setStep] = useState<"upload" | "extracted" | "questions">(
    "upload"
  );
  const [resumeUrl, setResumeUrl] = useState<string>("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [questionsPerSkill, setQuestionsPerSkill] = useState(2);
  const [experienceQuestions, setExperienceQuestions] = useState(3);

  const handleFileUploaded = (url: string) => {
    setResumeUrl(url);
    extractResumeData(url);
  };

  const extractResumeData = async (url: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/extract-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeUrl: url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract resume data");
      }

      setResumeData(data.data);
      setStep("extracted");
      toast.success("Resume data extracted successfully!");
    } catch (error) {
      console.error("Error extracting resume:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to extract resume data"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const generateQuestions = async () => {
    if (!resumeData) return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/generate-resume-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData,
          questionsPerSkill,
          experienceQuestions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate questions");
      }

      setQuestions(data.questions);
      setStep("questions");
      toast.success(`Generated ${data.totalQuestions} interview questions!`);
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate questions"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleAnswer = (questionId: string) => {
    setShowAnswers((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const exportQuestions = () => {
    const questionsData = questions.map((q) => ({
      Question: q.question,
      Answer: q.answer,
      Category: q.category,
      Difficulty: q.difficulty,
      Skill: q.skillName,
      Format: q.questionFormat,
      Coding: q.coding ? "Yes" : "No",
      Source: q.source,
    }));

    const csvContent = [
      Object.keys(questionsData[0]).join(","),
      ...questionsData.map((row) =>
        Object.values(row)
          .map((val) => `"${String(val).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resumeData?.name || "candidate"}_interview_questions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "technical":
        return "bg-blue-100 text-blue-800";
      case "behavioral":
        return "bg-purple-100 text-purple-800";
      case "functional":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Resume-Based Interview Questions
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upload a resume to automatically generate personalized interview
          questions based on skills and experience.
        </p>
      </div>

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Resume</CardTitle>
            <CardDescription>
              Upload a PDF resume to extract candidate information and generate
              relevant interview questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFileUploaded={handleFileUploaded}
              acceptedFileTypes=".pdf"
              label="Upload Resume (PDF)"
              folder="resumes"
            />
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 mt-4 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Extracting resume data...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "extracted" && resumeData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Extracted Resume Data</CardTitle>
              <CardDescription>
                Review the extracted information and configure question
                generation settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">
                    Candidate Information
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <strong>Name:</strong> {resumeData.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {resumeData.email}
                    </p>
                    {resumeData.phone && (
                      <p>
                        <strong>Phone:</strong> {resumeData.phone}
                      </p>
                    )}
                    <p>
                      <strong>Experience:</strong> {resumeData.totalExperience}
                    </p>
                    {resumeData.summary && (
                      <div>
                        <strong>Summary:</strong>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {resumeData.summary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3">
                    Question Settings
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Questions per skill (max 8 skills)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={questionsPerSkill}
                        onChange={(e) =>
                          setQuestionsPerSkill(parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Experience-based questions
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={experienceQuestions}
                        onChange={(e) =>
                          setExperienceQuestions(parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">
                  Skills ({resumeData.skills.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills.slice(0, 15).map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                  {resumeData.skills.length > 15 && (
                    <Badge variant="outline">
                      +{resumeData.skills.length - 15} more
                    </Badge>
                  )}
                </div>
              </div>

              {resumeData.experience.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Experience</h3>
                  <div className="space-y-3">
                    {resumeData.experience.slice(0, 3).map((exp, index) => (
                      <div
                        key={index}
                        className="border-l-4 border-blue-500 pl-4"
                      >
                        <p className="font-medium">
                          {exp.title} at {exp.company}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {exp.duration}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {exp.description.slice(0, 200)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button onClick={() => setStep("upload")} variant="outline">
                  Upload Different Resume
                </Button>
                <Button onClick={generateQuestions} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating Questions...
                    </>
                  ) : (
                    "Generate Interview Questions"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "questions" && questions.length > 0 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    Generated Interview Questions ({questions.length})
                  </CardTitle>
                  <CardDescription>
                    Personalized questions based on {resumeData?.name}'s resume
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={exportQuestions} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    onClick={() => setStep("extracted")}
                    variant="outline"
                    size="sm"
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="w-1/2">Question</TableHead>
                      <TableHead>Skill/Topic</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((question, index) => (
                      <TableRow key={question.id}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <p className="font-medium text-sm">
                              {question.question}
                            </p>
                            {showAnswers[question.id] && (
                              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Model Answer:
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {question.answer}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {question.skillName}
                            {question.coding && (
                              <Badge variant="outline" className="text-xs">
                                Code
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getCategoryColor(question.category)}
                          >
                            {question.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getDifficultyColor(question.difficulty)}
                          >
                            {question.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {question.questionFormat}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {question.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAnswer(question.id)}
                          >
                            {showAnswers[question.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
