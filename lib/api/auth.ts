"use client";

import { apiFetch } from "@/lib/api/api-client";

export type AuthUser = {
  username?: string;
  first_name?: string;
  account_type?: string;
  placing_states?: unknown;
};

type RegisterPayload = {
  first_name: string;
  username: string;
  password: string;
  signup_code: string;
};

type ChangePasswordPayload = {
  new_password: string;
  password: string;
};

export function getCurrentUser(options?: {
  redirectOnUnauthorized?: boolean;
  signal?: AbortSignal;
}) {
  return apiFetch<AuthUser>("/auth/me", {
    method: "GET",
    redirectOnUnauthorized: options?.redirectOnUnauthorized ?? false,
    signal: options?.signal,
  });
}

export function loginWithPassword(username: string, password: string) {
  const formData = new URLSearchParams();
  formData.append("grant_type", "password");
  formData.append("username", username);
  formData.append("password", password);

  return apiFetch<unknown>("/auth/login", {
    method: "POST",
    body: formData.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    redirectOnUnauthorized: false,
  });
}

export function registerUser(payload: RegisterPayload) {
  return apiFetch<unknown>("/auth/register", {
    method: "POST",
    jsonBody: payload,
    redirectOnUnauthorized: false,
  });
}

export function logoutUser() {
  return apiFetch<unknown>("/auth/logout", {
    method: "POST",
    redirectOnUnauthorized: false,
  });
}

export function changePassword(payload: ChangePasswordPayload) {
  return apiFetch<unknown>("/auth/change_password", {
    method: "POST",
    jsonBody: payload,
  });
}

