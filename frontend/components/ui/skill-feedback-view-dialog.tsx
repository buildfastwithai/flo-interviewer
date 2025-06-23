"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "./card";
import { Spinner } from "./spinner";

interface Feedback {
  id: string;
  content: string;
  createdAt: string;
}

interface SkillFeedbackViewDialogProps {
  skillId: string;
  skillName: string;
  feedbackCount: number;
  refreshTrigger?: number;
}

export function SkillFeedbackViewDialog({
  skillId,
  skillName,
  feedbackCount,
  refreshTrigger = 0,
}: SkillFeedbackViewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = async () => {
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/skills/${skillId}/feedback`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch feedback");
      }
      
      const data = await response.json();
      setFeedbacks(data.feedbacks);
    } catch (err) {
      console.error("Error fetching feedback:", err);
      setError("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  // Fetch feedback when dialog opens or refreshTrigger changes
  useEffect(() => {
    fetchFeedback();
  }, [isOpen, refreshTrigger, skillId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) fetchFeedback();
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          aria-label={`View feedback for ${skillName}`}
        >
          View ({feedbackCount})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Feedback for {skillName}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Spinner />
            </div>
          ) : error ? (
            <div className="p-4 text-red-500 text-center">
              {error}
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No feedback available for {skillName}
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((feedback) => (
                <Card key={feedback.id} className="bg-gray-50">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>
                        Submitted on {format(new Date(feedback.createdAt), "MMM d, yyyy")}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap">{feedback.content}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 