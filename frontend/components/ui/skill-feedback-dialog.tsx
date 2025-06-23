"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./button";
import { Textarea } from "./textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "./dialog";

interface SkillFeedbackDialogProps {
  skillId: string;
  skillName: string;
  onFeedbackSubmitted?: () => void;
}

export function SkillFeedbackDialog({
  skillId,
  skillName,
  onFeedbackSubmitted,
}: SkillFeedbackDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast.error("Please enter feedback");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/skills/${skillId}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: feedback }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      toast.success("Feedback submitted successfully");
      setFeedback("");
      setIsOpen(false);
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Add Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Feedback for {skillName}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Share your thoughts about questions for this skill..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={5}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 