"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Spinner } from "./spinner";

interface Feedback {
  id: string;
  content: string;
  createdAt: string;
}

interface SkillFeedbackListProps {
  skillId: string;
  skillName: string;
  refreshTrigger?: number;
}

export function SkillFeedbackList({
  skillId,
  skillName,
  refreshTrigger = 0,
}: SkillFeedbackListProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
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

    fetchFeedback();
  }, [skillId, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-center">
        {error}
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No feedback available for {skillName}
      </div>
    );
  }

  return (
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
  );
} 