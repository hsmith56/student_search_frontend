"use client";

import { apiFetch } from "@/lib/api/api-client";

type NewsFeedQuery = string | URLSearchParams;

export function getNewsFeed<T>(query?: NewsFeedQuery) {
  const queryString =
    typeof query === "string" ? query : query instanceof URLSearchParams ? query.toString() : "";
  const suffix = queryString ? `?${queryString}` : "";

  return apiFetch<T>(`/news_feed${suffix}`, {
    method: "GET",
  });
}

