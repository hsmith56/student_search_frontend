"use client";

import { apiFetch } from "@/lib/api/api-client";

export function getLastUpdateTime() {
  return apiFetch<unknown[]>("/misc/last_update_time", {
    method: "GET",
  });
}

export function getCountries() {
  return apiFetch<unknown>("/misc/countries", {
    method: "GET",
  });
}

export function getAvailableNow() {
  return apiFetch<unknown[]>("/misc/available_now", {
    method: "GET",
  });
}

export function getUnassignedNow() {
  return apiFetch<unknown[]>("/misc/unassigned_now", {
    method: "GET",
  });
}

export function getPlaced() {
  return apiFetch<unknown>("/misc/placed", {
    method: "GET",
  });
}

