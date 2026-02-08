import type React from "react";
import type { StudentRecord } from "@/features/student-search/types";

export const getStatusRingColor = (status?: string) => {
  if (!status) return "border-slate-300";

  const statusLower = status.toLowerCase();
  if (statusLower.includes("pending")) return "border-yellow-200";
  if (statusLower.includes("placed")) return "border-green-500";
  if (statusLower === "allocated") return "border-blue-500 bg-white";
  if (statusLower === "unassigned") return "border-slate-500 bg-slate-300";

  return "border-slate-300";
};

export const getStatusBadgeClass = (status?: string) => {
  const statusLower = status?.toLowerCase() ?? "";

  if (statusLower.includes("unassigned")) {
    return "bg-slate-100 text-slate-700 border border-slate-300";
  }
  if (statusLower.includes("pending")) {
    return "bg-yellow-100 text-yellow-700 border border-yellow-300";
  }
  if (statusLower.includes("placed")) {
    return "bg-green-100 text-green-700 border border-green-300";
  }

  return "bg-blue-100 text-blue-700 border border-blue-300";
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
