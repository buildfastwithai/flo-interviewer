import React, { useState, useEffect } from "react";
import { Badge } from "./badge";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./accordion";
import { QuestionLikeButtons } from "./question-like-buttons";
import { toast } from "sonner";

export interface Question {
  question: string;
  answer: string;
  category: "Technical" | "Experience" | "Problem Solving" | "Soft Skills";
  difficulty: "Easy" | "Medium" | "Hard";
  skillName?: string;
  id?: string;
  liked?: "LIKED" | "DISLIKED" | "NONE";
  feedback?: string;
}

interface QuestionsDisplayProps {
  questions: Question[];
  onGeneratePDF?: () => void;
  enableLikeButtons?: boolean;
  onQuestionUpdated?: (updatedQuestion: Question) => void;
  onQuestionsRefreshed?: () => void;
}

export function QuestionsDisplay({
  questions,
  onGeneratePDF,
  enableLikeButtons = false,
  onQuestionUpdated,
  onQuestionsRefreshed,
}: QuestionsDisplayProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [localQuestions, setLocalQuestions] = useState<Question[]>(questions);
  const [regeneratingQuestionIds, setRegeneratingQuestionIds] = useState<
    Set<string>
  >(new Set());

  // Update local questions when props change
  useEffect(() => {
    setLocalQuestions(questions);
  }, [questions]);

  const toggleQuestion = (index: number) => {
    setExpandedId(expandedId === index ? null : index);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Technical":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Experience":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Problem Solving":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "Soft Skills":
        return "bg-orange-100 text-orange-800 hover:bg-orange-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "Hard":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  // Handle regenerating a question
  const handleRegenerateQuestion = async (questionId: string) => {
    if (!questionId) return;

    try {
      setRegeneratingQuestionIds((prev) => new Set(prev).add(questionId));

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
        // Update the question locally
        const updatedQuestions = localQuestions.map((q) => {
          if (q.id === questionId) {
            const newContent = data.question.newContent;
            const updatedQuestion = {
              ...q,
              question: newContent.question,
              answer: newContent.answer,
              category: newContent.category,
              difficulty: newContent.difficulty,
              liked: "NONE",
              feedback: "",
            };

            // Notify parent component
            if (onQuestionUpdated) {
              onQuestionUpdated(updatedQuestion as any);
            }

            return updatedQuestion;
          }
          return q;
        });

        setLocalQuestions(updatedQuestions as any);

        // Re-open the expanded question if it was open
        if (expandedId !== null) {
          const expandedQuestion = localQuestions[expandedId];
          if (expandedQuestion && expandedQuestion.id === questionId) {
            // Force re-render by closing and reopening
            setExpandedId(null);
            setTimeout(() => setExpandedId(expandedId), 10);
          }
        }

        // Force a refresh by notifying parent
        if (onQuestionsRefreshed) {
          onQuestionsRefreshed();
        }

        toast.success("Question regenerated successfully");
      } else {
        throw new Error(data.error || "Failed to regenerate question");
      }
    } catch (error) {
      console.error("Error regenerating question:", error);
      toast.error("Failed to regenerate question");
    } finally {
      setRegeneratingQuestionIds((prev) => {
        const updated = new Set(prev);
        updated.delete(questionId);
        return updated;
      });
    }
  };

  // Handle status change
  const handleStatusChange = (
    questionId: string,
    newStatus: "LIKED" | "DISLIKED" | "NONE"
  ) => {
    setLocalQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, liked: newStatus } : q))
    );

    if (onQuestionUpdated) {
      const updatedQuestion = localQuestions.find((q) => q.id === questionId);
      if (updatedQuestion) {
        onQuestionUpdated({ ...updatedQuestion, liked: newStatus });
      }
    }
  };

  // Handle feedback change
  const handleFeedbackChange = (questionId: string, newFeedback: string) => {
    setLocalQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, feedback: newFeedback } : q
      )
    );

    if (onQuestionUpdated) {
      const updatedQuestion = localQuestions.find((q) => q.id === questionId);
      if (updatedQuestion) {
        onQuestionUpdated({ ...updatedQuestion, feedback: newFeedback });
      }
    }
  };

  // Check if there are any disliked questions that need regeneration
  const hasDislikedQuestions = localQuestions.some(
    (q) => q.liked === "DISLIKED"
  );

  // Regenerate all disliked questions
  const regenerateAllDislikedQuestions = async () => {
    // Get all disliked questions with feedback
    const dislikedQuestions = localQuestions.filter(
      (q) => q.liked === "DISLIKED" && q.id
    );

    if (dislikedQuestions.length === 0) return;

    try {
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

      // Now process regeneration for each disliked question
      const dislikedQuestionIds = dislikedQuestions.map((q) => q.id as string);

      // Process each disliked question sequentially
      for (const id of dislikedQuestionIds) {
        await handleRegenerateQuestion(id);
      }

      toast.success("All disliked questions have been regenerated");

      // Notify parent that questions have been refreshed
      if (onQuestionsRefreshed) {
        onQuestionsRefreshed();
      }
    } catch (error) {
      console.error("Error regenerating questions:", error);
      toast.error("Failed to regenerate all questions");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Generated Interview Questions</CardTitle>
          <div className="flex gap-2">
            {hasDislikedQuestions && (
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateAllDislikedQuestions}
                disabled={regeneratingQuestionIds.size > 0}
                className="text-xs"
              >
                Regenerate All Disliked
              </Button>
            )}
            {onGeneratePDF && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGeneratePDF}
                className="text-xs"
              >
                Export PDF
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ul className="space-y-4">
            {localQuestions.map((question, index) => (
              <li key={index}>
                <div
                  className={cn(
                    "border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                    expandedId === index ? "bg-muted/50" : "",
                    question.liked === "DISLIKED" && "border-red-200",
                    regeneratingQuestionIds.has(question.id || "") &&
                      "opacity-70"
                  )}
                  onClick={() => toggleQuestion(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getCategoryColor(question.category)}>
                          {question.category}
                        </Badge>
                        <Badge
                          className={getDifficultyColor(question.difficulty)}
                        >
                          {question.difficulty}
                        </Badge>
                        {question.skillName && (
                          <Badge className="bg-slate-100 text-slate-800">
                            {question.skillName}
                          </Badge>
                        )}
                        {question.liked === "DISLIKED" && (
                          <Badge className="bg-red-100 text-red-800">
                            Disliked
                          </Badge>
                        )}
                        {question.feedback && (
                          <Badge className="bg-blue-100 text-blue-800">
                            Has Feedback
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium">{question.question}</h3>

                      {expandedId === index && question.answer && (
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-semibold text-muted-foreground">
                              Suggested Answer:
                            </p>
                            {enableLikeButtons && question.id && (
                              <QuestionLikeButtons
                                questionId={question.id}
                                initialStatus={question.liked || "NONE"}
                                initialFeedback={question.feedback || ""}
                                onStatusChange={(status) =>
                                  handleStatusChange(question.id || "", status)
                                }
                                onFeedbackChange={(feedback) =>
                                  handleFeedbackChange(
                                    question.id || "",
                                    feedback
                                  )
                                }
                                onRegenerateQuestion={handleRegenerateQuestion}
                              />
                            )}
                          </div>
                          <div className="bg-muted/30 p-3 rounded-md text-sm">
                            {question.answer}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pl-2">
                      {expandedId === index ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
