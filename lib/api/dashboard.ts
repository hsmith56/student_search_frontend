"use client";

import { apiFetch } from "@/lib/api/api-client";

export function getDashboardInterests() {
  return apiFetch<unknown>("/dashboard/interests", {
    method: "GET",
  });
}

export function getDashboardInterestRarity<T = unknown>() {
  return apiFetch<T>("/dashboard/interest-rarity", {
    method: "GET",
  });
}
