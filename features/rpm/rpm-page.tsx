"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Clock3,
  MapPinned,
  PencilLine,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Users2,
} from "lucide-react";
import Header from "@/components/layout/Header";
import type { HeaderView } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { states } from "@/components/search/states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { useAuthRedirect } from "@/features/student-search/hooks/use-auth-redirect";
import { getCachedValue, invalidateClientCache } from "@/lib/client-cache";

const API_URL = "/api";
const CACHE_TTL_SHORT_MS = 30_000;
const CACHE_TTL_MEDIUM_MS = 5 * 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const RPM_USERS_CACHE_KEY = "rpm:lc_users";

const EXCLUDED_STATE_VALUES = new Set(["all", "no_pref", "state_only", "my_states"]);
const ASSIGNABLE_STATE_OPTIONS = states.filter(
  (stateOption) => !EXCLUDED_STATE_VALUES.has(stateOption.value)
);

type RpmPageProps = {
  activeView?: HeaderView;
  onViewChange?: (view: HeaderView) => void;
  embedded?: boolean;
};

type RpmLcUser = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  states: string[];
  placements: number;
  activePlacements: number;
  daysSinceLastPlacement: number | null;
  lastPlacementDateRaw: string | null;
};

type SaveMessage = {
  type: "success" | "error";
  text: string;
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

function parseStates(value: unknown): string[] {
  if (Array.isArray(value)) {
    const parsed = value
      .map((item) => safeString(item))
      .filter((item): item is string => Boolean(item));
    return Array.from(new Set(parsed));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parseStates(parsed);
      }
    } catch {
      return Array.from(
        new Set(
          trimmed
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        )
      );
    }
  }

  if (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { states?: unknown[] }).states)
  ) {
    return parseStates((value as { states: unknown[] }).states);
  }

  return [];
}

function calculateDaysSinceLastPlacement(rawDate: string | null, rawDays: unknown): number | null {
  const explicitDays = safeNumber(rawDays);
  if (explicitDays !== null) {
    return Math.max(0, Math.floor(explicitDays));
  }

  if (!rawDate) {
    return null;
  }

  const parsedTime = new Date(rawDate).getTime();
  if (Number.isNaN(parsedTime)) {
    return null;
  }

  const diff = Date.now() - parsedTime;
  if (diff <= 0) {
    return 0;
  }

  return Math.floor(diff / DAY_MS);
}

function normalizeRpmLcUsers(payload: unknown): RpmLcUser[] {
  const candidates: unknown[] = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null
      ? (["lc_users", "users", "results", "items", "data"] as const)
          .map((key) => (payload as Record<string, unknown>)[key])
          .find((value) => Array.isArray(value)) ?? []
      : [];

  const normalized = candidates
    .map<RpmLcUser | null>((item, index) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const record = item as Record<string, unknown>;

      const id =
        safeString(record.id) ??
        safeString(record.user_id) ??
        safeString(record.lc_id) ??
        safeString(record.username) ??
        `lc-user-${index + 1}`;

      const firstName = safeString(record.first_name) ?? "";
      const lastName = safeString(record.last_name) ?? "";
      const fallbackName = safeString(record.name) ?? safeString(record.full_name) ?? "";
      const fullName = `${firstName} ${lastName}`.trim() || fallbackName || `LC User ${index + 1}`;

      const username = safeString(record.username) ?? safeString(record.user_name) ?? "";
      const email = safeString(record.email) ?? safeString(record.email_address) ?? "";

      const primaryStates = parseStates(record.states);
      const fallbackStates = parseStates(record.placing_states);
      const tertiaryStates = parseStates(record.preferred_states);
      const statesList =
        primaryStates.length > 0
          ? primaryStates
          : fallbackStates.length > 0
            ? fallbackStates
            : tertiaryStates;

      const placements =
        safeNumber(record.placements) ??
        safeNumber(record.placements_count) ??
        safeNumber(record.total_placements) ??
        0;

      const activePlacements =
        safeNumber(record.active_placements) ??
        safeNumber(record.active_placements_count) ??
        safeNumber(record.active_count) ??
        0;

      const lastPlacementDateRaw =
        safeString(record.last_placement_date) ??
        safeString(record.latest_placement_date) ??
        safeString(record.last_placement) ??
        null;

      return {
        id,
        fullName,
        username,
        email,
        states: statesList,
        placements: Math.max(0, Math.floor(placements)),
        activePlacements: Math.max(0, Math.floor(activePlacements)),
        daysSinceLastPlacement: calculateDaysSinceLastPlacement(
          lastPlacementDateRaw,
          record.days_since_last_placement
        ),
        lastPlacementDateRaw,
      };
    })
    .filter((item): item is RpmLcUser => item !== null);

  return normalized.sort((a, b) => {
    if (b.placements !== a.placements) {
      return b.placements - a.placements;
    }
    return a.fullName.localeCompare(b.fullName);
  });
}

function formatPlacementDate(rawDate: string | null): string {
  if (!rawDate) {
    return "No placement date";
  }

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return rawDate;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toneForDaysSince(daysSinceLastPlacement: number | null): string {
  if (daysSinceLastPlacement === null) {
    return "border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.7)] text-[var(--brand-body)]";
  }
  if (daysSinceLastPlacement <= 14) {
    return "border-[rgba(0,144,63,0.45)] bg-[rgba(0,144,63,0.12)] text-[var(--brand-success-deep)]";
  }
  if (daysSinceLastPlacement <= 30) {
    return "border-[rgba(255,194,62,0.5)] bg-[rgba(255,194,62,0.2)] text-[var(--brand-primary-deep)]";
  }
  return "border-[rgba(201,18,41,0.45)] bg-[rgba(201,18,41,0.12)] text-[var(--brand-danger)]";
}

export default function RpmPage({
  activeView,
  onViewChange,
  embedded = false,
}: RpmPageProps) {
  const { isAuthenticated, logout, isLoading: authLoading } = useAuth();
  useAuthRedirect({ authLoading, isAuthenticated });

  const [firstName, setFirstName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [hasLoadedAuthUser, setHasLoadedAuthUser] = useState(false);
  const [updateTime, setUpdateTime] = useState("");

  const [lcUsers, setLcUsers] = useState<RpmLcUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftStates, setDraftStates] = useState<string[]>([]);
  const [stateSearchQuery, setStateSearchQuery] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<SaveMessage | null>(null);

  const normalizedAccountType = accountType.trim().toLowerCase();
  const isLcUser = normalizedAccountType.includes("lc");

  const fetchLcUsers = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) {
      setIsRefreshingUsers(true);
    } else {
      setIsLoadingUsers(true);
    }

    try {
      const users = await getCachedValue<RpmLcUser[]>(
        RPM_USERS_CACHE_KEY,
        async () => {
          const response = await fetch(`${API_URL}/rpm/lc_users`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`Failed to load RPM LC users: ${response.status}`);
          }

          const payload: unknown = await response.json();
          return normalizeRpmLcUsers(payload);
        },
        CACHE_TTL_SHORT_MS,
        { forceRefresh: manualRefresh }
      );

      setLcUsers(users);
      setLoadError(null);
    } catch (error) {
      console.error("Error loading RPM LC users:", error);
      setLoadError("Unable to load LC user performance right now.");
      setLcUsers([]);
    } finally {
      setIsLoadingUsers(false);
      setIsRefreshingUsers(false);
    }
  }, []);

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
        setFirstName(data?.first_name ?? "");
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
    if (!isAuthenticated || !hasLoadedAuthUser || isLcUser) return;
    void fetchLcUsers(false);
  }, [fetchLcUsers, hasLoadedAuthUser, isAuthenticated, isLcUser]);

  const editingUser = useMemo(
    () => lcUsers.find((user) => user.id === editingUserId) ?? null,
    [editingUserId, lcUsers]
  );

  const visibleStateOptions = useMemo(() => {
    const query = stateSearchQuery.trim().toLowerCase();
    if (!query) return ASSIGNABLE_STATE_OPTIONS;

    return ASSIGNABLE_STATE_OPTIONS.filter((stateOption) =>
      stateOption.label.toLowerCase().includes(query)
    );
  }, [stateSearchQuery]);

  const usedStates = useMemo(() => {
    const next = new Set<string>();
    for (const user of lcUsers) {
      for (const stateName of user.states) {
        next.add(stateName);
      }
    }

    return Array.from(next).sort((a, b) => a.localeCompare(b));
  }, [lcUsers]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return lcUsers.filter((user) => {
      const matchesQuery =
        !query ||
        user.fullName.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);

      if (!matchesQuery) return false;

      if (stateFilter === "all") return true;
      return user.states.includes(stateFilter);
    });
  }, [lcUsers, searchQuery, stateFilter]);

  const kpis = useMemo(() => {
    const managedUsers = filteredUsers.length;
    const placements = filteredUsers.reduce((sum, user) => sum + user.placements, 0);
    const activePlacements = filteredUsers.reduce(
      (sum, user) => sum + user.activePlacements,
      0
    );

    const daysValues = filteredUsers
      .map((user) => user.daysSinceLastPlacement)
      .filter((value): value is number => value !== null);

    const averageDaysSincePlacement =
      daysValues.length > 0
        ? Math.round(daysValues.reduce((sum, value) => sum + value, 0) / daysValues.length)
        : null;

    const staleUsers = filteredUsers.filter(
      (user) => (user.daysSinceLastPlacement ?? -1) >= 30
    ).length;

    return {
      managedUsers,
      placements,
      activePlacements,
      averageDaysSincePlacement,
      staleUsers,
    };
  }, [filteredUsers]);

  const openStateEditor = (user: RpmLcUser) => {
    setEditingUserId(user.id);
    setDraftStates(user.states);
    setStateSearchQuery("");
    setSaveMessage(null);
  };

  const toggleDraftState = (stateName: string) => {
    setDraftStates((previous) => {
      if (previous.includes(stateName)) {
        return previous.filter((item) => item !== stateName);
      }

      return [...previous, stateName].sort((left, right) => left.localeCompare(right));
    });
  };

  const persistLcUserStates = useCallback(async (lcUserId: string, nextStates: string[]) => {
    const bodyForDirectRoute = JSON.stringify({ states: nextStates });

    const directResponse = await fetch(
      `${API_URL}/rpm/lc_users/${encodeURIComponent(lcUserId)}/states`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: bodyForDirectRoute,
      }
    );

    if (directResponse.ok) {
      return;
    }

    if (directResponse.status !== 404 && directResponse.status !== 405) {
      throw new Error(`State update failed: ${directResponse.status}`);
    }

    const fallbackResponse = await fetch(`${API_URL}/rpm/lc_users/states`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        lc_user_id: lcUserId,
        states: nextStates,
      }),
    });

    if (!fallbackResponse.ok) {
      throw new Error(`State update failed: ${fallbackResponse.status}`);
    }
  }, []);

  const saveStatesForEditingUser = async () => {
    if (!editingUser) return;

    setSavingUserId(editingUser.id);
    setSaveMessage(null);

    try {
      await persistLcUserStates(editingUser.id, draftStates);
      setLcUsers((previous) =>
        previous.map((user) =>
          user.id === editingUser.id ? { ...user, states: draftStates } : user
        )
      );
      invalidateClientCache(RPM_USERS_CACHE_KEY);
      setSaveMessage({
        type: "success",
        text: `Saved states for ${editingUser.fullName}.`,
      });
      setEditingUserId(null);
    } catch (error) {
      console.error("Error saving LC user states:", error);
      setSaveMessage({
        type: "error",
        text: "Unable to save states. Please try again.",
      });
    } finally {
      setSavingUserId(null);
    }
  };

  if (authLoading || !isAuthenticated || !hasLoadedAuthUser) {
    return (
      <div className="brand-page-gradient min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--brand-primary)]" />
          <p className="mt-4 font-medium text-[var(--brand-body)]">Loading RPM view...</p>
        </div>
      </div>
    );
  }

  if (isLcUser) {
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
              activeView={activeView}
              onViewChange={onViewChange}
              showRpm
            />
          )}

          <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
            <section className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.92)] p-6 text-center shadow-[0_12px_28px_rgba(0,53,84,0.12)]">
              <h1 className="text-2xl font-black tracking-tight text-[var(--brand-ink)]">
                RPM View Unavailable
              </h1>
              <p className="mt-2 text-sm text-[var(--brand-body)]">
                This view is restricted to RPM accounts.
              </p>
              <div className="mt-5">
                {embedded && onViewChange ? (
                  <button
                    type="button"
                    onClick={() => onViewChange("search")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Search
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Search
                  </Link>
                )}
              </div>
            </section>
          </main>

          {!embedded && <Footer />}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${embedded ? "brand-page-gradient" : "brand-page-gradient min-h-screen"} rpm-command-bg relative overflow-hidden text-[var(--brand-ink)]`}
    >
      <div className="rpm-grid-overlay pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(60,159,192,0.32)_0%,rgba(60,159,192,0)_72%)]" />
      <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(0,94,184,0.24)_0%,rgba(0,94,184,0)_70%)]" />

      <div className="relative z-10">
        {!embedded && (
          <Header
            firstName={firstName}
            onLogout={logout}
            updateTime={updateTime}
            activeView={activeView}
            onViewChange={onViewChange}
            showRpm
          />
        )}

        <main className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6">
          <section className="rpm-command-panel rounded-3xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,94,184,0.3)] bg-[rgba(0,94,184,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary-deep)]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  RPM Command Deck
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--brand-ink)]">
                  LC Portfolio Operations
                </h1>
                <p className="mt-1.5 text-sm text-[var(--brand-body)]">
                  Monitor each LC&apos;s placement velocity, recent activity, and state coverage
                  from one admin view.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void fetchLcUsers(true)}
                disabled={isRefreshingUsers}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingUsers ? "animate-spin" : ""}`} />
                {isRefreshingUsers ? "Refreshing" : "Refresh"}
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <article className="rpm-metric-card rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                  Managed LCs
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight text-[var(--brand-ink)]">
                  {kpis.managedUsers}
                </p>
                <p className="mt-1 text-xs text-[var(--brand-body)]">
                  Showing {filteredUsers.length} of {lcUsers.length}
                </p>
              </article>

              <article className="rpm-metric-card rounded-2xl p-4">
                <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                  <Activity className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                  Total Placements
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight text-[var(--brand-ink)]">
                  {kpis.placements.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-[var(--brand-body)]">
                  Combined volume across visible LCs
                </p>
              </article>

              <article className="rpm-metric-card rounded-2xl p-4">
                <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                  <Users2 className="h-3.5 w-3.5 text-[var(--brand-success-deep)]" />
                  Active Placements
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight text-[var(--brand-ink)]">
                  {kpis.activePlacements.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-[var(--brand-body)]">
                  Currently active across visible LCs
                </p>
              </article>

              <article className="rpm-metric-card rounded-2xl p-4">
                <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                  <Clock3 className="h-3.5 w-3.5 text-[var(--brand-accent)]" />
                  Avg Days Since Placement
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight text-[var(--brand-ink)]">
                  {kpis.averageDaysSincePlacement ?? "-"}
                </p>
                <p className="mt-1 text-xs text-[var(--brand-body)]">
                  Mean recency for visible LCs
                </p>
              </article>

              <article className="rpm-metric-card rounded-2xl p-4">
                <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                  <MapPinned className="h-3.5 w-3.5 text-[var(--brand-danger)]" />
                  30+ Day Stale
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight text-[var(--brand-ink)]">
                  {kpis.staleUsers}
                </p>
                <p className="mt-1 text-xs text-[var(--brand-body)]">
                  LCs without recent placement momentum
                </p>
              </article>
            </div>
          </section>

          <section className="rpm-command-panel mt-5 rounded-2xl p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                Search LC user
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Name, username, or email"
                    className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] pl-9 pr-3 text-sm font-medium text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
                  />
                </div>
              </label>

              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                Filter by state
                <select
                  value={stateFilter}
                  onChange={(event) => setStateFilter(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 text-sm font-medium text-[var(--brand-ink)] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
                >
                  <option value="all">All states</option>
                  {usedStates.map((stateName) => (
                    <option key={stateName} value={stateName}>
                      {stateName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {saveMessage ? (
            <section
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                saveMessage.type === "success"
                  ? "border-[rgba(0,144,63,0.42)] bg-[rgba(0,144,63,0.1)] text-[var(--brand-success-deep)]"
                  : "border-[rgba(201,18,41,0.42)] bg-[rgba(201,18,41,0.1)] text-[var(--brand-danger)]"
              }`}
            >
              {saveMessage.text}
            </section>
          ) : null}

          <section className="rpm-command-panel mt-4 rounded-2xl p-4">
            {loadError ? (
              <div className="rounded-xl border border-[rgba(201,18,41,0.4)] bg-[rgba(201,18,41,0.1)] px-4 py-3 text-sm font-semibold text-[var(--brand-danger)]">
                {loadError}
              </div>
            ) : null}

            {isLoadingUsers ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`rpm-user-skeleton-${index}`}
                    className="h-14 animate-pulse rounded-xl bg-[rgba(187,192,195,0.34)]"
                  />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--brand-border)] bg-[rgba(253,254,255,0.86)] px-5 py-10 text-center">
                <p className="text-lg font-semibold text-[var(--brand-ink)]">No LC users found</p>
                <p className="mt-1 text-sm text-[var(--brand-body)]">
                  Try a different search term or clear the state filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--brand-border-soft)]">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="bg-[rgba(0,53,84,0.06)] text-[11px] uppercase tracking-[0.12em] text-[var(--brand-body)]">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">LC User</th>
                      <th className="px-3 py-2.5 font-semibold">States</th>
                      <th className="px-3 py-2.5 font-semibold">Placements</th>
                      <th className="px-3 py-2.5 font-semibold">Active</th>
                      <th className="px-3 py-2.5 font-semibold">Last Placement</th>
                      <th className="px-3 py-2.5 font-semibold">Days Since</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--brand-border-soft)] text-sm">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="bg-[rgba(253,254,255,0.92)] hover:bg-[rgba(0,94,184,0.04)]">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-[var(--brand-ink)]">{user.fullName}</p>
                          <p className="text-xs text-[var(--brand-muted)]">
                            {user.username ? `@${user.username}` : "No username"}
                            {user.email ? ` • ${user.email}` : ""}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex max-w-[320px] flex-wrap gap-1.5">
                            {user.states.length === 0 ? (
                              <span className="rounded-full border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.7)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-body)]">
                                No states assigned
                              </span>
                            ) : (
                              <>
                                {user.states.slice(0, 4).map((stateName) => (
                                  <span
                                    key={`${user.id}-${stateName}`}
                                    className="rounded-full border border-[rgba(0,94,184,0.32)] bg-[rgba(0,94,184,0.1)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-primary-deep)]"
                                  >
                                    {stateName}
                                  </span>
                                ))}
                                {user.states.length > 4 ? (
                                  <span className="rounded-full border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.72)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-body)]">
                                    +{user.states.length - 4} more
                                  </span>
                                ) : null}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-semibold text-[var(--brand-ink)]">
                          {user.placements.toLocaleString()}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex min-w-16 justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                              user.activePlacements > 0
                                ? "border-[rgba(0,144,63,0.42)] bg-[rgba(0,144,63,0.12)] text-[var(--brand-success-deep)]"
                                : "border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.72)] text-[var(--brand-body)]"
                            }`}
                          >
                            {user.activePlacements}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[var(--brand-body)]">
                          {formatPlacementDate(user.lastPlacementDateRaw)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex min-w-20 justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneForDaysSince(
                              user.daysSinceLastPlacement
                            )}`}
                          >
                            {user.daysSinceLastPlacement === null
                              ? "No data"
                              : `${user.daysSinceLastPlacement} days`}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openStateEditor(user)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Edit States
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        {!embedded && <Footer />}
      </div>

      <Dialog
        open={editingUser !== null}
        onOpenChange={(open) => {
          if (open) return;
          setEditingUserId(null);
          setStateSearchQuery("");
        }}
      >
        <DialogContent className="max-w-3xl border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.98)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-[var(--brand-ink)]">
              Edit LC States
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--brand-body)]">
              {editingUser
                ? `Update the assigned states for ${editingUser.fullName}.`
                : "Update assigned states."}
            </DialogDescription>
          </DialogHeader>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
            Search states
            <input
              type="text"
              value={stateSearchQuery}
              onChange={(event) => setStateSearchQuery(event.target.value)}
              placeholder="Type a state name"
              className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 text-sm font-medium text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
            />
          </label>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--brand-body)]">
              {draftStates.length} state{draftStates.length === 1 ? "" : "s"} selected
            </span>
            <button
              type="button"
              onClick={() => setDraftStates([])}
              className="rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-2.5 py-1 font-semibold text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
            >
              Clear all
            </button>
          </div>

          <div className="max-h-[340px] overflow-y-auto rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.58)] p-3">
            {visibleStateOptions.length === 0 ? (
              <p className="py-8 text-center text-sm font-medium text-[var(--brand-muted)]">
                No states match your search.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {visibleStateOptions.map((stateOption) => {
                  const isSelected = draftStates.includes(stateOption.value);

                  return (
                    <button
                      key={stateOption.value}
                      type="button"
                      onClick={() => toggleDraftState(stateOption.value)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                        isSelected
                          ? "border-[var(--brand-primary)] bg-[rgba(0,94,184,0.12)] text-[var(--brand-primary-deep)]"
                          : "border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.88)] text-[var(--brand-body)] hover:border-[var(--brand-primary)] hover:bg-[rgba(0,94,184,0.05)]"
                      }`}
                    >
                      {stateOption.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setEditingUserId(null)}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void saveStatesForEditingUser();
              }}
              disabled={!editingUser || savingUserId === editingUser.id}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[rgba(0,94,184,0.38)] bg-[rgba(0,94,184,0.12)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary-deep)] transition-colors hover:bg-[rgba(0,94,184,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {savingUserId === editingUser?.id ? "Saving..." : "Save states"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
