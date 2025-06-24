"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import {
  Download,
  RefreshCw,
  ArrowLeft,
  Info,
  Trash2,
  GripVertical,
  MessageSquare,
  FileSpreadsheet,
  Plus,
} from "lucide-react";
import PDFDoc from "./PDFDocument";
import { Question as PDFQuestion } from "./ui/questions-display";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { QuestionDialog } from "./ui/question-dialog";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import SkillsTable from "./SkillsTable";
import { GlobalFeedbackDialog } from "./ui/global-feedback-dialog";
import { QuestionGenerationDialog } from "./ui/question-generation-dialog";
import { Checkbox } from "./ui/checkbox";

// Define interfaces for the types from Prisma
interface Skill {
  id: string;
  name: string;
  level: "BEGINNER" | "INTERMEDIATE" | "PROFESSIONAL" | "EXPERT";
  requirement: "MANDATORY" | "OPTIONAL";
  numQuestions: number;
  difficulty?: string;
  recordId: string;
  priority?: number;
  category?: "TECHNICAL" | "FUNCTIONAL" | "BEHAVIORAL" | "COGNITIVE";
  questionFormat?: string;
}

interface Question {
  id: string;
  content: string;
  skillId: string;
  recordId: string;
  liked?: "LIKED" | "DISLIKED" | "NONE";
  skill?: Skill;
  feedback?: string;
}

interface SkillRecord {
  id: string;
  jobTitle: string;
  createdAt: Date;
  updatedAt: Date;
}

type RecordWithRelations = SkillRecord & {
  skills: Skill[];
  questions: (Question & {
    skill: Skill;
  })[];
};

// Interface for parsed question data
interface QuestionData {
  id: string;
  skillId: string;
  question: string;
  answer: string;
  category: string;
  difficulty: string;
  questionFormat?: string;
  liked?: "LIKED" | "DISLIKED" | "NONE";
  feedback?: string;
  coding?: boolean;
}

interface SkillRecordEditorProps {
  record: RecordWithRelations;
}

export default function SkillRecordEditor({ record }: SkillRecordEditorProps) {
  const router = useRouter();
  const [editedSkills, setEditedSkills] = useState<Skill[]>(record.skills);
  const [questions, setQuestions] = useState<QuestionData[]>(
    formatQuestions(record.questions)
  );
  const [loading, setLoading] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("skills");
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [feedbackRefreshTrigger, setFeedbackRefreshTrigger] = useState(0);
  const [activeSkillFeedback, setActiveSkillFeedback] = useState<string | null>(
    null
  );
  const [skillFeedbackCounts, setSkillFeedbackCounts] = useState<
    Record<string, number>
  >({});
  const [priorityMode, setPriorityMode] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [globalFeedbackDialogOpen, setGlobalFeedbackDialogOpen] =
    useState(false);
  const [globalFeedback, setGlobalFeedback] = useState("");
  const [loadingGlobalFeedback, setLoadingGlobalFeedback] = useState(false);
  const [questionGenerationDialogOpen, setQuestionGenerationDialogOpen] =
    useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    title: "Generating Questions",
    description:
      "Please wait while we generate interview questions for your skills...",
    showProgress: false,
    progressValue: 0,
    progressText: "",
  });

  // Multi-select state for priority mode
  const [selectedSkillsInPriorityMode, setSelectedSkillsInPriorityMode] =
    useState<Set<string>>(new Set());
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [excelExporting, setExcelExporting] = useState(false);

  // Parse question content from JSON string
  function formatQuestions(questions: Question[]): QuestionData[] {
    return questions
      .map((q) => {
        try {
          const content = JSON.parse(q.content);
          return {
            id: q.id,
            skillId: q.skillId,
            question: content.question,
            answer: content.answer,
            category: content.category,
            difficulty: content.difficulty,
            questionFormat: content.questionFormat || "Scenario",
            liked: q.liked || "NONE",
            feedback: q.feedback || "",
            coding: content.coding || false,
          };
        } catch (e) {
          console.error("Error parsing question content:", e);
          return null;
        }
      })
      .filter(Boolean) as QuestionData[];
  }

  // Update skill level and requirement
  const updateSkill = async (
    skillId: string,
    field:
      | "level"
      | "requirement"
      | "numQuestions"
      | "difficulty"
      | "priority"
      | "category"
      | "questionFormat",
    value: string | number
  ) => {
    try {
      setLoading(true);

      // Update locally first
      const updatedSkills = editedSkills.map((skill) =>
        skill.id === skillId ? { ...skill, [field]: value } : skill
      );
      setEditedSkills(updatedSkills);

      // Then update in database
      await fetch(`/api/skills/${skillId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [field]: value }),
      });

      toast.success(`Skill ${field} updated successfully`);
      router.refresh();
    } catch (error) {
      console.error(`Error updating skill ${field}:`, error);
      toast.error(`Failed to update skill ${field}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate questions for skills without questions - modified to switch tabs and show toast
  const generateMissingQuestions = async () => {
    // Check if there are mandatory skills
    const mandatorySkills = editedSkills.filter(
      (skill) => skill.requirement === "MANDATORY"
    );

    if (mandatorySkills.length === 0) {
      toast.warning("Please mark some skills as mandatory first");
      return;
    }

    try {
      setGeneratingQuestions(true);
      setQuestionGenerationDialogOpen(true);
      setGenerationProgress({
        title: "Generating Questions",
        description: "Analyzing skills and creating interview questions...",
        showProgress: false,
        progressValue: 0,
        progressText: "",
      });

      // Find skills that need questions (mandatory skills with no questions)
      const skillsNeedingQuestions = editedSkills.filter(
        (skill) =>
          skill.requirement === "MANDATORY" &&
          !questions.some((q) => q.skillId === skill.id)
      );

      if (skillsNeedingQuestions.length === 0) {
        toast.info("All mandatory skills already have questions!");
        setGeneratingQuestions(false);
        setQuestionGenerationDialogOpen(false);
        return;
      }

      const response = await fetch("/api/generate-skill-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recordId: record.id,
          skillIds: skillsNeedingQuestions.map((s) => s.id),
          // Include the skills with their metadata for batch processing
          skills: skillsNeedingQuestions.map((s) => ({
            id: s.id,
            numQuestions: s.numQuestions || 1,
            difficulty: s.difficulty || "Medium",
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate questions");
      }

      const data = await response.json();

      if (data.success) {
        // Show success toast
        toast.success(
          `Generated questions for ${skillsNeedingQuestions.length} skills!`
        );

        // Fetch the latest questions directly
        await fetchLatestQuestions();

        // Switch to questions tab
        setActiveTab("questions");
      } else {
        throw new Error(data.error || "Failed to generate questions");
      }
    } catch (error: any) {
      console.error("Error generating questions:", error);
      toast.error(error.message || "Error generating questions");
    } finally {
      setGeneratingQuestions(false);
      setQuestionGenerationDialogOpen(false);
    }
  };

  // Generate questions using the API endpoint for the record
  const generateQuestionsForRecord = async (force = false) => {
    try {
      setGeneratingQuestions(true);
      setQuestionGenerationDialogOpen(true);
      setGenerationProgress({
        title: force ? "Regenerating All Questions" : "Generating Questions",
        description: force
          ? "Regenerating all interview questions with fresh content..."
          : "Creating interview questions for your skills...",
        showProgress: false,
        progressValue: 0,
        progressText: "",
      });

      const response = await fetch(
        `/api/records/${record.id}/generate-questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            forceRegenerate: force,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate questions");
      }

      const data = await response.json();

      if (data.success) {
        // Show success toast
        toast.success(`${data.message}`);

        // Fetch the latest questions directly
        await fetchLatestQuestions();

        // Switch to questions tab
        setActiveTab("questions");
      } else {
        throw new Error(data.error || "Failed to generate questions");
      }
    } catch (error: any) {
      console.error("Error generating questions:", error);
      toast.error(error.message || "Error generating questions");
    } finally {
      setGeneratingQuestions(false);
      setQuestionGenerationDialogOpen(false);
    }
  };

  // Auto-generate skills and questions in one go
  const autoGenerateSkillsAndQuestions = async () => {
    try {
      setGeneratingQuestions(true);
      setQuestionGenerationDialogOpen(true);
      setGenerationProgress({
        title: "Auto-Generating Skills & Questions",
        description:
          "Analyzing job requirements and creating comprehensive interview content...",
        showProgress: true,
        progressValue: 10,
        progressText: "Extracting skills from job description...",
      });

      // Update progress
      setGenerationProgress((prev) => ({
        ...prev,
        progressValue: 30,
        progressText: "Generating interview questions...",
      }));

      // Call the API endpoint that handles both skill and question generation
      const response = await fetch(`/api/records/${record.id}/auto-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobTitle: record.jobTitle,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to auto-generate skills and questions");
      }

      const data = await response.json();

      if (data.success) {
        // Update progress
        setGenerationProgress((prev) => ({
          ...prev,
          progressValue: 80,
          progressText: "Finalizing questions...",
        }));

        // Show success toast
        toast.success(
          `${data.message || "Successfully generated skills and questions!"}`
        );

        // Update the skills list
        if (data.skills) {
          setEditedSkills(data.skills);
        }

        // Fetch the latest questions
        await fetchLatestQuestions();

        // Final progress update
        setGenerationProgress((prev) => ({
          ...prev,
          progressValue: 100,
          progressText: "Complete!",
        }));

        // Switch to questions tab
        setActiveTab("questions");

        // Refresh the page to update all data
        router.refresh();
      } else {
        throw new Error(data.error || "Failed to auto-generate");
      }
    } catch (error: any) {
      console.error("Error auto-generating:", error);
      toast.error(
        error.message || "Error auto-generating skills and questions"
      );
    } finally {
      setGeneratingQuestions(false);
      setQuestionGenerationDialogOpen(false);
    }
  };

  // Add a new function to fetch global feedback
  const fetchGlobalFeedback = async () => {
    try {
      setLoadingGlobalFeedback(true);
      const response = await fetch(`/api/records/${record.id}/global-feedback`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.globalFeedback) {
          setGlobalFeedback(data.globalFeedback.content || "");
        }
      }
    } catch (error) {
      console.error("Error fetching global feedback:", error);
    } finally {
      setLoadingGlobalFeedback(false);
    }
  };

  // Call fetchGlobalFeedback when component mounts
  useEffect(() => {
    fetchGlobalFeedback();
  }, [record.id]);

  // Update the regenerate function to include global feedback
  const regenerateAllQuestions = () => {
    // Show confirmation dialog
    if (
      confirm(
        "This will regenerate ALL questions for mandatory skills. Are you sure?"
      )
    ) {
      // First check if there are questions with feedback
      const questionsWithFeedback = questions.filter(
        (q) => q.feedback && q.feedback.trim() !== ""
      );

      const hasGlobalFeedback = globalFeedback && globalFeedback.trim() !== "";

      if (questionsWithFeedback.length > 0 || hasGlobalFeedback) {
        // If we have questions with feedback or global feedback, regenerate with feedback
        regenerateQuestionsWithFeedback();
      } else {
        // Otherwise, generate all questions as usual
        generateQuestionsForRecord(true);
      }
    }
  };

  // Update the regenerateQuestionsWithFeedback function to include global feedback
  const regenerateQuestionsWithFeedback = async () => {
    try {
      setQuestionsLoading(true);
      setQuestionGenerationDialogOpen(true);
      setGenerationProgress({
        title: "Regenerating with Feedback",
        description:
          "Applying your feedback to improve the interview questions...",
        showProgress: false,
        progressValue: 0,
        progressText: "",
      });

      // Collect the feedback for API
      const feedbackData = questions
        .filter((q) => q.feedback && q.feedback.trim() !== "")
        .map((q) => ({
          questionId: q.id,
          feedback: q.feedback,
        }));

      // Call the API to regenerate questions with feedback
      const response = await fetch(
        `/api/records/${record.id}/regenerate-with-feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            feedback: feedbackData,
            globalFeedback: globalFeedback || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to regenerate questions with feedback");
      }

      const data = await response.json();

      if (data.success) {
        // Show success toast
        toast.success(
          `${data.message || "Questions regenerated based on feedback!"}`
        );

        // Fetch the latest questions directly
        await fetchLatestQuestions();

        // Switch to questions tab
        setActiveTab("questions");
      } else {
        throw new Error(data.error || "Failed to regenerate questions");
      }
    } catch (error: any) {
      console.error("Error regenerating questions with feedback:", error);
      toast.error(error.message || "Error regenerating questions");

      // Fall back to regular regeneration if the feedback-based one fails
      generateQuestionsForRecord(true);
    } finally {
      setQuestionsLoading(false);
      setQuestionGenerationDialogOpen(false);
    }
  };

  // Add a new function to fetch the latest questions
  const fetchLatestQuestions = async () => {
    try {
      setQuestionsLoading(true);
      const response = await fetch(`/api/records/${record.id}/questions`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch questions");
      }

      const data = await response.json();

      if (data.success) {
        // Update questions state with the latest data
        setQuestions(formatQuestions(data.questions));
      }
    } catch (error) {
      console.error("Error fetching latest questions:", error);
      // Don't show a toast for this error as it's a background operation
    } finally {
      setQuestionsLoading(false);
    }
  };

  // Generate PDF for download
  const handleGeneratePDF = async () => {
    try {
      setPdfLoading(true);

      // Only include liked or neutral questions, not disliked ones
      const filteredQuestions = questions.filter((q) => q.liked !== "DISLIKED");

      // Format questions for PDF
      const pdfQuestions = filteredQuestions.map((q) => {
        // Get the skill data for this question
        const skill = editedSkills.find((s) => s.id === q.skillId);

        return {
          question: q.question,
          answer: q.answer,
          category: q.category,
          difficulty: q.difficulty,
          skillName: getSkillName(q.skillId),
          priority: skill?.priority,
          questionFormat: q.questionFormat || "Scenario",
        };
      });

      // Generate PDF
      const blob = await pdf(
        <PDFDoc jobRole={record.jobTitle} questions={pdfQuestions} />
      ).toBlob();

      // Generate filename
      const fileName = `${record.jobTitle
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}_interview_questions.pdf`;

      // Save file
      saveAs(blob, fileName);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error generating PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  // Generate and download Excel
  const handleGenerateExcel = async () => {
    if (!questions.length) {
      toast.error("No questions to export");
      return;
    }

    setExcelExporting(true);
    try {
      const jobTitle = record.jobTitle || "interview-questions";
      const filename = `${jobTitle
        .toLowerCase()
        .replace(/\s+/g, "-")}-${Date.now()}.xlsx`;

      // Prepare questions data for export
      const exportQuestions = questions.map((q, index) => {
        const skill = editedSkills.find((s) => s.id === q.skillId);
        return {
          slNo: index + 1,
          corpId: "", // Empty as per default
          urlId: "", // Empty as per default
          roundSequence: 1, // Default to 1
          skillName: skill?.name || "Unknown Skill",
          question: q.question,
          answer: q.answer,
          category: q.category,
          questionFormat:
            q.questionFormat || skill?.questionFormat || "Scenario",
          candidateDescription: q.question, // Default to Question Description
          candidateFacingDocUrl: "", // Empty as per default
          tags: `${q.category || ""}, ${
            q.questionFormat || skill?.questionFormat || ""
          }`.replace(/^, |, $/, ""),
          coding: q.coding || false,
          mandatory: "No", // Default to No
          hideInFloReport: "No", // Default to No
          poolName: "", // Empty as per default
        };
      });

      const response = await fetch("/api/export-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questions: exportQuestions,
          format: "excel",
          filename,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export questions");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Questions exported to Excel successfully!");
    } catch (error: any) {
      console.error("Error exporting to Excel:", error);
      toast.error(error.message || "Failed to export to Excel");
    } finally {
      setExcelExporting(false);
    }
  };

  // Get skill name for a given skillId
  const getSkillName = (skillId: string) => {
    const skill = editedSkills.find((s) => s.id === skillId);
    return skill ? skill.name : "Unknown Skill";
  };

  // Get level label
  const getLevelLabel = (level: string) => {
    switch (level) {
      case "BEGINNER":
        return "Beginner";
      case "INTERMEDIATE":
        return "Intermediate";
      case "PROFESSIONAL":
        return "Professional";
      default:
        return level;
    }
  };

  // Get requirement label
  const getRequirementLabel = (requirement: string) => {
    return requirement === "MANDATORY" ? "Mandatory" : "Optional";
  };

  // Get category label
  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case "TECHNICAL":
        return "Technical";
      case "FUNCTIONAL":
        return "Functional";
      case "BEHAVIORAL":
        return "Behavioral";
      case "COGNITIVE":
        return "Cognitive";
      default:
        return "Not Specified";
    }
  };

  // Get question format label
  const getQuestionFormatLabel = (format?: string) => {
    return format || "Scenario based";
  };

  // Count questions for each skill
  const getSkillQuestionCount = (skillId: string) => {
    return questions.filter((q) => q.skillId === skillId).length;
  };

  // Add useEffect to fetch questions when tab changes
  useEffect(() => {
    if (activeTab === "questions" && questions.length === 0) {
      fetchLatestQuestions();
    }
  }, [activeTab]);

  // Add a new helper method to get the number of questions set for a skill
  const getSkillNumQuestions = (skillId: string) => {
    const skill = editedSkills.find((s) => s.id === skillId);
    return skill?.numQuestions || 1;
  };

  // Add a new helper method to get the skill difficulty
  const getSkillDifficulty = (skillId: string) => {
    const skill = editedSkills.find((s) => s.id === skillId);
    return skill?.difficulty || "Medium";
  };

  // First add a helper function to get a CSS class based on difficulty
  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-50 text-green-800 border-green-200";
      case "medium":
        return "bg-orange-50 text-orange-800 border-orange-200";
      case "hard":
        return "bg-red-50 text-red-800 border-red-200";
      default:
        return "bg-orange-50 text-orange-800 border-orange-200";
    }
  };

  // Add a helper function to get a CSS class based on category
  const getCategoryClass = (category: string) => {
    switch (category.toLowerCase()) {
      case "technical":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "experience":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "problem solving":
        return "bg-indigo-50 text-indigo-800 border-indigo-200";
      case "soft skills":
        return "bg-pink-50 text-pink-800 border-pink-200";
      default:
        return "bg-gray-50 text-gray-800 border-gray-200";
    }
  };

  // Add a helper function to get a CSS class based on question format
  const getQuestionFormatClass = (format: string) => {
    switch (format.toLowerCase()) {
      case "open-ended":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "coding":
        return "bg-violet-50 text-violet-800 border-violet-200";
      case "scenario":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "case study":
        return "bg-cyan-50 text-cyan-800 border-cyan-200";
      case "design":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "live assessment":
        return "bg-teal-50 text-teal-800 border-teal-200";
      default:
        return "bg-amber-50 text-amber-800 border-amber-200";
    }
  };

  // Sort questions by skillId then by difficulty
  const sortedQuestions = [...questions].sort((a, b) => {
    // First sort by skillId
    if (a.skillId !== b.skillId) {
      return a.skillId.localeCompare(b.skillId);
    }

    // Then by difficulty (Hard, Medium, Easy)
    const difficultyOrder = { Hard: 0, Medium: 1, Easy: 2 };
    const aDiffValue =
      difficultyOrder[a.difficulty as keyof typeof difficultyOrder] ?? 1;
    const bDiffValue =
      difficultyOrder[b.difficulty as keyof typeof difficultyOrder] ?? 1;
    return aDiffValue - bDiffValue;
  });

  // Track the current skill to know when to add a divider
  let currentSkillId = "";

  // Update like status for a question
  const handleQuestionStatusChange = (
    questionId: string,
    status: "LIKED" | "DISLIKED" | "NONE"
  ) => {
    // Update locally first
    setQuestions((prevQuestions) =>
      prevQuestions.map((q) =>
        q.id === questionId ? { ...q, liked: status } : q
      )
    );

    // Update in database
    fetch(`/api/questions/${questionId}/like`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update question status");
        }
        return response.json();
      })
      .then(() => {
        // Success - already updated UI optimistically
      })
      .catch((error) => {
        console.error("Error updating question status:", error);
        toast.error("Failed to update question status");
        // Revert the change in case of error
        setQuestions((prevQuestions) => [...prevQuestions]);
      });
  };

  // Handle feedback submitted for a question
  const handleQuestionFeedbackChange = (
    questionId: string,
    feedback: string
  ) => {
    // Update locally first
    setQuestions((prevQuestions) =>
      prevQuestions.map((q) => (q.id === questionId ? { ...q, feedback } : q))
    );

    // Update in database
    fetch(`/api/questions/${questionId}/feedback`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ feedback }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update question feedback");
        }
        return response.json();
      })
      .then(() => {
        // Success - already updated UI optimistically
      })
      .catch((error) => {
        console.error("Error updating question feedback:", error);
        toast.error("Failed to update question feedback");
        // Revert the change in case of error
        setQuestions((prevQuestions) => [...prevQuestions]);
      });
  };

  // Handle regenerating a question
  const handleRegenerateQuestion = async (
    questionId: string
  ): Promise<void> => {
    if (!questionId) return;

    try {
      setQuestionsLoading(true);

      const response = await fetch(`/api/questions/${questionId}/regenerate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate question");
      }

      const data = await response.json();

      if (data.success) {
        // Parse the new content
        const newContent =
          typeof data.question.content === "string"
            ? JSON.parse(data.question.content)
            : data.question.content;

        // Update the questions list with the new question
        setQuestions((prevQuestions) =>
          prevQuestions.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  question: newContent.question,
                  answer: newContent.answer,
                  category: newContent.category,
                  difficulty: newContent.difficulty,
                  liked: "NONE",
                  feedback: "",
                }
              : q
          )
        );

        toast.success("Question regenerated successfully");

        // Refresh the questions data
        fetchLatestQuestions();
      } else {
        throw new Error(data.error || "Failed to regenerate question");
      }
    } catch (error) {
      console.error("Error regenerating question:", error);
      toast.error("Failed to regenerate question");
    } finally {
      setQuestionsLoading(false);
    }
  };

  // Get number of liked/disliked questions for a skill
  const getSkillLikeStats = (skillId: string) => {
    const skillQuestions = questions.filter((q) => q.skillId === skillId);
    const liked = skillQuestions.filter((q) => q.liked === "LIKED").length;
    const disliked = skillQuestions.filter(
      (q) => q.liked === "DISLIKED"
    ).length;
    return { liked, disliked };
  };

  // Handle feedback submitted
  const handleFeedbackSubmitted = () => {
    setFeedbackRefreshTrigger((prev) => prev + 1);
  };

  // Toggle feedback section for a skill
  const toggleFeedbackSection = (skillId: string) => {
    if (activeSkillFeedback === skillId) {
      setActiveSkillFeedback(null);
    } else {
      setActiveSkillFeedback(skillId);
    }
  };

  // Add useEffect to fetch feedback counts when the component mounts
  useEffect(() => {
    const fetchFeedbackCounts = async () => {
      try {
        const feedbackCounts: Record<string, number> = {};

        for (const skill of editedSkills) {
          const response = await fetch(`/api/skills/${skill.id}/feedback`);
          if (response.ok) {
            const data = await response.json();
            feedbackCounts[skill.id] = data.feedbacks.length;
          }
        }

        setSkillFeedbackCounts(feedbackCounts);
      } catch (error) {
        console.error("Error fetching feedback counts:", error);
      }
    };

    fetchFeedbackCounts();
  }, [editedSkills, feedbackRefreshTrigger]);

  // Add a function to handle skill deletion
  const handleDeleteSkill = async (skillId: string) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/skills/${skillId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete skill");
      }

      toast.success("Skill deleted successfully");

      // Update local state to remove the deleted skill
      setEditedSkills(editedSkills.filter((skill) => skill.id !== skillId));

      // Remove related questions
      setQuestions(
        questions.filter((question) => question.skillId !== skillId)
      );

      // Refresh the page to get updated data
      router.refresh();
    } catch (error) {
      console.error("Error deleting skill:", error);
      toast.error("Failed to delete skill. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add bulk delete function
  const handleBulkDeleteSkills = async (skillIds: string[]) => {
    try {
      setLoading(true);

      // Delete skills in parallel
      const deletePromises = skillIds.map((skillId) =>
        fetch(`/api/skills/${skillId}`, {
          method: "DELETE",
        })
      );

      const responses = await Promise.all(deletePromises);

      // Check if all deletions were successful
      const failedDeletions = responses.filter((response) => !response.ok);

      if (failedDeletions.length > 0) {
        throw new Error(`Failed to delete ${failedDeletions.length} skill(s)`);
      }

      toast.success(`Successfully deleted ${skillIds.length} skill(s)`);

      // Update local state to remove the deleted skills
      setEditedSkills(
        editedSkills.filter((skill) => !skillIds.includes(skill.id))
      );

      // Remove related questions
      setQuestions(
        questions.filter((question) => !skillIds.includes(question.skillId))
      );

      // Refresh the page to get updated data
      router.refresh();
    } catch (error) {
      console.error("Error deleting skills:", error);
      toast.error("Failed to delete some skills. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle skill selection in priority mode
  const handleSkillSelectInPriorityMode = (
    skillId: string,
    checked: boolean
  ) => {
    const newSelected = new Set(selectedSkillsInPriorityMode);
    if (checked) {
      newSelected.add(skillId);
    } else {
      newSelected.delete(skillId);
    }
    setSelectedSkillsInPriorityMode(newSelected);
  };

  // Handle select all in priority mode
  const handleSelectAllInPriorityMode = (checked: boolean) => {
    if (checked) {
      setSelectedSkillsInPriorityMode(
        new Set(editedSkills.map((skill) => skill.id))
      );
    } else {
      setSelectedSkillsInPriorityMode(new Set());
    }
  };

  // Handle bulk delete in priority mode
  const handleBulkDeleteInPriorityMode = () => {
    if (selectedSkillsInPriorityMode.size === 0) {
      toast.warning("Please select skills to delete");
      return;
    }
    setConfirmBulkDeleteOpen(true);
  };

  // Confirm and execute bulk delete in priority mode
  const confirmBulkDeleteInPriorityMode = async () => {
    await handleBulkDeleteSkills(Array.from(selectedSkillsInPriorityMode));
    setSelectedSkillsInPriorityMode(new Set());
    setConfirmBulkDeleteOpen(false);
  };

  // Get selected skill names for confirmation dialog
  const getSelectedSkillNamesInPriorityMode = () => {
    return editedSkills
      .filter((skill) => selectedSkillsInPriorityMode.has(skill.id))
      .map((skill) => skill.name);
  };

  // Check if all skills are selected in priority mode
  const isAllSelectedInPriorityMode =
    editedSkills.length > 0 &&
    selectedSkillsInPriorityMode.size === editedSkills.length;
  const isIndeterminateInPriorityMode =
    selectedSkillsInPriorityMode.size > 0 &&
    selectedSkillsInPriorityMode.size < editedSkills.length;

  // Add an onDragEnd function for drag and drop
  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const startIndex = result.source.index;
    const endIndex = result.destination.index;

    if (startIndex === endIndex) return;

    // Determine if we're working with mandatory or optional skills
    const droppableId = result.source.droppableId;
    const isMandatory = droppableId === "mandatory-skills";

    // Get the correct list
    const skills = isMandatory
      ? editedSkills.filter((s) => s.requirement === "MANDATORY")
      : editedSkills.filter((s) => s.requirement === "OPTIONAL");

    // Reorder the list
    const [movedSkill] = skills.splice(startIndex, 1);
    skills.splice(endIndex, 0, movedSkill);

    // Update priorities for the reordered list
    const updatedSkills = skills.map((skill, index) => ({
      ...skill,
      priority: index + 1,
    }));

    // Combine with the skills from the other group
    const otherSkills = editedSkills.filter((s) =>
      isMandatory ? s.requirement !== "MANDATORY" : s.requirement !== "OPTIONAL"
    );

    // Create the new combined list
    const newSkills = [...updatedSkills, ...otherSkills];

    // Update local state
    setEditedSkills(newSkills);

    // Update in database
    try {
      setLoading(true);

      // Update each skill's priority
      for (const skill of updatedSkills) {
        await fetch(`/api/skills/${skill.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ priority: skill.priority }),
        });
      }

      toast.success("Skill priorities updated");
    } catch (error) {
      console.error("Error updating skill priorities:", error);
      toast.error("Failed to update skill priorities");
    } finally {
      setLoading(false);
    }
  };

  // Create separate lists for mandatory and optional skills
  const mandatorySkills = editedSkills
    .filter((skill) => skill.requirement === "MANDATORY")
    .sort((a, b) => (a.priority || 999) - (b.priority || 999));

  const optionalSkills = editedSkills
    .filter((skill) => skill.requirement === "OPTIONAL")
    .sort((a, b) => (a.priority || 999) - (b.priority || 999));

  // Add regenerate all disliked questions function
  const regenerateAllDislikedQuestions = async () => {
    try {
      // Find all disliked questions
      const dislikedQuestions = questions.filter((q) => q.liked === "DISLIKED");

      if (dislikedQuestions.length === 0) {
        toast.info("No disliked questions to regenerate");
        return;
      }

      setQuestionsLoading(true);

      // First ensure all feedback is saved to the database
      for (const question of dislikedQuestions) {
        if (question.feedback && question.id) {
          // Submit any feedback that might not be saved yet
          await fetch(`/api/questions/${question.id}/feedback`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ feedback: question.feedback }),
          });
        }
      }

      // Process each disliked question sequentially
      for (const question of dislikedQuestions) {
        await handleRegenerateQuestion(question.id);
      }

      toast.success("All disliked questions have been regenerated");
    } catch (error) {
      console.error("Error regenerating questions:", error);
      toast.error("Failed to regenerate all questions");
    } finally {
      setQuestionsLoading(false);
    }
  };

  // Add function to check if there are any disliked questions
  const hasDislikedQuestions = () => {
    return questions.some((q) => q.liked === "DISLIKED");
  };

  // Add a function to handle opening the feedback dialog
  const handleOpenFeedbackDialog = (questionId: string) => {
    setActiveQuestion(questionId);
    setFeedbackDialogOpen(true);
  };

  // Add a function to handle submitting feedback
  const handleSubmitFeedback = (feedback: string) => {
    if (activeQuestion) {
      handleQuestionFeedbackChange(activeQuestion, feedback);
    }
    setFeedbackDialogOpen(false);
  };

  // Add a component for the feedback dialog
  const FeedbackDialog = () => {
    const question = questions.find((q) => q.id === activeQuestion);
    const [feedback, setFeedback] = useState(question?.feedback || "");

    useEffect(() => {
      if (question) {
        setFeedback(question.feedback || "");
      }
    }, [question]);

    if (!question) return null;

    return (
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback for Question</DialogTitle>
            <DialogDescription>
              Please provide your feedback to improve this question.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium mb-2">{question.question}</p>
            <textarea
              className="w-full min-h-[100px] p-2 border rounded-md"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What would you like to improve about this question?"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFeedbackDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => handleSubmitFeedback(feedback)}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6 w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/jd-qna")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Button>
          <h1 className="text-2xl font-bold">{record.jobTitle}</h1>
          <p className="text-muted-foreground">
            Created: {new Date(record.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {/* <Button
            onClick={autoGenerateSkillsAndQuestions}
            disabled={generatingQuestions}
            variant="default"
          >
            {generatingQuestions ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Auto-Generating...
              </>
            ) : (
              <>Auto-Generate All</>
            )}
          </Button> */}
          <Button
            variant="outline"
            onClick={() => router.push("/create-interview")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Interview
          </Button>
          <Button
            onClick={handleGenerateExcel}
            disabled={
              excelExporting ||
              questions.length === 0 ||
              generatingQuestions ||
              questionsLoading
            }
            variant="outline"
          >
            {excelExporting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Preparing Excel...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download Excel
              </>
            )}
          </Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={
              pdfLoading ||
              questions.length === 0 ||
              generatingQuestions ||
              questionsLoading
            }
          >
            {pdfLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Preparing PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="skills" className="flex-1 max-w-[200px]">
            Skills ({editedSkills.length})
          </TabsTrigger>
          <TabsTrigger
            value="questions"
            className="flex-1 max-w-[200px]"
            onClick={() => {
              if (activeTab !== "questions") {
                fetchLatestQuestions();
              }
            }}
          >
            Questions ({questions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skills" className="pt-4">
          <Card className="w-full overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Skills Management</CardTitle>
                <CardDescription>
                  Edit skill levels, requirements, priorities, and question
                  formats. Mark skills as mandatory to include them in interview
                  questions.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* <Button
                  variant="default"
                  onClick={() => autoGenerateSkillsAndQuestions()}
                  disabled={generatingQuestions}
                  className="mr-2"
                >
                  {generatingQuestions ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Auto-Generating...
                    </>
                  ) : (
                    "Auto-Generate Questions"
                  )}
                </Button> */}
                <Button
                  variant={priorityMode ? "secondary" : "outline"}
                  onClick={() => setPriorityMode(!priorityMode)}
                >
                  {priorityMode ? "Exit Priority Mode" : "Prioritize Skills"}
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {editedSkills.length === 0 ? (
                <p className="text-muted-foreground">
                  No skills found for this job.
                </p>
              ) : priorityMode ? (
                // Drag and drop priority mode
                <div className="space-y-4">
                  {/* Bulk operations controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isAllSelectedInPriorityMode}
                          onCheckedChange={handleSelectAllInPriorityMode}
                          {...(isIndeterminateInPriorityMode && {
                            "data-state": "indeterminate",
                          })}
                        />
                        <span className="text-sm">
                          Select All ({selectedSkillsInPriorityMode.size}{" "}
                          selected)
                        </span>
                      </div>
                      {selectedSkillsInPriorityMode.size > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleBulkDeleteInPriorityMode}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected ({selectedSkillsInPriorityMode.size})
                        </Button>
                      )}
                    </div>
                  </div>

                  <DragDropContext onDragEnd={onDragEnd}>
                    <div className="space-y-6">
                      {mandatorySkills.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Badge variant="default">Mandatory Skills</Badge>
                            <span className="text-xs text-muted-foreground">
                              Drag to reorder - these skills will be prioritized
                              in question generation
                            </span>
                          </div>

                          <Droppable droppableId="mandatory-skills">
                            {(provided: any) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-2"
                              >
                                {mandatorySkills.map((skill, index) => (
                                  <Draggable
                                    key={skill.id}
                                    draggableId={skill.id}
                                    index={index}
                                  >
                                    {(provided: any) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className="flex items-center p-3 border rounded-md bg-muted/20"
                                      >
                                        <Checkbox
                                          checked={selectedSkillsInPriorityMode.has(
                                            skill.id
                                          )}
                                          onCheckedChange={(checked) =>
                                            handleSkillSelectInPriorityMode(
                                              skill.id,
                                              checked as boolean
                                            )
                                          }
                                          className="mr-3"
                                        />
                                        <div
                                          {...provided.dragHandleProps}
                                          className="cursor-grab mr-2"
                                        >
                                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium overflow-hidden break-words">
                                            {skill.name}
                                          </div>
                                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span>
                                              Level:{" "}
                                              {getLevelLabel(skill.level)}
                                            </span>
                                            <span>•</span>
                                            <span>
                                              Priority:{" "}
                                              {skill.priority || index + 1}
                                            </span>
                                            <span>•</span>
                                            <span>
                                              Questions:{" "}
                                              {getSkillNumQuestions(skill.id)}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="ml-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              handleDeleteSkill(skill.id);
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}

                      {mandatorySkills.length > 0 &&
                        optionalSkills.length > 0 && (
                          <Separator className="my-6" />
                        )}

                      {optionalSkills.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Badge variant="outline">Optional Skills</Badge>
                            <span className="text-xs text-muted-foreground">
                              These skills will be used if time permits
                            </span>
                          </div>

                          <Droppable droppableId="optional-skills">
                            {(provided: any) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-2"
                              >
                                {optionalSkills.map((skill, index) => (
                                  <Draggable
                                    key={skill.id}
                                    draggableId={skill.id}
                                    index={index}
                                  >
                                    {(provided: any) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className="flex items-center p-3 border rounded-md"
                                      >
                                        <Checkbox
                                          checked={selectedSkillsInPriorityMode.has(
                                            skill.id
                                          )}
                                          onCheckedChange={(checked) =>
                                            handleSkillSelectInPriorityMode(
                                              skill.id,
                                              checked as boolean
                                            )
                                          }
                                          className="mr-3"
                                        />
                                        <div
                                          {...provided.dragHandleProps}
                                          className="cursor-grab mr-2"
                                        >
                                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium overflow-hidden break-words">
                                            {skill.name}
                                          </div>
                                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span>
                                              Level:{" "}
                                              {getLevelLabel(skill.level)}
                                            </span>
                                            <span>•</span>
                                            <span>
                                              Priority:{" "}
                                              {skill.priority || index + 1}
                                            </span>
                                            <span>•</span>
                                            <span>
                                              Questions:{" "}
                                              {getSkillNumQuestions(skill.id)}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="ml-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              handleDeleteSkill(skill.id);
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </div>
                  </DragDropContext>
                </div>
              ) : (
                // TanStack table implementation
                <SkillsTable
                  skills={editedSkills}
                  recordId={record.id}
                  onUpdateSkill={updateSkill}
                  getSkillQuestionCount={getSkillQuestionCount}
                  onDeleteSkill={(skillId) => {
                    handleDeleteSkill(skillId);
                  }}
                  onBulkDeleteSkills={handleBulkDeleteSkills}
                  onSkillAdded={() => {
                    // Fetch the latest skills data from the server
                    fetch(`/api/records/${record.id}`)
                      .then((response) => response.json())
                      .then((data) => {
                        if (data.success && data.record) {
                          // Sort skills by priority
                          const sortedSkills = [...data.record.skills].sort(
                            (a, b) => {
                              // First sort by requirement type (MANDATORY first)
                              if (a.requirement !== b.requirement) {
                                return a.requirement === "MANDATORY" ? -1 : 1;
                              }
                              // Then sort by priority
                              const aPriority = a.priority ?? 999;
                              const bPriority = b.priority ?? 999;
                              return aPriority - bPriority;
                            }
                          );

                          // Update the skills state
                          setEditedSkills(sortedSkills);
                          toast.success("Skill added successfully");
                        }
                      })
                      .catch((error) => {
                        console.error("Error fetching updated skills:", error);
                        // Refresh the entire page as fallback
                        router.refresh();
                      });
                  }}
                  loading={loading}
                />
              )}
            </CardContent>

            <CardFooter className="flex justify-between">
              <div>
                <Button
                  onClick={() => setPriorityMode(!priorityMode)}
                  variant="outline"
                >
                  {priorityMode ? "Table View" : "Priority View"}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-full h-8 w-8"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>
                        Questions are generated for mandatory skills and
                        optional skills with questions count &gt; 0. Select
                        &quot;Generate Questions&quot; to create questions for
                        skills that don&apos;t have any yet. Use
                        &quot;Regenerate All Questions&quot; to create new
                        questions for all skills, replacing existing ones.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  onClick={() => generateQuestionsForRecord(false)}
                  disabled={
                    generatingQuestions || questionsLoading || pdfLoading
                  }
                  variant="outline"
                >
                  {generatingQuestions ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Generating...
                    </>
                  ) : (
                    "Generate Questions"
                  )}
                </Button>
                <Button
                  onClick={regenerateAllQuestions}
                  disabled={
                    generatingQuestions ||
                    questionsLoading ||
                    pdfLoading ||
                    questions.length === 0
                  }
                >
                  {generatingQuestions ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Regenerating...
                    </>
                  ) : (
                    "Regenerate All"
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Interview Questions</CardTitle>
                <CardDescription>
                  Generated questions for the mandatory skills
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {/* <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLatestQuestions}
                  disabled={
                    questionsLoading || generatingQuestions || pdfLoading
                  }
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      questionsLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button> */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGlobalFeedbackDialogOpen(true)}
                  disabled={
                    questionsLoading || generatingQuestions || pdfLoading
                  }
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Global Feedback
                </Button>
                {hasDislikedQuestions() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={regenerateAllDislikedQuestions}
                    disabled={
                      questionsLoading || generatingQuestions || pdfLoading
                    }
                  >
                    {questionsLoading ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Disliked
                      </>
                    )}
                  </Button>
                )}
                {questions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={regenerateAllQuestions}
                    disabled={
                      questionsLoading || generatingQuestions || pdfLoading
                    }
                  >
                    {generatingQuestions ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Regenerating...
                      </>
                    ) : (
                      "Regenerate All"
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateExcel}
                  disabled={
                    excelExporting || questionsLoading || generatingQuestions
                  }
                >
                  {excelExporting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Generating Excel...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Excel
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePDF}
                  disabled={
                    pdfLoading || questionsLoading || generatingQuestions
                  }
                >
                  {pdfLoading ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {questionsLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Spinner size="lg" className="mb-4" />
                  <p className="text-muted-foreground">Loading questions...</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No questions have been generated yet.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      onClick={() => generateQuestionsForRecord(false)}
                      disabled={
                        generatingQuestions || questionsLoading || pdfLoading
                      }
                      variant="outline"
                    >
                      {generatingQuestions ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Generating...
                        </>
                      ) : (
                        "Generate Questions"
                      )}
                    </Button>
                    <Button
                      onClick={regenerateAllQuestions}
                      disabled={
                        generatingQuestions || questionsLoading || pdfLoading
                      }
                    >
                      {generatingQuestions ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Regenerating...
                        </>
                      ) : (
                        "Regenerate All"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-md border relative overflow-x-auto"
                  style={{ width: "100%" }}
                >
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[10%]">Skill</TableHead>
                        <TableHead className="w-[8%]">Category</TableHead>
                        <TableHead className="w-[10%]">Format</TableHead>
                        <TableHead className="w-[8%]">Coding</TableHead>
                        <TableHead className="w-[42%]">Question</TableHead>
                        <TableHead className="w-[15%] text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedQuestions.map((question, index) => {
                        // Check if this is a new skill group
                        const isNewSkillGroup =
                          question.skillId !== currentSkillId;
                        // Update current skill
                        currentSkillId = question.skillId;

                        return (
                          <Fragment key={question.id}>
                            {isNewSkillGroup && (
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={6} className="py-2">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="font-semibold">
                                        {getSkillName(question.skillId)}
                                      </span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        (
                                        {getSkillNumQuestions(question.skillId)}{" "}
                                        questions requested,{" "}
                                        {getSkillDifficulty(question.skillId)}{" "}
                                        difficulty)
                                      </span>
                                    </div>
                                    {getSkillQuestionCount(question.skillId) >
                                      0 && (
                                      <div className="flex items-center gap-2">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                                👍{" "}
                                                {
                                                  getSkillLikeStats(
                                                    question.skillId
                                                  ).liked
                                                }
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              {
                                                getSkillLikeStats(
                                                  question.skillId
                                                ).liked
                                              }{" "}
                                              questions marked as helpful
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>

                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                                                👎{" "}
                                                {
                                                  getSkillLikeStats(
                                                    question.skillId
                                                  ).disliked
                                                }
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              {
                                                getSkillLikeStats(
                                                  question.skillId
                                                ).disliked
                                              }{" "}
                                              questions marked as not helpful
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                            <TableRow
                              className={cn(
                                "cursor-pointer hover:bg-muted/50",
                                question.liked === "LIKED" && "bg-green-50",
                                question.liked === "DISLIKED" && "bg-red-50"
                              )}
                            >
                              <TableCell>
                                {/* Add small indentation for grouped questions */}
                                <div className="pl-4">
                                  <span className="text-sm text-muted-foreground">
                                    Question {index + 1}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getCategoryClass(
                                    question.category
                                  )}`}
                                >
                                  {question.category}
                                </span>
                              </TableCell>
                              {/* <TableCell>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getDifficultyClass(
                                    question.difficulty
                                  )}`}
                                >
                                  {question.difficulty}
                                </span>
                              </TableCell> */}
                              <TableCell>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getQuestionFormatClass(
                                    question.questionFormat || "Scenario"
                                  )}`}
                                >
                                  {question.questionFormat || "Scenario"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                    question.coding
                                      ? "bg-blue-50 text-blue-800 border-blue-200"
                                      : "bg-gray-50 text-gray-800 border-gray-200"
                                  }`}
                                >
                                  {question.coding ? "Yes" : "No"}
                                </span>
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="whitespace-normal break-words">
                                  <QuestionDialog
                                    questionId={question.id}
                                    question={question.question}
                                    answer={question.answer}
                                    category={question.category}
                                    difficulty={question.difficulty}
                                    questionFormat={question.questionFormat}
                                    coding={question.coding}
                                    liked={question.liked}
                                    feedback={question.feedback}
                                    onStatusChange={(status) =>
                                      handleQuestionStatusChange(
                                        question.id,
                                        status
                                      )
                                    }
                                    onFeedbackChange={(feedback) =>
                                      handleQuestionFeedbackChange(
                                        question.id,
                                        feedback
                                      )
                                    }
                                    onRegenerateQuestion={
                                      handleRegenerateQuestion
                                    }
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleOpenFeedbackDialog(question.id)
                                    }
                                    className="h-8 w-8"
                                  >
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info
                                            className={cn(
                                              "h-4 w-4",
                                              question.feedback
                                                ? "text-blue-500"
                                                : "text-gray-400"
                                            )}
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {question.feedback
                                            ? "Edit feedback"
                                            : "Add feedback"}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleQuestionStatusChange(
                                        question.id,
                                        "LIKED"
                                      )
                                    }
                                    className={cn(
                                      "h-8 w-8",
                                      question.liked === "LIKED" &&
                                        "bg-green-100 text-green-800"
                                    )}
                                  >
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center">
                                            👍
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Mark as helpful
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleQuestionStatusChange(
                                        question.id,
                                        "DISLIKED"
                                      )
                                    }
                                    className={cn(
                                      "h-8 w-8",
                                      question.liked === "DISLIKED" &&
                                        "bg-red-100 text-red-800"
                                    )}
                                  >
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center">
                                            👎
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Mark as not helpful
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("skills")}>
                Back to Skills
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Global Feedback Dialog */}
      <GlobalFeedbackDialog
        open={globalFeedbackDialogOpen}
        onOpenChange={setGlobalFeedbackDialogOpen}
        recordId={record.id}
        existingFeedback={globalFeedback}
        onFeedbackSubmitted={() => {
          fetchGlobalFeedback();
          toast.success(
            "Global feedback saved. It will be used when regenerating questions."
          );
        }}
      />

      {/* Add the FeedbackDialog component */}
      <FeedbackDialog />

      {/* Question Generation Dialog */}
      <QuestionGenerationDialog
        open={questionGenerationDialogOpen}
        title={generationProgress.title}
        description={generationProgress.description}
        showProgress={generationProgress.showProgress}
        progressValue={generationProgress.progressValue}
        progressText={generationProgress.progressText}
      />

      {/* Bulk Delete Confirmation Dialog for Priority Mode */}
      <Dialog
        open={confirmBulkDeleteOpen}
        onOpenChange={setConfirmBulkDeleteOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the following{" "}
              {selectedSkillsInPriorityMode.size} skill
              {selectedSkillsInPriorityMode.size > 1 ? "s" : ""}? This action
              cannot be undone and will also remove all related questions.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-32 overflow-y-auto">
              <ul className="list-disc list-inside space-y-1">
                {getSelectedSkillNamesInPriorityMode().map((name, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmBulkDeleteOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDeleteInPriorityMode}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
