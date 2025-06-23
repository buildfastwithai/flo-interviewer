"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Spinner } from "./spinner";
import { Progress } from "./progress";
import { Brain, Lightbulb, Sparkles } from "lucide-react";

interface QuestionGenerationDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  showProgress?: boolean;
  progressValue?: number;
  progressText?: string;
}

export function QuestionGenerationDialog({
  open,
  title = "Generating Questions",
  description = "Please wait while we generate interview questions for your skills...",
  showProgress = false,
  progressValue = 0,
  progressText,
}: QuestionGenerationDialogProps) {
  const [dots, setDots] = useState("");
  const [animationStep, setAnimationStep] = useState(0);

  // Animate dots for loading effect
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, [open]);

  // Animated icon effect
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setAnimationStep((prev) => (prev + 1) % 3);
    }, 2000);

    return () => clearInterval(interval);
  }, [open]);

  const renderAnimatedIcon = () => {
    switch (animationStep) {
      case 0:
        return <Brain className="h-6 w-6 text-primary animate-pulse" />;
      case 1:
        return <Lightbulb className="h-6 w-6 text-primary animate-pulse" />;
      case 2:
        return <Sparkles className="h-6 w-6 text-primary animate-pulse" />;
      default:
        return <Brain className="h-6 w-6 text-primary animate-pulse" />;
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-lg border border-border/50 bg-[#f5f5f5]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-serif text-center flex items-center justify-center gap-2">
            {title}
            {renderAnimatedIcon()}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground max-w-sm mx-auto">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center text-center space-y-6 py-4 px-2">
          {/* Spinner */}
          <div className="relative p-6 rounded-full bg-primary/5 border border-primary/20 shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-full animate-pulse" />
            <Spinner size="lg" className="text-primary animate-spin" />
          </div>

          {/* Progress Section */}
          {showProgress && (
            <div className="w-full max-w-sm space-y-4 p-4 bg-muted rounded-lg border border-border/40 shadow-sm">
              {/* <div className="space-y-2">
                <Progress
                  value={progressValue}
                  className="w-full h-3 bg-blue-500 overflow-hidden"
                />
                <div className="flex justify-between items-center text-xs text-black">
                  <span className="font-medium">{progressValue}%</span>
                  <span>Complete</span>
                </div>
              </div> */}
              {progressText && (
                <p className="text-sm text-foreground font-medium bg-background/60 px-3 py-2 rounded-md border border-border/30 shadow-sm">
                  {progressText}
                </p>
              )}
            </div>
          )}

          {/* Loading Message */}
          <div className="space-y-3 max-w-md">
            <p className="text-sm text-muted-foreground/90 font-medium tracking-wide">
              This may take a few moments{dots}
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground/80 bg-background/30 p-2 rounded-md border border-border/20">
              <span className="animate-bounce">✨</span>
              <span>
                Creating personalized questions based on the job requirements
              </span>
              <span className="animate-bounce delay-150">✨</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
