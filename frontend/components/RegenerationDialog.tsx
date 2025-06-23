"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Loader2 } from "lucide-react";
import { useRegeneration } from "@/hooks/useRegeneration";
import { Question } from "@/types/dashboard";

interface RegenerationDialogProps {
  question: Question;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newQuestion: Question, regenerationId: string) => void;
}

const REGENERATION_REASONS = [
  { value: "too_easy", label: "Question is too easy" },
  { value: "too_hard", label: "Question is too difficult" },
  { value: "unclear", label: "Question is unclear or confusing" },
  { value: "not_relevant", label: "Question is not relevant to the skill" },
  { value: "poor_quality", label: "Poor question quality" },
  { value: "want_variety", label: "Want more variety in questions" },
  { value: "specific_format", label: "Need different question format" },
  { value: "other", label: "Other reason" },
];

export function RegenerationDialog({
  question,
  isOpen,
  onClose,
  onSuccess,
}: RegenerationDialogProps) {
  const [reason, setReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [userFeedback, setUserFeedback] = useState<string>("");

  const { regenerateQuestion, isRegenerating, error } = useRegeneration();

  const handleRegenerate = async () => {
    try {
      const finalReason =
        reason === "other"
          ? customReason
          : REGENERATION_REASONS.find((r) => r.value === reason)?.label || "";

      const result = await regenerateQuestion({
        questionId: question.id,
        reason: finalReason,
        userFeedback: userFeedback.trim() || undefined,
      });

      onSuccess(result.question, result.regeneration.id);
      handleClose();
    } catch (err) {
      console.error("Failed to regenerate question:", err);
    }
  };

  const handleClose = () => {
    setReason("");
    setCustomReason("");
    setUserFeedback("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Regenerate Question
          </DialogTitle>
          <DialogDescription>
            Help us understand why you want to regenerate this question to
            provide a better alternative.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for regeneration</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REGENERATION_REASONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Custom reason</Label>
              <Textarea
                id="customReason"
                placeholder="Please describe your specific reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={2}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="feedback">Additional feedback (optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Any additional feedback to help generate a better question..."
              value={userFeedback}
              onChange={(e) => setUserFeedback(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isRegenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={
              isRegenerating ||
              !reason ||
              (reason === "other" && !customReason.trim())
            }
          >
            {isRegenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Question
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
