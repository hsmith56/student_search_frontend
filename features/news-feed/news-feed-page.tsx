"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Clock3,
  RadioTower,
  RefreshCw,
  UserRoundCheck,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/auth-context";
import { useAuthRedirect } from "@/features/student-search/hooks/use-auth-redirect";
import { StudentDetailsDialog } from "@/features/student-search/components/dialogs/student-details-dialog";
import { useSelectedStudentMedia } from "@/features/student-search/hooks/use-selected-student-media";
import type { StudentRecord } from "@/features/student-search/types";
import { getFavoriteStudentId, getStatusBadgeClass } from "@/features/student-search/utils";
import {
  getCachedValue,
  invalidateClientCache,
  invalidateClientCacheByPrefix,
} from "@/lib/client-cache";
import type { HeaderView } from "@/components/layout/Header";
import { ENABLE_DASHBOARD } from "@/lib/feature-flags";

const API_URL = "/api";
const CACHE_TTL_SHORT_MS = 30_000;
const CACHE_TTL_MEDIUM_MS = 5 * 60_000;
const NEWS_FEED_LIMIT = 100;

const NEWS_FEED_STATUS_OPTIONS = ["Unassigned", "Allocated", "Placed"] as const;

type NewsFeedStatus = (typeof NEWS_FEED_STATUS_OPTIONS)[number];

type NewsFeedFilters = {
  name: string;
  newStatus: NewsFeedStatus | "";
  showOnlyFavorites: boolean;
};

const DEFAULT_NEWS_FEED_FILTERS: NewsFeedFilters = {
  name: "",
  newStatus: "",
  showOnlyFavorites: false,
};

type NewsFeedEvent = {
  event_id?: number;
  student_id?: number;
  first_name?: string;
  event_type?: string;
  event_at?: string;
  placement_state?: string;
  coordinator_id?: string | number | null;
  manager_id?: string | number | null;
  status_from?: string;
  status_to?: string;
};

type NewsFeedEnvelope = {
  type?: string;
  event?: NewsFeedEvent;
};

type NewsFeedItem = {
  id: string;
  eventId: number | null;
  studentId: number | null;
  firstName: string | null;
  eventType: string;
  eventAt: string;
  receivedAt: string;
  statusFrom: string | null;
  statusTo: string | null;
  placementState: string | null;
};

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

function parseEventTimeForSort(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeNewsFeedPayload(payload: unknown): NewsFeedItem[] {
  const candidateItems: unknown[] = Array.isArray(payload)
    ? payload
    : typeof payload === "object" &&
        payload !== null &&
        Array.isArray((payload as { results?: unknown[] }).results)
      ? (payload as { results: unknown[] }).results
      : typeof payload === "object" && payload !== null
        ? [payload]
      : [];

  const normalizedItems = candidateItems
    .map<NewsFeedItem | null>((item, index) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const envelope = item as NewsFeedEnvelope;
      const event = envelope.event ?? (item as NewsFeedEvent);

      const eventId = safeNumber(event.event_id);
      const studentId = safeNumber(event.student_id);
      const eventAt = safeString(event.event_at) ?? new Date().toISOString();

      return {
        id:
          eventId !== null
            ? `evt-${eventId}`
            : `api-${eventAt}-${studentId ?? "unknown"}-${index}`,
        eventId,
        studentId,
        firstName: safeString(event.first_name),
        eventType:
          safeString(envelope.type) ??
          safeString(event.event_type) ??
          "status_changed",
        eventAt,
        receivedAt: eventAt,
        statusFrom: safeString(event.status_from),
        statusTo: safeString(event.status_to),
        placementState: safeString(event.placement_state),
      };
    })
    .filter((item): item is NewsFeedItem => item !== null);

  return normalizedItems.sort(
    (itemA, itemB) =>
      parseEventTimeForSort(itemB.eventAt) - parseEventTimeForSort(itemA.eventAt)
  );
}

function normalizeNewsFeedFilters(filters: NewsFeedFilters): NewsFeedFilters {
  return {
    name: filters.name.trim(),
    newStatus: filters.newStatus,
    showOnlyFavorites: filters.showOnlyFavorites,
  };
}

function buildNewsFeedRequest(filters: NewsFeedFilters) {
  const normalizedFilters = normalizeNewsFeedFilters(filters);
  const searchParams = new URLSearchParams({
    limit: String(NEWS_FEED_LIMIT),
    show_only_favorites: String(normalizedFilters.showOnlyFavorites),
  });

  if (normalizedFilters.name) {
    searchParams.set("name", normalizedFilters.name);
  }

  if (normalizedFilters.newStatus) {
    searchParams.set("new_status", normalizedFilters.newStatus);
  }

  const queryString = searchParams.toString();
  return {
    queryString,
    requestUrl: `${API_URL}/news_feed?${queryString}`,
    cacheKey: `newsFeed:list:${queryString}`,
  };
}

function formatEventTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown time";

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function resolveNewsFeedStatusBadge(status: string | null | undefined) {
  const normalized = (status ?? "").trim().toLowerCase();

  if (
    normalized.includes("place") ||
    normalized.includes("accepted")
  ) {
    return { label: "Placed", themeStatus: "Placed" };
  }

  if (normalized.includes("allocated")) {
    return { label: "Ready to Place", themeStatus: "Allocated" };
  }

  return { label: "Unavailable", themeStatus: "Unassigned" };
}

type NewsFeedPageProps = {
  activeView?: HeaderView;
  onViewChange?: (view: HeaderView) => void;
  embedded?: boolean;
};

export default function NewsFeedPage({
  activeView,
  onViewChange,
  embedded = false,
}: NewsFeedPageProps) {
  const { isAuthenticated, logout, isLoading: authLoading } = useAuth();
  useAuthRedirect({ authLoading, isAuthenticated });

  const [firstName, setFirstName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [hasLoadedAuthUser, setHasLoadedAuthUser] = useState(false);
  const [updateTime, setUpdateTime] = useState("");
  const [isUpdatingDatabase, setIsUpdatingDatabase] = useState(false);
  const [feedItems, setFeedItems] = useState<NewsFeedItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<NewsFeedFilters>(
    DEFAULT_NEWS_FEED_FILTERS
  );
  const [appliedFilters, setAppliedFilters] = useState<NewsFeedFilters>(
    DEFAULT_NEWS_FEED_FILTERS
  );
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [loadingStudentId, setLoadingStudentId] = useState<number | null>(null);
  const [favoritedStudents, setFavoritedStudents] = useState<Set<string>>(new Set());
  const selectedStudentMediaLink = useSelectedStudentMedia(selectedStudent);
  const canUpdateDatabase = hasLoadedAuthUser && accountType.toLowerCase() !== "lc";

  const fetchNewsFeed = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) {
      setIsRefreshingFeed(true);
    } else {
      setIsLoadingFeed(true);
    }

    try {
      const newsFeedRequest = buildNewsFeedRequest(appliedFilters);
      const normalized = await getCachedValue<NewsFeedItem[]>(
        newsFeedRequest.cacheKey,
        async () => {
          const response = await fetch(newsFeedRequest.requestUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch news feed: ${response.status}`);
          }

          const payload: unknown = await response.json();
          return normalizeNewsFeedPayload(payload);
        },
        CACHE_TTL_SHORT_MS,
        { forceRefresh: manualRefresh }
      );

      setFeedItems(normalized);
      setFeedError(null);
    } catch (error) {
      console.error("Failed to fetch news feed:", error);
      setFeedError("Unable to load news feed right now.");
      setFeedItems([]);
    } finally {
      setIsLoadingFeed(false);
      setIsRefreshingFeed(false);
    }
  }, [appliedFilters]);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters(normalizeNewsFeedFilters(draftFilters));
  }, [draftFilters]);

  useEffect(() => {
    if (!isAuthenticated) return;

    getCachedValue<{ first_name?: string; account_type?: string }>(
      "auth:me",
      async () => {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch auth user: ${response.status}`);
        }

        return (await response.json()) as {
          first_name?: string;
          account_type?: string;
        };
      },
      CACHE_TTL_MEDIUM_MS
    )
      .then((data) => {
        if (data?.first_name) {
          setFirstName(data.first_name);
        }
        setAccountType(data?.account_type ?? "");
      })
      .catch(() => {
        setFirstName("");
        setAccountType("");
      })
      .finally(() => {
        setHasLoadedAuthUser(true);
      });

    getCachedValue<unknown[]>(
      "misc:last_update_time",
      async () => {
        const response = await fetch(`${API_URL}/misc/last_update_time`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch last update time: ${response.status}`);
        }

        return (await response.json()) as unknown[];
      },
      CACHE_TTL_SHORT_MS
    )
      .then((data) => {
        if (Array.isArray(data)) {
          setUpdateTime(String(data[0] ?? ""));
        }
      })
      .catch(() => {
        setUpdateTime("");
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchNewsFeed(false);
  }, [fetchNewsFeed, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    getCachedValue<StudentRecord[]>(
      "user:favorites",
      async () => {
        const response = await fetch(`${API_URL}/user/favorites`, {
          method: "GET",
          headers: { accept: "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch favorites: ${response.status}`);
        }

        return (await response.json()) as StudentRecord[];
      },
      CACHE_TTL_SHORT_MS
    )
      .then((data: unknown) => {
        if (!Array.isArray(data)) {
          setFavoritedStudents(new Set());
          return;
        }

        const favoritedIds = new Set<string>(
          data
            .map((student) => {
              if (typeof student !== "object" || student === null) return null;
              const record = student as StudentRecord;
              const favoriteId = getFavoriteStudentId(record);
              return favoriteId || null;
            })
            .filter((value): value is string => Boolean(value))
        );
        setFavoritedStudents(favoritedIds);
      })
      .catch(() => {
        setFavoritedStudents(new Set());
      });
  }, [isAuthenticated]);

  const handleUpdateDatabase = async () => {
    if (isUpdatingDatabase) return;
    setIsUpdatingDatabase(true);

    try {
      const response = await fetch(`${API_URL}/students/update_db`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to update DB: ${response.status}`);
      }

      invalidateClientCacheByPrefix("misc:");
      invalidateClientCacheByPrefix("newsFeed:list");
      const latestUpdate = await getCachedValue<unknown[]>(
        "misc:last_update_time",
        async () => {
          const updateTimeResponse = await fetch(`${API_URL}/misc/last_update_time`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          });

          if (!updateTimeResponse.ok) {
            throw new Error(
              `Failed to fetch last update time: ${updateTimeResponse.status}`
            );
          }

          return (await updateTimeResponse.json()) as unknown[];
        },
        CACHE_TTL_SHORT_MS
      );
      if (Array.isArray(latestUpdate) && latestUpdate.length > 0) {
        setUpdateTime(String(latestUpdate[0]));
      }
    } catch (error) {
      console.error("Error updating student DB:", error);
    } finally {
      setIsUpdatingDatabase(false);
    }
  };

  const handleSelectStudent = useCallback(async (studentId: number | null) => {
    if (!studentId) return;
    setLoadingStudentId(studentId);

    try {
      const payload = await getCachedValue<StudentRecord>(
        `student:full:${studentId}`,
        async () => {
          const response = await fetch(`${API_URL}/students/full/${studentId}`, {
            method: "GET",
            headers: { accept: "application/json" },
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch student ${studentId}: ${response.status}`);
          }

          return (await response.json()) as StudentRecord;
        },
        CACHE_TTL_MEDIUM_MS
      );
      const normalizedStudent: StudentRecord = {
        ...payload,
        app_id: payload.app_id ?? studentId,
        pax_id: payload.pax_id ?? studentId,
      };
      setSelectedStudent(normalizedStudent);
    } catch (error) {
      console.error("Failed to fetch selected student:", error);
    } finally {
      setLoadingStudentId(null);
    }
  }, []);

  const handleFavorite = useCallback(async (appId: string) => {
    try {
      const response = await fetch(`${API_URL}/user/favorites?app_id=${appId}`, {
        method: "PATCH",
        headers: { accept: "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        setFavoritedStudents((previous) => new Set(previous).add(appId));
        invalidateClientCache("user:favorites");
      }
    } catch (error) {
      console.error("Error favoriting student:", error);
    }
  }, []);

  const handleUnfavorite = useCallback(async (appId: string) => {
    try {
      const response = await fetch(`${API_URL}/user/favorites?app_id=${appId}`, {
        method: "DELETE",
        headers: { accept: "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        setFavoritedStudents((previous) => {
          const next = new Set(previous);
          next.delete(appId);
          return next;
        });
        invalidateClientCache("user:favorites");
      }
    } catch (error) {
      console.error("Error unfavoriting student:", error);
    }
  }, []);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="brand-page-gradient min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--brand-primary)]" />
          <p className="mt-4 font-medium text-[var(--brand-body)]">Loading news feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${embedded ? "brand-page-gradient" : "brand-page-gradient min-h-screen"} text-[var(--brand-ink)]`}
    >
      <div className="relative z-10">
        {!embedded && (
          <Header
            firstName={firstName}
            onLogout={logout}
            updateTime={updateTime}
            onUpdateDatabase={canUpdateDatabase ? handleUpdateDatabase : undefined}
            isUpdatingDatabase={isUpdatingDatabase}
            activeView={activeView}
            onViewChange={onViewChange}
            showDashboard={ENABLE_DASHBOARD && accountType.toLowerCase() !== "lc"}
          />
        )}

        <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
          <section className="rounded-3xl border border-[rgba(0,94,184,0.3)] bg-[rgba(253,254,255,0.9)] p-6 shadow-[0_16px_40px_rgba(0,53,84,0.14)] backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(0,94,184,0.3)] bg-[rgba(0,94,184,0.09)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-primary-deep)]">
                  <RadioTower className="h-3.5 w-3.5" />
                  Real-Time Updates
                </p>
                <h1 className="text-3xl font-black tracking-tight text-[var(--brand-ink)]">
                  News Feed
                </h1>
                <p className="mt-1 text-sm text-[var(--brand-body)]">
                  Placement change events loaded from `/api/news_feed`.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,94,184,0.35)] bg-[rgba(0,94,184,0.12)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary-deep)] transition-colors hover:bg-[rgba(0,94,184,0.2)]"
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={() => void fetchNewsFeed(true)}
                  disabled={isRefreshingFeed}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isRefreshingFeed ? "animate-spin" : ""}`}
                  />
                  {isRefreshingFeed ? "Refreshing" : "Refresh Feed"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                Student Name
                <input
                  type="text"
                  value={draftFilters.name}
                  onChange={(event) =>
                    setDraftFilters((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    handleApplyFilters();
                  }}
                  placeholder="Leave blank for all"
                  className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 text-sm font-medium text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
                />
              </label>

              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                Status
                <select
                  value={draftFilters.newStatus}
                  onChange={(event) => {
                    const newStatus = event.target.value as NewsFeedFilters["newStatus"];
                    setDraftFilters((previous) => ({
                      ...previous,
                      newStatus,
                    }));
                    setAppliedFilters((previous) =>
                      normalizeNewsFeedFilters({
                        ...previous,
                        newStatus,
                      })
                    );
                  }}
                  className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 text-sm font-medium text-[var(--brand-ink)] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
                >
                  <option value="">All statuses</option>
                  {NEWS_FEED_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inline-flex h-10 items-center gap-2 self-end rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 text-sm font-semibold text-[var(--brand-ink)]">
                <input
                  type="checkbox"
                  checked={draftFilters.showOnlyFavorites}
                  onChange={(event) => {
                    const showOnlyFavorites = event.target.checked;
                    setDraftFilters((previous) => ({
                      ...previous,
                      showOnlyFavorites,
                    }));
                    setAppliedFilters((previous) =>
                      normalizeNewsFeedFilters({
                        ...previous,
                        showOnlyFavorites,
                      })
                    );
                  }}
                  className="h-4 w-4 rounded border-[var(--brand-border)] accent-[var(--brand-primary)]"
                />
                Show Only Favorites
              </label>
            </div>

            <p className="mt-2 text-xs text-[var(--brand-muted)]">
              Querying{" "}
              <code>{`/api/news_feed?${buildNewsFeedRequest(appliedFilters).queryString}`}</code>
            </p>
          </section>

          <section className="mt-5 space-y-3">
            {feedError ? (
              <div className="rounded-2xl border border-[rgba(201,18,41,0.42)] bg-[rgba(201,18,41,0.09)] px-6 py-5 text-sm font-semibold text-[var(--brand-danger)]">
                {feedError}
              </div>
            ) : null}

            {isLoadingFeed ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="w-full animate-pulse rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_8px_20px_rgba(0,53,84,0.09)]"
                >
                  <div className="h-4 w-2/5 rounded bg-[rgba(187,192,195,0.45)]" />
                  <div className="mt-2 h-3 w-4/5 rounded bg-[rgba(187,192,195,0.45)]" />
                  <div className="mt-4 h-3 w-1/2 rounded bg-[rgba(187,192,195,0.45)]" />
                </div>
              ))
            ) : feedItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--brand-border)] bg-[rgba(253,254,255,0.88)] px-6 py-10 text-center">
                <Bell className="mx-auto mb-3 h-8 w-8 text-[var(--brand-muted)]" />
                <p className="text-lg font-semibold text-[var(--brand-ink)]">No alerts yet</p>
                <p className="mt-1 text-sm text-[var(--brand-body)]">
                  `/api/news_feed` did not return any events.
                </p>
              </div>
            ) : (
              feedItems.map((alert, index) => {
                const badge = resolveNewsFeedStatusBadge(
                  alert.statusTo ?? alert.placementState
                );

                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => void handleSelectStudent(alert.studentId)}
                    disabled={loadingStudentId === alert.studentId}
                    className="w-full rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 text-left shadow-[0_8px_20px_rgba(0,53,84,0.09)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,53,84,0.14)] disabled:cursor-wait disabled:opacity-70"
                    style={{ animationDelay: `${index * 35}ms` }}
                  >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="inline-flex items-center gap-2 text-sm font-bold text-[var(--brand-ink)]">
                        <UserRoundCheck className="h-4 w-4 text-[var(--brand-primary)]" />
                        {alert.firstName ?? `Student #${alert.studentId ?? "Unknown"}`} moved to{" "}
                        {alert.statusTo ?? "Allocated"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--brand-body)]">
                        {alert.eventType} | Event ID {alert.eventId ?? "N/A"} |{" "}
                        {alert.statusFrom ?? "Unknown"} to {alert.statusTo ?? alert.placementState ?? "Allocated"}
                      </p>
                    </div>

                    {loadingStudentId === alert.studentId ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,194,62,0.62)] bg-[rgba(255,194,62,0.2)] px-2.5 py-1 text-[11px] font-semibold text-[#8a6200]">
                        Loading profile...
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClass(
                          badge.themeStatus
                        )}`}
                      >
                        {badge.label}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--brand-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      Event: {formatEventTime(alert.eventAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Received: {formatEventTime(alert.receivedAt)}
                    </span>
                  </div>
                </button>
                );
              })
            )}
          </section>
        </main>

        {!embedded && <Footer />}
      </div>

      <StudentDetailsDialog
        selectedStudent={selectedStudent}
        selectedStudentMediaLink={selectedStudentMediaLink}
        favoritedStudents={favoritedStudents}
        onFavorite={(appId) => {
          void handleFavorite(appId);
        }}
        onUnfavorite={(appId) => {
          void handleUnfavorite(appId);
        }}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
}
