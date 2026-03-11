"use client";

import { apiFetch } from "@/lib/api/api-client";

export type RecommendationRequest = {
  usahsid: string;
  limit?: number;
  compare?: string;
  priority_interests?: string[];
};

export function createRecommendations<T>(payload: RecommendationRequest) {
  return apiFetch<T>("/recommendation/", {
    method: "POST",
    jsonBody: payload,
  });
}
