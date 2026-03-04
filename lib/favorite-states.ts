"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { invalidateClientCache } from "@/lib/client-cache";
import { getCurrentUser } from "@/lib/api/auth";
import { updateFavoriteStates } from "@/lib/api/favorites";

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

function parsePlacingStates(value: unknown): string[] {
  if (Array.isArray(value)) {
    return normalizeFavoriteStates(value);
  }

  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    return normalizeFavoriteStates(JSON.parse(trimmed));
  } catch {
    return [];
  }
}

function hasSameValues(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value) => right.includes(value));
}

export function useFavoriteStates() {
  const [favoriteStates, setFavoriteStates] = useState<string[]>([]);
  const [savedFavoriteStates, setSavedFavoriteStates] = useState<string[]>([]);
  const [accountType, setAccountType] = useState("");
  const [isLoadingFavoriteStates, setIsLoadingFavoriteStates] = useState(true);
  const [isApplyingFavoriteStates, setIsApplyingFavoriteStates] = useState(false);

  const reloadFavoriteStates = useCallback(async () => {
    setIsLoadingFavoriteStates(true);
    try {
      const data = (await getCurrentUser({
        redirectOnUnauthorized: false,
      })) as {
        placing_states?: unknown;
        account_type?: unknown;
      };
      const parsedStates = parsePlacingStates(data.placing_states);
      setFavoriteStates(parsedStates);
      setSavedFavoriteStates(parsedStates);
      setAccountType(typeof data.account_type === "string" ? data.account_type : "");
      return true;
    } catch (error) {
      console.error("Error loading favorite states:", error);
      setAccountType("");
      return false;
    } finally {
      setIsLoadingFavoriteStates(false);
    }
  }, []);

  useEffect(() => {
    void reloadFavoriteStates();
  }, [reloadFavoriteStates]);

  const favoriteStatesSet = useMemo(
    () => new Set(favoriteStates),
    [favoriteStates],
  );
  const hasPendingFavoriteStateChanges = useMemo(
    () => !hasSameValues(favoriteStates, savedFavoriteStates),
    [favoriteStates, savedFavoriteStates],
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

  const discardFavoriteStateChanges = useCallback(() => {
    setFavoriteStates(savedFavoriteStates);
  }, [savedFavoriteStates]);

  const applyFavoriteStates = useCallback(async () => {
    if (isApplyingFavoriteStates) {
      return false;
    }

    const nextStates = normalizeFavoriteStates(favoriteStates);
    setIsApplyingFavoriteStates(true);

    try {
      await updateFavoriteStates(nextStates);

      setFavoriteStates(nextStates);
      setSavedFavoriteStates(nextStates);
      invalidateClientCache("user:states");
      invalidateClientCache("auth:me");
      return true;
    } catch (error) {
      console.error("Error updating favorite states:", error);
      return false;
    } finally {
      setIsApplyingFavoriteStates(false);
    }
  }, [favoriteStates, isApplyingFavoriteStates]);

  return {
    favoriteStates,
    favoriteStatesSet,
    setFavoriteStates,
    toggleFavoriteState,
    clearFavoriteStates,
    discardFavoriteStateChanges,
    applyFavoriteStates,
    reloadFavoriteStates,
    hasPendingFavoriteStateChanges,
    isLoadingFavoriteStates,
    isApplyingFavoriteStates,
    accountType,
  };
}

