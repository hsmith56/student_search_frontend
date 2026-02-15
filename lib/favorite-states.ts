"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const FAVORITE_STATES_STORAGE_KEY = "student_search.favorite_states.v1";

function normalizeFavoriteStates(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const deduped = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    deduped.add(trimmed);
  }

  return Array.from(deduped);
}

export function readFavoriteStates(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(FAVORITE_STATES_STORAGE_KEY);
    if (!raw) return [];
    return normalizeFavoriteStates(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeFavoriteStates(states: string[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      FAVORITE_STATES_STORAGE_KEY,
      JSON.stringify(normalizeFavoriteStates(states)),
    );
  } catch {
    // Ignore quota / parsing issues; this is a non-critical preference.
  }
}

export function useFavoriteStates() {
  const [favoriteStates, setFavoriteStates] = useState<string[]>(() =>
    readFavoriteStates(),
  );

  useEffect(() => {
    writeFavoriteStates(favoriteStates);
  }, [favoriteStates]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== FAVORITE_STATES_STORAGE_KEY) return;
      setFavoriteStates(readFavoriteStates());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const favoriteStatesSet = useMemo(
    () => new Set(favoriteStates),
    [favoriteStates],
  );

  const toggleFavoriteState = useCallback((stateName: string) => {
    setFavoriteStates((prev) => {
      const next = new Set(prev);
      if (next.has(stateName)) {
        next.delete(stateName);
      } else {
        next.add(stateName);
      }
      return Array.from(next);
    });
  }, []);

  const clearFavoriteStates = useCallback(() => {
    setFavoriteStates([]);
  }, []);

  return {
    favoriteStates,
    favoriteStatesSet,
    setFavoriteStates,
    toggleFavoriteState,
    clearFavoriteStates,
  };
}

