"use client";

import { apiFetch } from "@/lib/api/api-client";

export function getFeedbackItems<T>() {
  return apiFetch<T>("/feedback/", {
    method: "GET",
  });
}

export function createFeedback(comment: string) {
  return apiFetch<unknown>("/feedback/", {
    method: "POST",
    jsonBody: { comment },
  });
}

export function deleteFeedbackItem(id: number | string) {
  return apiFetch<unknown>(`/feedback/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });
}

