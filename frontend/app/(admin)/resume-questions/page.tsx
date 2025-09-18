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
  originalIndex?: number;
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
  const [questionsPerSkill, setQuestionsPerSkill] = useState(1);
  const [experienceQuestions, setExperienceQuestions] = useState(4);
  const [jdText, setJdText] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"tab1" | "tab2" | "tab3">(
    "tab1"
  );
  const [baseJDQuestions, setBaseJDQuestions] = useState<InterviewQuestion[]>(
    []
  );
  const [tab1Questions, setTab1Questions] = useState<InterviewQuestion[]>([]);
  const [tab2Questions, setTab2Questions] = useState<InterviewQuestion[]>([]);
  const [tab3Questions, setTab3Questions] = useState<InterviewQuestion[]>([]);
  const [generatedTabs, setGeneratedTabs] = useState<{
    tab1: boolean;
    tab2: boolean;
    tab3: boolean;
  }>({ tab1: false, tab2: false, tab3: false });

  // Merge helper: replace JD questions at their originalIndex with modified ones; keep others as-is
  const mergeModifiedWithJD = (
    baseJD: InterviewQuestion[],
    modified: InterviewQuestion[]
  ): InterviewQuestion[] => {
    const byIndex = new Map<number, InterviewQuestion>();
    for (const m of modified) {
      if (typeof m.originalIndex === "number") {
        byIndex.set(m.originalIndex, m);
      }
    }
    return baseJD.map((q, i) => byIndex.get(i) || q);
  };

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
      let payload: any = {
        resumeData,
        questionsPerSkill,
        experienceQuestions,
      };

      if (activeTab === "tab1") {
        payload.mode = "jd";
        payload.jdText = jdText;
        if (!jdText || jdText.trim().length === 0) {
          throw new Error("Please paste the Job Description for Tab 1 generation.");
        }
      } else if (activeTab === "tab2" || activeTab === "tab3") {
        // Ensure we have base JD questions
        let base = baseJDQuestions;
        if (!base || base.length === 0) {
          // Fetch Tab 1 first
          const jdResp = await fetch("/api/generate-resume-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resumeData,
              questionsPerSkill,
              experienceQuestions,
              mode: "jd",
              jdText,
            }),
          });
          const jdData = await jdResp.json();
          if (!jdResp.ok) {
            throw new Error(jdData.error || "Failed to generate JD questions");
          }
          const onlyJD = (jdData.questions || []).filter(
            (q: InterviewQuestion) => q.source === "jd"
          );
          setBaseJDQuestions(onlyJD);
          base = onlyJD;
        }

        payload.mode = activeTab === "tab2" ? "modify_light" : "modify_deep";
        payload.baseQuestions = base.map((q) => ({
          question: q.question,
          answer: q.answer,
          category: q.category,
          difficulty: q.difficulty,
          skillName: q.skillName,
          questionFormat: q.questionFormat,
          coding: q.coding,
        }));
      }

      const response = await fetch("/api/generate-resume-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate questions");
      }

      // Update per-tab storage and flags
      if (activeTab === "tab1") {
        const onlyJD = (data.questions || []).filter(
          (q: InterviewQuestion) => q.source === "jd"
        );
        setBaseJDQuestions(onlyJD);
        setTab1Questions(data.questions || []);
        setGeneratedTabs((prev) => ({ ...prev, tab1: true }));
      } else if (activeTab === "tab2") {
        // Merge modified with JD list to show unmodified ones as well
        const merged = mergeModifiedWithJD(baseJDQuestions, data.questions || []);
        setTab2Questions(merged);
        setGeneratedTabs((prev) => ({ ...prev, tab2: true }));
      } else if (activeTab === "tab3") {
        const merged = mergeModifiedWithJD(baseJDQuestions, data.questions || []);
        setTab3Questions(merged);
        setGeneratedTabs((prev) => ({ ...prev, tab3: true }));
      }

      // Reflect currently active tab
      if (activeTab === "tab1") setQuestions(tab1Questions);
      if (activeTab === "tab2") setQuestions(tab2Questions);
      if (activeTab === "tab3") setQuestions(tab3Questions);
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

  const generateAllTabs = async () => {
    if (!resumeData) return;
    if (!jdText || jdText.trim().length === 0) {
      toast.error("Please paste the Job Description to generate all tabs.");
      return;
    }

    setIsProcessing(true);
    try {
      // Generate Tab 1 (JD)
      const resp1 = await fetch("/api/generate-resume-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData,
          questionsPerSkill,
          experienceQuestions,
          mode: "jd",
          jdText,
        }),
      });
      const data1 = await resp1.json();
      if (!resp1.ok) throw new Error(data1.error || "Failed to generate JD questions");
      const onlyJD = (data1.questions || []).filter(
        (q: InterviewQuestion) => q.source === "jd"
      );
      setBaseJDQuestions(onlyJD);
      setTab1Questions(data1.questions || []);
      setGeneratedTabs((p) => ({ ...p, tab1: true }));

      // Generate Tab 2 and Tab 3 in parallel using base JD
      const baseForModify = onlyJD.map((q: InterviewQuestion) => ({
        question: q.question,
        answer: q.answer,
        category: q.category,
        difficulty: q.difficulty,
        skillName: q.skillName,
        questionFormat: q.questionFormat,
        coding: q.coding,
      }));

      const [resp2, resp3] = await Promise.all([
        fetch("/api/generate-resume-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeData,
            mode: "modify_light",
            baseQuestions: baseForModify,
          }),
        }),
        fetch("/api/generate-resume-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeData,
            mode: "modify_deep",
            baseQuestions: baseForModify,
          }),
        }),
      ]);

      const [data2, data3] = await Promise.all([resp2.json(), resp3.json()]);
      if (!resp2.ok) throw new Error(data2.error || "Failed to generate Tab 2");
      if (!resp3.ok) throw new Error(data3.error || "Failed to generate Tab 3");

      setTab2Questions(mergeModifiedWithJD(onlyJD, data2.questions || []));
      setGeneratedTabs((p) => ({ ...p, tab2: true }));
      setTab3Questions(mergeModifiedWithJD(onlyJD, data3.questions || []));
      setGeneratedTabs((p) => ({ ...p, tab3: true }));

      setActiveTab("tab1");
      setStep("questions");
      setQuestions(data1.questions || []);
      toast.success("Generated all tabs successfully!");
    } catch (error) {
      console.error("Error generating all tabs:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate all tabs");
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
    <div className="mx-auto px-4 py-8 max-w-7xl">
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
                        Paste Job Description (JD)
                      </label>
                      <textarea
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md h-32"
                        placeholder="Paste the JD here to generate JD-based and modified questions"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Questions per skill (top 5-6 skills)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="2"
                        value={questionsPerSkill}
                        onChange={(e) =>
                          setQuestionsPerSkill(parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Behavioral/Scenario questions
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="8"
                        value={experienceQuestions}
                        onChange={(e) =>
                          setExperienceQuestions(parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Generation Mode
                      </label>
                      <div className="flex gap-2">
                        <Button
                          variant={activeTab === "tab1" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveTab("tab1")}
                        >
                          Tab 1: JD
                        </Button>
                        <Button
                          variant={activeTab === "tab2" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveTab("tab2")}
                        >
                          Tab 2: Modify 30–40%
                        </Button>
                        <Button
                          variant={activeTab === "tab3" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveTab("tab3")}
                        >
                          Tab 3: Modify 70–80%
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Skills remain consistent across tabs. Tab 1 generates JD questions and 2–3 resume behavioral questions. Tabs 2 and 3 modify a subset of Tab 1 JD questions using the resume.
                      </p>
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
                  <Button onClick={generateAllTabs} disabled={isProcessing} variant="outline">
                    Generate All Tabs
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
                  <Button onClick={() => setActiveTab("tab1")} variant={activeTab === "tab1" ? "default" : "outline"} size="sm">
                    View Tab 1 (JD)
                  </Button>
                  <Button onClick={() => setActiveTab("tab2")} variant={activeTab === "tab2" ? "default" : "outline"} size="sm">
                    View Tab 2 (30–40% Modified)
                  </Button>
                  <Button onClick={() => setActiveTab("tab3")} variant={activeTab === "tab3" ? "default" : "outline"} size="sm">
                    View Tab 3 (70–80% Modified)
                  </Button>
                  <Button onClick={generateAllTabs} variant="outline" size="sm" disabled={isProcessing}>
                    Generate All Tabs
                  </Button>
                  <Button
                    onClick={() => {
                      if (activeTab === "tab1") setQuestions(tab1Questions);
                      if (activeTab === "tab2") setQuestions(tab2Questions);
                      if (activeTab === "tab3") setQuestions(tab3Questions);
                      exportQuestions();
                    }}
                    variant="outline"
                    size="sm"
                  >
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
                {/* Tab switcher controls for generating missing tabs */}
                <div className="flex items-center gap-2 p-3 border-b bg-gray-50">
                  <Button
                    size="sm"
                    variant={activeTab === "tab1" ? "default" : "outline"}
                    onClick={() => {
                      setActiveTab("tab1");
                      setQuestions(tab1Questions);
                    }}
                  >
                    Tab 1 (JD) {generatedTabs.tab1 ? "" : "• not generated"}
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === "tab2" ? "default" : "outline"}
                    onClick={async () => {
                      setActiveTab("tab2");
                      if (!generatedTabs.tab2) {
                        await generateQuestions();
                      } else {
                        setQuestions(tab2Questions);
                      }
                    }}
                  >
                    Tab 2 (30–40% Modified) {generatedTabs.tab2 ? "" : "• generate"}
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === "tab3" ? "default" : "outline"}
                    onClick={async () => {
                      setActiveTab("tab3");
                      if (!generatedTabs.tab3) {
                        await generateQuestions();
                      } else {
                        setQuestions(tab3Questions);
                      }
                    }}
                  >
                    Tab 3 (70–80% Modified) {generatedTabs.tab3 ? "" : "• generate"}
                  </Button>
                </div>

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
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              question.source === "resume"
                                ? "bg-green-100 text-green-800"
                                : question.source === "jd"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
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
