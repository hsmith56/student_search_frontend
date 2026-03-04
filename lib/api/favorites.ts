"use client";

import { apiFetch } from "@/lib/api/api-client";

export function getFavorites<T>() {
  return apiFetch<T>("/user/favorites", {
    method: "GET",
  });
}

export function addFavorite(appId: string | number) {
  return apiFetch<unknown>(`/user/favorites?app_id=${encodeURIComponent(String(appId))}`, {
    method: "PATCH",
  });
}

export function removeFavorite(appId: string | number) {
  return apiFetch<unknown>(`/user/favorites?app_id=${encodeURIComponent(String(appId))}`, {
    method: "DELETE",
  });
}

export function getFavoriteStates<T>() {
  return apiFetch<T>("/user/states", {
    method: "GET",
  });
}

export function updateFavoriteStates(states: string[]) {
  return apiFetch<unknown>("/user/states", {
    method: "PATCH",
    jsonBody: states,
  });
}

