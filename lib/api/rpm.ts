"use client";

import { apiFetch } from "@/lib/api/api-client";

export function getRpmSignupRequests<T>() {
  return apiFetch<T>("/rpm/register", {
    method: "GET",
  });
}

export function createRpmSignupRequest<T>(payload: unknown) {
  return apiFetch<T>("/rpm/register", {
    method: "POST",
    jsonBody: payload,
  });
}

export function updateRpmSignupRequest(
  userId: string | number,
  payload: unknown
) {
  return apiFetch<unknown>(`/rpm/register/${encodeURIComponent(String(userId))}`, {
    method: "PATCH",
    jsonBody: payload,
  });
}

export function resendRpmInvitation(userId: string | number) {
  return apiFetch<unknown>(
    `/rpm/register/${encodeURIComponent(String(userId))}/resend-invitation`,
    {
      method: "POST",
    }
  );
}

export function getRpmAdminUsers<T>() {
  return apiFetch<T>("/rpm/admin_get", {
    method: "GET",
  });
}

export function patchRpmAdminUser(userId: string | number, payload: unknown) {
  return apiFetch<unknown>(`/rpm/admin_patch/${encodeURIComponent(String(userId))}`, {
    method: "PATCH",
    jsonBody: payload,
  });
}

export function deleteRpmAdminUser(userId: string | number) {
  return apiFetch<unknown>(`/rpm/admin_delete/${encodeURIComponent(String(userId))}`, {
    method: "DELETE",
  });
}

