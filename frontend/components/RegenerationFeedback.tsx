"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, MessageSquare, CheckCircle } from "lucide-react";
import { useRegeneration } from "@/hooks/useRegeneration";
import { LikeStatus } from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface RegenerationFeedbackProps {
  regenerationId: string;
  currentLiked?: LikeStatus;
  currentFeedback?: string;
  onFeedbackSubmitted?: () => void;
}

export function RegenerationFeedback({
  regenerationId,
  currentLiked,
  currentFeedback,
  onFeedbackSubmitted,
}: RegenerationFeedbackProps) {
  const [liked, setLiked] = useState<LikeStatus>(currentLiked || "NONE");
  const [feedback, setFeedback] = useState(currentFeedback || "");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { updateRegenerationFeedback, isUpdatingFeedback, error } =
    useRegeneration();

  const handleLikeChange = async (newLiked: LikeStatus) => {
    setLiked(newLiked);

    try {
      await updateRegenerationFeedback({
        regenerationId,
        liked: newLiked,
        userFeedback: feedback.trim() || undefined,
      });
      setIsSubmitted(true);
      onFeedbackSubmitted?.();
    } catch (err) {
      console.error("Failed to update like status:", err);
    }
  };

  const handleFeedbackSubmit = async () => {
    try {
      await updateRegenerationFeedback({
        regenerationId,
        liked,
        userFeedback: feedback.trim() || undefined,
      });
      setIsSubmitted(true);
      onFeedbackSubmitted?.();
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Thank you for your feedback!
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          How was the regenerated question?
        </CardTitle>
        <CardDescription>
          Your feedback helps us improve question generation quality.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Rate the regenerated question</Label>
          <div className="flex gap-2">
            <Button
              variant={liked === "LIKED" ? "default" : "outline"}
              size="sm"
              onClick={() => handleLikeChange("LIKED")}
              disabled={isUpdatingFeedback}
              className={cn(
                "flex items-center gap-2",
                liked === "LIKED" && "bg-green-600 hover:bg-green-700"
              )}
            >
              <ThumbsUp className="h-4 w-4" />
              Better
            </Button>
            <Button
              variant={liked === "DISLIKED" ? "default" : "outline"}
              size="sm"
              onClick={() => handleLikeChange("DISLIKED")}
              disabled={isUpdatingFeedback}
              className={cn(
                "flex items-center gap-2",
                liked === "DISLIKED" && "bg-red-600 hover:bg-red-700"
              )}
            >
              <ThumbsDown className="h-4 w-4" />
              Worse
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="regeneration-feedback">
            Additional feedback (optional)
          </Label>
          <Textarea
            id="regeneration-feedback"
            placeholder="What specifically made this regeneration better or worse? Your input helps us improve..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <Button
          onClick={handleFeedbackSubmit}
          disabled={isUpdatingFeedback}
          size="sm"
          className="w-full"
        >
          {isUpdatingFeedback ? "Submitting..." : "Submit Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
}
