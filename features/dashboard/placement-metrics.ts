"use client";

import { normalizeState } from "@/features/dashboard/state-normalization";
import type {
  PlacementMetricItem,
  PlacementMetricRecord,
} from "@/features/dashboard/types";

function safeString(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parsePlacementDate(value: string): Date | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const parsedByDate = new Date(normalized);
  if (!Number.isNaN(parsedByDate.getTime())) {
    return parsedByDate;
  }

  const usDateMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!usDateMatch) return null;

  const month = Number(usDateMatch[1]);
  const day = Number(usDateMatch[2]);
  const year = Number(usDateMatch[3]);

  if (
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return candidate;
}

export function normalizePlacementMetrics(payload: unknown): PlacementMetricItem[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const normalizedItems = payload
    .map<PlacementMetricItem | null>((item, index) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const record = item as PlacementMetricRecord;
      const appId = safeNumber(record.app_id) ?? index;
      const city = safeString(record.city) ?? "Unknown city";
      const state = normalizeState(record.state);
      const placementDateRaw = safeString(record.placementDate) ?? "";
      const placementDate = parsePlacementDate(placementDateRaw);
      const placementTime = placementDate ? placementDate.getTime() : 0;

      return {
        appId,
        city,
        state,
        placementDateRaw,
        placementDate,
        placementTime,
      };
    })
    .filter((item): item is PlacementMetricItem => item !== null);

  return normalizedItems.sort((a, b) => {
    if (a.placementTime !== b.placementTime) {
      return b.placementTime - a.placementTime;
    }

    return b.appId - a.appId;
  });
}

