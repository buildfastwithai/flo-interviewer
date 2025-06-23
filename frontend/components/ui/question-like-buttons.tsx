"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Textarea } from "./textarea";
import { Label } from "./label";

interface QuestionLikeButtonsProps {
  questionId: string;
  initialStatus?: "LIKED" | "DISLIKED" | "NONE";
  initialFeedback?: string;
  onStatusChange?: (status: "LIKED" | "DISLIKED" | "NONE") => void;
  onFeedbackChange?: (feedback: string) => void;
  onRegenerateQuestion?: (questionId: string) => Promise<void>;
}

export function QuestionLikeButtons({
  questionId,
  initialStatus = "NONE",
  initialFeedback = "",
  onStatusChange,
  onFeedbackChange,
  onRegenerateQuestion,
}: QuestionLikeButtonsProps) {
  const [status, setStatus] = useState<"LIKED" | "DISLIKED" | "NONE">(
    initialStatus
  );
  const [feedback, setFeedback] = useState<string>(initialFeedback);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showFeedback, setShowFeedback] = useState(
    initialStatus === "DISLIKED" && initialFeedback !== ""
  );

  const handleLike = async (newStatus: "LIKED" | "DISLIKED" | "NONE") => {
    // If clicking the same button, toggle back to NONE
    const nextStatus = status === newStatus ? "NONE" : newStatus;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/questions/${questionId}/like`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update like status");
      }

      setStatus(nextStatus);
      if (onStatusChange) {
        onStatusChange(nextStatus);
      }

      // Show feedback input if disliked
      if (nextStatus === "DISLIKED") {
        setShowFeedback(true);
      } else if (nextStatus === "LIKED") {
        setShowFeedback(false);
        toast.success("Question marked as helpful");
      } else {
        setShowFeedback(false);
      }
    } catch (error) {
      toast.error("Failed to update question status");
      console.error("Error updating question like status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback(e.target.value);
  };

  const submitFeedback = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/questions/${questionId}/feedback`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedback }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      if (onFeedbackChange) {
        onFeedbackChange(feedback);
      }

      toast.success("Feedback submitted");
    } catch (error) {
      toast.error("Failed to submit feedback");
      console.error("Error submitting feedback:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!onRegenerateQuestion) return;

    // First submit feedback if it exists but hasn't been submitted yet
    if (feedback && feedback !== initialFeedback) {
      setIsLoading(true);
      try {
        // Submit feedback first
        const response = await fetch(`/api/questions/${questionId}/feedback`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ feedback }),
        });

        if (!response.ok) {
          throw new Error("Failed to submit feedback before regeneration");
        }

        // Update the parent component with new feedback
        if (onFeedbackChange) {
          onFeedbackChange(feedback);
        }
      } catch (error) {
        toast.error("Failed to submit feedback");
        console.error("Error submitting feedback:", error);
        setIsLoading(false);
        return; // Don't proceed with regeneration if feedback submission fails
      } finally {
        setIsLoading(false);
      }
    }

    // Now proceed with regeneration
    setIsRegenerating(true);
    try {
      await onRegenerateQuestion(questionId);
      toast.success("Question regenerated successfully");
      setShowFeedback(false);
      setStatus("NONE");
      setFeedback("");
    } catch (error) {
      toast.error("Failed to regenerate question");
      console.error("Error regenerating question:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleLike("LIKED")}
          disabled={isLoading || isRegenerating}
          className={cn(
            "rounded-full",
            status === "LIKED" && "bg-green-100 text-green-700 border-green-200"
          )}
        >
          <ThumbsUp
            className={cn(
              "h-4 w-4",
              status === "LIKED" ? "fill-green-500" : ""
            )}
          />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleLike("DISLIKED")}
          disabled={isLoading || isRegenerating}
          className={cn(
            "rounded-full",
            status === "DISLIKED" && "bg-red-100 text-red-700 border-red-200"
          )}
        >
          <ThumbsDown
            className={cn(
              "h-4 w-4",
              status === "DISLIKED" ? "fill-red-500" : ""
            )}
          />
        </Button>

        {(status === "DISLIKED" || feedback) && onRegenerateQuestion && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isLoading || isRegenerating}
            className="gap-1 ml-2"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRegenerating && "animate-spin")}
            />
            Regenerate
          </Button>
        )}
      </div>

      {showFeedback && (
        <div className="space-y-2">
          <Label htmlFor={`feedback-${questionId}`} className="text-xs">
            Provide feedback to improve this question
          </Label>
          <div className="flex gap-2">
            <Textarea
              id={`feedback-${questionId}`}
              value={feedback}
              onChange={handleFeedbackChange}
              placeholder="What would make this question better?"
              className="min-h-[60px] text-sm"
              disabled={isLoading || isRegenerating}
            />
          </div>
          {feedback && (
            <Button
              size="sm"
              onClick={submitFeedback}
              disabled={isLoading || isRegenerating}
              className="w-full mt-1"
            >
              Submit Feedback
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
