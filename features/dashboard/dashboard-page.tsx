"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Clock3,
  Home,
  MapPinned,
  RefreshCw,
  Users,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/auth-context";
import { useAuthRedirect } from "@/features/student-search/hooks/use-auth-redirect";
import { getCachedValue } from "@/lib/client-cache";

const API_URL = "/api";
const CACHE_TTL_SHORT_MS = 30_000;
const CACHE_TTL_MEDIUM_MS = 5 * 60_000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type PlacementMetricRecord = {
  app_id?: number;
  city?: string;
  state?: string;
  placementDate?: string;
  hostFamilyName?: string;
};

type PlacementMetricItem = {
  appId: number;
  city: string;
  state: string;
  placementDateRaw: string;
  hostFamilyName: string;
  placementDate: Date | null;
  placementTime: number;
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

function formatDate(value: Date | null, fallbackRaw: string): string {
  if (!value) {
    return fallbackRaw || "Unknown date";
  }

  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizePlacementMetrics(payload: unknown): PlacementMetricItem[] {
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
      const state = safeString(record.state) ?? "Unknown state";
      const placementDateRaw = safeString(record.placementDate) ?? "";
      const hostFamilyName = safeString(record.hostFamilyName) ?? "Unknown family";
      const placementDate = parsePlacementDate(placementDateRaw);
      const placementTime = placementDate ? placementDate.getTime() : 0;

      return {
        appId,
        city,
        state,
        placementDateRaw,
        hostFamilyName,
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

type MetricCardProps = {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
};

function MetricCard({ label, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_8px_18px_rgba(0,53,84,0.08)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
          {label}
        </p>
        <Icon className="h-4 w-4 text-[var(--brand-primary)]" />
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight text-[var(--brand-ink)]">
        {value}
      </p>
      <p className="mt-1.5 text-xs font-medium text-[var(--brand-body)]">{detail}</p>
    </article>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, logout, isLoading: authLoading } = useAuth();
  useAuthRedirect({ authLoading, isAuthenticated });

  const [firstName, setFirstName] = useState("");
  const [updateTime, setUpdateTime] = useState("");
  const [metrics, setMetrics] = useState<PlacementMetricItem[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const fetchPlacementMetrics = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoadingMetrics(true);
    }

    try {
      const normalized = await getCachedValue<PlacementMetricItem[]>(
        "dashboard:placement_metrics",
        async () => {
          const response = await fetch(`${API_URL}/placement_metrics/`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch placement metrics: ${response.status}`);
          }

          const payload: unknown = await response.json();
          return normalizePlacementMetrics(payload);
        },
        CACHE_TTL_SHORT_MS,
        { forceRefresh: manualRefresh }
      );

      setMetrics(normalized);
      setMetricsError(null);
    } catch (error) {
      console.error("Failed to fetch placement metrics:", error);
      setMetrics([]);
      setMetricsError("Unable to load placement metrics right now.");
    } finally {
      setIsLoadingMetrics(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    getCachedValue<{ first_name?: string }>(
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

        return (await response.json()) as { first_name?: string };
      },
      CACHE_TTL_MEDIUM_MS
    )
      .then((data) => {
        if (data?.first_name) {
          setFirstName(data.first_name);
        }
      })
      .catch(() => {
        setFirstName("");
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
    void fetchPlacementMetrics(false);
  }, [fetchPlacementMetrics, isAuthenticated]);

  const computed = useMemo(() => {
    const totalPlacements = metrics.length;
    const stateCounts = new Map<string, number>();
    const cityCounts = new Map<string, number>();
    const familyCounts = new Map<string, number>();

    const now = new Date();
    const nowTime = now.getTime();
    let placementsThisMonth = 0;
    let placementsLast30Days = 0;

    for (const item of metrics) {
      stateCounts.set(item.state, (stateCounts.get(item.state) ?? 0) + 1);
      cityCounts.set(item.city, (cityCounts.get(item.city) ?? 0) + 1);
      familyCounts.set(
        item.hostFamilyName,
        (familyCounts.get(item.hostFamilyName) ?? 0) + 1
      );

      if (item.placementDate) {
        if (
          item.placementDate.getMonth() === now.getMonth() &&
          item.placementDate.getFullYear() === now.getFullYear()
        ) {
          placementsThisMonth += 1;
        }

        if (nowTime - item.placementTime <= THIRTY_DAYS_MS) {
          placementsLast30Days += 1;
        }
      }
    }

    const topState = [...stateCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const topCity = [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const topStates = [...stateCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([state, count]) => ({
        state,
        count,
        percentage:
          totalPlacements === 0 ? 0 : Math.round((count / totalPlacements) * 100),
      }));

    return {
      totalPlacements,
      uniqueStates: stateCounts.size,
      uniqueCities: cityCounts.size,
      uniqueFamilies: familyCounts.size,
      placementsThisMonth,
      placementsLast30Days,
      latestPlacementDate: metrics[0]?.placementDate ?? null,
      latestPlacementRaw: metrics[0]?.placementDateRaw ?? "",
      topState,
      topCity,
      topStates,
    };
  }, [metrics]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="brand-page-gradient min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--brand-primary)]" />
          <p className="mt-4 font-medium text-[var(--brand-body)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-page-gradient min-h-screen text-[var(--brand-ink)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-16 top-10 h-64 w-64 rounded-full bg-[rgba(60,159,192,0.2)] blur-3xl" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-[rgba(0,94,184,0.14)] blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 rounded-full bg-[rgba(255,87,0,0.1)] blur-3xl" />
      </div>

      <div className="relative z-10">
        <Header firstName={firstName} onLogout={logout} updateTime={updateTime} />

        <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">
          <section className="rounded-3xl border border-[rgba(0,94,184,0.3)] bg-[rgba(253,254,255,0.9)] p-6 shadow-[0_16px_38px_rgba(0,53,84,0.14)] backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--brand-ink)]">
                  Dashboard
                </h1>
                <p className="mt-1 text-sm text-[var(--brand-body)]">
                  Real-time summary from `GET /api/placement_metrics/`.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Search
                </Link>
                <button
                  type="button"
                  onClick={() => void fetchPlacementMetrics(true)}
                  disabled={isRefreshing}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  {isRefreshing ? "Refreshing" : "Refresh"}
                </button>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total Placements"
              value={computed.totalPlacements.toLocaleString()}
              detail="Rows returned by endpoint"
              icon={Users}
            />
            <MetricCard
              label="States Reached"
              value={computed.uniqueStates}
              detail={
                computed.topState
                  ? `Top state: ${computed.topState[0]} (${computed.topState[1]})`
                  : "No state data"
              }
              icon={MapPinned}
            />
            <MetricCard
              label="Cities Reached"
              value={computed.uniqueCities}
              detail={
                computed.topCity
                  ? `Top city: ${computed.topCity[0]} (${computed.topCity[1]})`
                  : "No city data"
              }
              icon={Home}
            />
            <MetricCard
              label="Host Families"
              value={computed.uniqueFamilies}
              detail="Distinct host family names"
              icon={BarChart3}
            />
            <MetricCard
              label="Placed This Month"
              value={computed.placementsThisMonth}
              detail="Current calendar month"
              icon={CalendarClock}
            />
            <MetricCard
              label="Placed Last 30 Days"
              value={computed.placementsLast30Days}
              detail="Rolling 30-day window"
              icon={Clock3}
            />
            <MetricCard
              label="Latest Placement"
              value={formatDate(
                computed.latestPlacementDate,
                computed.latestPlacementRaw
              )}
              detail="Most recent record in feed"
              icon={CalendarClock}
            />
            <MetricCard
              label="Data Health"
              value={metricsError ? "Issue" : "OK"}
              detail={metricsError ? metricsError : "Metrics endpoint responding"}
              icon={BarChart3}
            />
          </section>

          {metricsError ? (
            <section className="mt-4 rounded-2xl border border-[rgba(201,18,41,0.42)] bg-[rgba(201,18,41,0.1)] px-5 py-4 text-sm font-semibold text-[var(--brand-danger)]">
              {metricsError}
            </section>
          ) : null}

          <section className="mt-5 grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
            <article className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">
                Top States
              </h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Share of total placements by state.
              </p>

              <div className="mt-4 space-y-3">
                {computed.topStates.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--brand-border)] bg-[rgba(246,247,248,0.8)] px-3 py-8 text-center text-xs font-semibold text-[var(--brand-muted)]">
                    No placement data available.
                  </p>
                ) : (
                  computed.topStates.map((stateRow) => (
                    <div key={stateRow.state} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-[var(--brand-body)]">{stateRow.state}</span>
                        <span className="text-[var(--brand-muted)]">
                          {stateRow.count} ({stateRow.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[rgba(0,53,84,0.08)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]"
                          style={{ width: `${stateRow.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">
                Recent Placements
              </h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Sorted by placement date (newest first).
              </p>

              {isLoadingMetrics ? (
                <div className="mt-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`metric-skeleton-${index}`}
                      className="h-10 animate-pulse rounded-lg bg-[rgba(187,192,195,0.38)]"
                    />
                  ))}
                </div>
              ) : metrics.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-[var(--brand-border)] bg-[rgba(246,247,248,0.85)] px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-[var(--brand-body)]">
                    No placements returned.
                  </p>
                  <p className="mt-1 text-xs text-[var(--brand-muted)]">
                    Endpoint responded with an empty list.
                  </p>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--brand-border-soft)]">
                  <table className="w-full min-w-[680px] text-left">
                    <thead className="bg-[rgba(0,53,84,0.06)] text-[11px] uppercase tracking-[0.12em] text-[var(--brand-body)]">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold">App ID</th>
                        <th className="px-3 py-2.5 font-semibold">Host Family</th>
                        <th className="px-3 py-2.5 font-semibold">City</th>
                        <th className="px-3 py-2.5 font-semibold">State</th>
                        <th className="px-3 py-2.5 font-semibold">Placement Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--brand-border-soft)] text-sm">
                      {metrics.slice(0, 18).map((item) => (
                        <tr
                          key={`${item.appId}-${item.hostFamilyName}-${item.city}`}
                          className="hover:bg-[rgba(0,94,184,0.05)]"
                        >
                          <td className="px-3 py-2.5 font-semibold text-[var(--brand-primary-deep)]">
                            {item.appId}
                          </td>
                          <td className="px-3 py-2.5 text-[var(--brand-body)]">
                            {item.hostFamilyName}
                          </td>
                          <td className="px-3 py-2.5 text-[var(--brand-body)]">
                            {item.city}
                          </td>
                          <td className="px-3 py-2.5 text-[var(--brand-body)]">
                            {item.state}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-[var(--brand-ink)]">
                            {formatDate(item.placementDate, item.placementDateRaw)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}

