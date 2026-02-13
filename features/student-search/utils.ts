import type React from "react";
import type { StudentRecord } from "@/features/student-search/types";

export const getStatusRingColor = (status?: string) => {
  if (!status) return "border-[var(--brand-border)]";

  const statusLower = status.toLowerCase();
  if (statusLower.includes("pending")) return "border-[var(--brand-highlight)]";
  if (statusLower.includes("placed")) return "border-[var(--brand-success)]";
  if (statusLower === "allocated")
    return "border-[var(--brand-primary)] bg-[var(--brand-surface-elevated)]";
  if (statusLower === "unassigned")
    return "border-[var(--brand-muted)] bg-[rgba(114,125,131,0.14)]";

  return "border-[var(--brand-border)]";
};

export const getStatusBadgeClass = (status?: string) => {
  const statusLower = status?.toLowerCase() ?? "";

  if (statusLower.includes("unassigned")) {
    return "border border-[rgba(114,125,131,0.42)] bg-[rgba(114,125,131,0.12)] text-[var(--brand-body)]";
  }
  if (statusLower.includes("pending")) {
    return "border border-[rgba(255,194,62,0.62)] bg-[rgba(255,194,62,0.2)] text-[#8a6200]";
  }
  if (statusLower.includes("placed") || statusLower.includes("accepted")) {
    return "border border-[rgba(0,144,63,0.48)] bg-[rgba(0,144,63,0.14)] text-[var(--brand-success-deep)]";
  }

  return "border border-[rgba(0,94,184,0.44)] bg-[rgba(0,94,184,0.12)] text-[var(--brand-primary-deep)]";
};

export const textOrNotProvided = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text ? text : "Not provided";
};

export const extractMediaLink = (student: StudentRecord | null): string => {
  if (!student) return "";

  const candidates = [
    student.media_link,
    student.mediaLink,
    student.media_url,
    student.mediaUrl,
    student.video_link,
    student.videoLink,
    student.video_url,
    student.videoUrl,
  ];

  for (const candidate of candidates) {
    const value = String(candidate ?? "").trim();
    const normalized = value.toLowerCase();
    if (
      value &&
      normalized !== "null" &&
      normalized !== "none" &&
      normalized !== "n/a"
    ) {
      return value;
    }
  }

  return "";
};

export const formatGender = (genderValue: unknown) => {
  const rawValue = Array.isArray(genderValue) ? genderValue[0] : genderValue;
  const normalized = String(rawValue ?? "").trim().toLowerCase();

  if (!normalized) return "-";
  if (normalized.startsWith("m")) return "Male";
  if (normalized.startsWith("f")) return "Female";

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const sortStudentsLocally = (
  list: StudentRecord[],
  field: string,
  isDescending: boolean
) => {
  const getSortValue = (student: StudentRecord) => {
    switch (field) {
      case "first_name":
        return student.first_name ?? "";
      case "country":
        return student.country ?? "";
      case "gpa":
        return Number(student.gpa);
      case "adjusted_age":
        return Number(student.adjusted_age);
      case "placement_status":
        return student.placement_status ?? "";
      default:
        return student[field] ?? "";
    }
  };

  return [...list].sort((a, b) => {
    const av = getSortValue(a);
    const bv = getSortValue(b);

    let comparison = 0;
    if (typeof av === "number" && typeof bv === "number") {
      const an = Number.isNaN(av) ? Number.NEGATIVE_INFINITY : av;
      const bn = Number.isNaN(bv) ? Number.NEGATIVE_INFINITY : bv;
      comparison = an - bn;
    } else {
      comparison = String(av).localeCompare(String(bv), undefined, {
        sensitivity: "base",
        numeric: true,
      });
    }

    return isDescending ? -comparison : comparison;
  });
};

export const animationStyle = (
  shouldAnimateResults: boolean,
  index: number
): React.CSSProperties | undefined =>
  shouldAnimateResults
    ? ({ "--results-item-index": index } as React.CSSProperties)
    : undefined;

export const getFavoriteStudentId = (student: StudentRecord): string => {
  const appId = student.app_id;
  if (appId !== undefined && appId !== null) {
    return String(appId);
  }

  const paxId = student.pax_id;
  if (paxId !== undefined && paxId !== null) {
    return String(paxId);
  }

  return "";
};
