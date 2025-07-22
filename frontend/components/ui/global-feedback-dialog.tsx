import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { Spinner } from "./spinner";
import { toast } from "sonner";

interface GlobalFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  existingFeedback?: string;
  onFeedbackSubmitted: () => void;
}

export function GlobalFeedbackDialog({
  open,
  onOpenChange,
  recordId,
  existingFeedback = "",
  onFeedbackSubmitted,
}: GlobalFeedbackDialogProps) {
  const [feedback, setFeedback] = useState(existingFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update feedback when existingFeedback changes
  useEffect(() => {
    setFeedback(existingFeedback);
  }, [existingFeedback]);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast.error("Please provide feedback");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/records/${recordId}/global-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedback }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      toast.success("Global feedback submitted successfully");
      onFeedbackSubmitted();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting global feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white  ">
        <DialogHeader>
          <DialogTitle>Global Feedback for All Questions</DialogTitle>
          <DialogDescription>
            Provide feedback that applies to all questions. This will be used
            when regenerating questions.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <textarea
            className="w-full min-h-[200px] p-3 border rounded-md text-sm"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Please provide your feedback for all questions. What would you like to improve? What kind of questions do you prefer? What style, tone, or content would be most helpful?"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
