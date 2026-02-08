"use client";

import { useEffect, useState } from "react";
import {
  DESCENDING_STORAGE_KEY,
  ORDER_BY_STORAGE_KEY,
} from "@/features/student-search/constants";
import type { ViewMode } from "@/features/student-search/types";

export function useStudentSearchPreferences() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "compact";
    return window.innerWidth >= 768 ? "compact" : "card";
  });

  const [orderBy, setOrderBy] = useState<string>(() => {
    if (typeof window === "undefined") return "adjusted_age";
    return localStorage.getItem(ORDER_BY_STORAGE_KEY) || "adjusted_age";
  });

  const [descending, setDescending] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(DESCENDING_STORAGE_KEY);
    if (stored === null) return true;
    return stored === "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ORDER_BY_STORAGE_KEY, orderBy);
    localStorage.setItem(DESCENDING_STORAGE_KEY, String(descending));
  }, [descending, orderBy]);

  return {
    viewMode,
    setViewMode,
    orderBy,
    setOrderBy,
    descending,
    setDescending,
  };
}
