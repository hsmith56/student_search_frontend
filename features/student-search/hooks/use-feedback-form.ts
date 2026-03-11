"use client";

import type React from "react";
import { useState } from "react";
import posthog from "posthog-js";
import { createFeedback } from "@/lib/api/feedback";

type UseFeedbackFormOptions = {
  onSuccess?: () => void | Promise<void>;
};

export function useFeedbackForm(options: UseFeedbackFormOptions = {}) {
  const { onSuccess } = options;
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const submitFeedback = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedComment = feedbackComment.trim();
    if (!trimmedComment) {
      setFeedbackError("Please enter feedback before submitting.");
      setFeedbackSuccess(null);
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      await createFeedback(trimmedComment);

      setFeedbackComment("");
      setFeedbackSuccess("Feedback submitted. Thank you.");
      posthog.capture("feedback_submitted");
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setFeedbackError("Unable to submit feedback right now. Please try again.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleFeedbackOpenChange = (open: boolean) => {
    setIsFeedbackOpen(open);
    if (!open) {
      setFeedbackError(null);
      setFeedbackSuccess(null);
    }
  };

  const openFeedbackDialog = () => {
    setIsFeedbackOpen(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);
  };

  return {
    isFeedbackOpen,
    feedbackComment,
    setFeedbackComment,
    isSubmittingFeedback,
    feedbackError,
    feedbackSuccess,
    submitFeedback,
    handleFeedbackOpenChange,
    openFeedbackDialog,
  };
}
