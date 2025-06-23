import { useState } from "react";
import { Regeneration, LikeStatus } from "@/types/dashboard";

interface RegenerateQuestionParams {
  questionId: string;
  reason?: string;
  userFeedback?: string;
}

interface UpdateRegenerationFeedbackParams {
  regenerationId: string;
  liked?: LikeStatus;
  userFeedback?: string;
}

export function useRegeneration() {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isUpdatingFeedback, setIsUpdatingFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regenerateQuestion = async (params: RegenerateQuestionParams) => {
    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/questions/${params.questionId}/regenerate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: params.reason,
            userFeedback: params.userFeedback,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to regenerate question");
      }

      return {
        question: data.question,
        regeneration: data.regeneration,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsRegenerating(false);
    }
  };

  const updateRegenerationFeedback = async (
    params: UpdateRegenerationFeedbackParams
  ) => {
    setIsUpdatingFeedback(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/regenerations/${params.regenerationId}/feedback`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            liked: params.liked,
            userFeedback: params.userFeedback,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update regeneration feedback");
      }

      return data.regeneration;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdatingFeedback(false);
    }
  };

  const getRegenerationAnalytics = async (filters?: {
    recordId?: string;
    skillId?: string;
    limit?: number;
  }) => {
    try {
      const searchParams = new URLSearchParams();
      if (filters?.recordId) searchParams.append("recordId", filters.recordId);
      if (filters?.skillId) searchParams.append("skillId", filters.skillId);
      if (filters?.limit)
        searchParams.append("limit", filters.limit.toString());

      const response = await fetch(
        `/api/analytics/regenerations?${searchParams}`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch regeneration analytics");
      }

      return data.analytics;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    }
  };

  return {
    regenerateQuestion,
    updateRegenerationFeedback,
    getRegenerationAnalytics,
    isRegenerating,
    isUpdatingFeedback,
    error,
    clearError: () => setError(null),
  };
}
