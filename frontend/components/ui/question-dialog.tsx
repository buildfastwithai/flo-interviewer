"use client";

import { useState, useEffect } from "react";
import { MessageSquareText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "./dialog";
import { Button } from "./button";
import { QuestionLikeButtons } from "./question-like-buttons";
import { cn } from "@/lib/utils";

interface QuestionDialogProps {
  questionId: string;
  question: string;
  answer: string;
  category: string;
  difficulty: string;
  questionFormat?: string;
  coding?: boolean;
  liked?: "LIKED" | "DISLIKED" | "NONE";
  feedback?: string;
  onStatusChange?: (status: "LIKED" | "DISLIKED" | "NONE") => void;
  onFeedbackChange?: (feedback: string) => void;
  onRegenerateQuestion?: (questionId: string) => Promise<void>;
}

export function QuestionDialog({
  questionId,
  question,
  answer,
  category,
  difficulty,
  questionFormat = "Scenario",
  coding = false,
  liked = "NONE",
  feedback = "",
  onStatusChange,
  onFeedbackChange,
  onRegenerateQuestion,
}: QuestionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(question);
  const [currentAnswer, setCurrentAnswer] = useState(answer);

  // Update local state when props change
  useEffect(() => {
    setCurrentQuestion(question);
    setCurrentAnswer(answer);
  }, [question, answer]);

  // Helper function to get CSS class based on difficulty
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

  // Helper function to get CSS class based on category
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

  // Helper function to get CSS class based on question format
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

  // Handle regenerate question
  const handleRegenerateQuestion = async (id: string) => {
    if (!onRegenerateQuestion) return;

    await onRegenerateQuestion(id);
    // The parent component should update the question content
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer hover:underline">{currentQuestion}</div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl bg-white">
        <DialogHeader>
          <DialogTitle>{currentQuestion}</DialogTitle>
          <div className="flex gap-2 mt-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getCategoryClass(
                category
              )}`}
            >
              {category}
            </span>
            {/* <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getDifficultyClass(
                difficulty
              )}`}
            >
              {difficulty}
            </span> */}
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getQuestionFormatClass(
                questionFormat
              )}`}
            >
              {questionFormat}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                coding
                  ? "bg-blue-50 text-blue-800 border-blue-200"
                  : "bg-gray-50 text-gray-800 border-gray-200"
              }`}
            >
              Coding: {coding ? "Yes" : "No"}
            </span>
          </div>
        </DialogHeader>
        <div className="py-4">
          <h3 className="text-sm font-semibold mb-2">Suggested Answer:</h3>
          <div className="bg-muted/30 p-4 rounded-md text-sm whitespace-pre-wrap">
            {currentAnswer}
          </div>
        </div>
        <DialogFooter className="flex justify-between items-center">
          <div className="flex-grow">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </div>
          <div>
            {/* <QuestionLikeButtons
              questionId={questionId}
              initialStatus={liked}
              initialFeedback={feedback}
              onStatusChange={onStatusChange}
              onFeedbackChange={onFeedbackChange}
              onRegenerateQuestion={handleRegenerateQuestion}
            /> */}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
