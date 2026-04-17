"use client";

import { elapsedMs, logPerf, now } from "@/lib/perf-logger";

const API_BASE_PATH = "/api";

export class ApiError extends Error {
  status: number;
  responseBody: unknown;

  constructor(message: string, status: number, responseBody: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | null;
  jsonBody?: unknown;
  redirectOnUnauthorized?: boolean;
};

function normalizePath(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/api/")) {
    return path;
  }

  return `${API_BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildHeaders(
  headers: HeadersInit | undefined,
  hasJsonBody: boolean
): Headers {
  const merged = new Headers(headers);

  if (!merged.has("Accept")) {
    merged.set("Accept", "application/json");
  }

  if (hasJsonBody && !merged.has("Content-Type")) {
    merged.set("Content-Type", "application/json");
  }

  return merged;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  const text = await response.text();
  if (!text.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(status: number, payload: unknown): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }

  return `Request failed with status ${status}`;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const requestStart = now();
  const {
    jsonBody,
    redirectOnUnauthorized = true,
    credentials,
    headers,
    ...requestInit
  } = options;

  const hasJsonBody = jsonBody !== undefined;
  const normalizedPath = normalizePath(path);
  const method = (requestInit.method ?? "GET").toUpperCase();

  const response = await fetch(normalizedPath, {
    ...requestInit,
    credentials: credentials ?? "include",
    headers: buildHeaders(headers, hasJsonBody),
    body: hasJsonBody ? JSON.stringify(jsonBody) : (options.body ?? null),
  });

  if (response.status === 401) {
    logPerf("apiFetch", {
      method,
      path: normalizedPath,
      status: response.status,
      ok: false,
      duration_ms: elapsedMs(requestStart),
    });
    if (
      redirectOnUnauthorized &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      window.location.href = "/login";
    }

    const payload = await parseResponseBody(response);
    throw new ApiError(getErrorMessage(response.status, payload), response.status, payload);
  }

  if (!response.ok) {
    logPerf("apiFetch", {
      method,
      path: normalizedPath,
      status: response.status,
      ok: false,
      duration_ms: elapsedMs(requestStart),
    });
    const payload = await parseResponseBody(response);
    throw new ApiError(getErrorMessage(response.status, payload), response.status, payload);
  }

  const payload = await parseResponseBody(response);

  logPerf("apiFetch", {
    method,
    path: normalizedPath,
    status: response.status,
    ok: true,
    duration_ms: elapsedMs(requestStart),
    payload_type: Array.isArray(payload) ? "array" : typeof payload,
    payload_items: Array.isArray(payload) ? payload.length : undefined,
  });

  return payload as T;
}

