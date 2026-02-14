"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CalendarRange,
  Filter,
  MapPinned,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/auth-context";
import { useAuthRedirect } from "@/features/student-search/hooks/use-auth-redirect";
import { buildDashboardAnalytics } from "@/features/dashboard/analytics";
import type { HeaderView } from "@/components/layout/Header";
import type {
  DateRange,
  PlacementMetricItem,
  StateSeasonalityCell,
} from "@/features/dashboard/types";
import { normalizePlacementMetrics } from "@/features/dashboard/placement-metrics";
import { getCachedValue } from "@/lib/client-cache";

const API_URL = "/api";
const CACHE_TTL_SHORT_MS = 30_000;
const CACHE_TTL_MEDIUM_MS = 5 * 60_000;
const CHART_PALETTE = [
  "#005EB8",
  "#3C9FC0",
  "#FF5700",
  "#00903F",
  "#FFC23E",
  "#7A9BC2",
] as const;

const RANGE_OPTIONS: Array<{ value: DateRange; label: string }> = [
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "12m", label: "12 Months" },
  { value: "all", label: "All Time" },
];

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

function getRecencyColor(daysSinceLastPlacement: number): string {
  if (daysSinceLastPlacement <= 14) return "rgba(0,144,63,0.72)";
  if (daysSinceLastPlacement <= 30) return "rgba(255,194,62,0.78)";
  return "rgba(255,87,0,0.76)";
}

function getSeasonalityColor(intensity: number): string {
  if (intensity <= 0) return "rgba(187,192,195,0.32)";
  if (intensity < 0.25) return "rgba(60,159,192,0.42)";
  if (intensity < 0.5) return "rgba(0,94,184,0.52)";
  if (intensity < 0.75) return "rgba(0,144,63,0.56)";
  return "rgba(255,87,0,0.66)";
}

type MetricCardProps = {
  label: string;
  value: string | number;
  detail: string;
  icon: ComponentType<{ className?: string }>;
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

type DashboardTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
  }>;
};

function DashboardTooltip({ active, label, payload }: DashboardTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.96)] px-3 py-2 text-xs shadow-[0_10px_24px_rgba(0,53,84,0.18)]">
      {label !== undefined ? (
        <p className="mb-1 font-semibold text-[var(--brand-ink)]">{label}</p>
      ) : null}
      <div className="space-y-1">
        {payload.map((item, index) => (
          <p
            key={`${String(item.name ?? "value")}-${index}`}
            className="flex items-center justify-between gap-3 text-[var(--brand-body)]"
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color ?? "var(--brand-primary)" }}
              />
              {item.name ?? "Value"}
            </span>
            <span className="font-semibold">{item.value ?? "-"}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

type DashboardPageProps = {
  activeView?: HeaderView;
  onViewChange?: (view: HeaderView) => void;
  embedded?: boolean;
};

export default function DashboardPage({
  activeView,
  onViewChange,
  embedded = false,
}: DashboardPageProps) {
  const { isAuthenticated, logout, isLoading: authLoading } = useAuth();
  useAuthRedirect({ authLoading, isAuthenticated });

  const [firstName, setFirstName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [hasLoadedAuthUser, setHasLoadedAuthUser] = useState(false);
  const [updateTime, setUpdateTime] = useState("");
  const [metrics, setMetrics] = useState<PlacementMetricItem[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("90d");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const isLcUser = accountType.toLowerCase() === "lc";

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
    void fetchPlacementMetrics(false);
  }, [fetchPlacementMetrics, isAuthenticated]);

  const analytics = useMemo(
    () => buildDashboardAnalytics(metrics, dateRange, selectedState),
    [metrics, dateRange, selectedState]
  );

  useEffect(() => {
    if (!selectedState) return;
    if (!analytics.stateTotals.some((row) => row.state === selectedState)) {
      setSelectedState(null);
    }
  }, [analytics.stateTotals, selectedState]);

  const toggleStateFilter = useCallback((stateName?: string) => {
    if (!stateName) return;
    setSelectedState((current) => (current === stateName ? null : stateName));
  }, []);

  const growthSummary = analytics.stateGrowth30d.slice(0, 12);
  const paceLeaderboard = analytics.statePace.slice(0, 10);
  const recencyRows = analytics.stateRecencyRisk.slice(0, 12);
  const paceLeader = paceLeaderboard[0];
  const concentrationLeader = analytics.statePareto[0];
  const atRiskCount = analytics.stateRecencyRisk.filter(
    (row) => row.riskBand === "At Risk"
  ).length;

  if (authLoading || !isAuthenticated || !hasLoadedAuthUser) {
    return (
      <div className="brand-page-gradient min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--brand-primary)]" />
          <p className="mt-4 font-medium text-[var(--brand-body)]">Loading dashboard...</p>
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
              showDashboard={false}
            />
          )}

          <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
            <section className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.92)] p-6 text-center shadow-[0_12px_28px_rgba(0,53,84,0.12)]">
              <h1 className="text-2xl font-black tracking-tight text-[var(--brand-ink)]">
                Dashboard Unavailable
              </h1>
              <p className="mt-2 text-sm text-[var(--brand-body)]">
                Dashboard access is not available for LC accounts.
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
            showDashboard={!isLcUser}
          />
        )}

        <main className="mx-auto max-w-[1340px] px-4 py-6 sm:px-6">
          <section className="rounded-3xl border border-[rgba(0,94,184,0.3)] bg-[rgba(253,254,255,0.9)] p-6 shadow-[0_16px_38px_rgba(0,53,84,0.14)] backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--brand-ink)]">
                  State-First Insight Studio
                </h1>
                <p className="mt-1 text-sm text-[var(--brand-body)]">
                  Placement intelligence from `GET /api/placement_metrics/`, centered on
                  state pace, concentration, and freshness risk.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!embedded && (
                  <Link
                    href="/"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Search
                  </Link>
                )}
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

          <section className="mt-5 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.92)] p-4 shadow-[0_12px_26px_rgba(0,53,84,0.1)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="inline-flex items-center gap-2 text-base font-bold text-[var(--brand-ink)]">
                  <Sparkles className="h-4 w-4 text-[var(--brand-accent)]" />
                  Analytics Controls
                </h2>
                <p className="mt-1 text-xs text-[var(--brand-body)]">
                  Select a range, then click state bars/points to cross-filter all sections.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDateRange(option.value)}
                    className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                      dateRange === option.value
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                        : "border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-[var(--brand-body)] hover:bg-[var(--brand-surface)]"
                    }`}
                  >
                    <CalendarRange className="mr-1.5 h-3.5 w-3.5" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {selectedState ? (
                <button
                  type="button"
                  onClick={() => setSelectedState(null)}
                  className="inline-flex h-8 items-center rounded-full border border-[rgba(255,87,0,0.42)] bg-[rgba(255,87,0,0.12)] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-accent)] transition-colors hover:bg-[rgba(255,87,0,0.18)]"
                >
                  <Filter className="mr-1.5 h-3.5 w-3.5" />
                  Clear State Filter: {selectedState}
                </button>
              ) : (
                <span className="inline-flex h-8 items-center rounded-full border border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)]">
                  State Scope: All States
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {analytics.stateTotals.slice(0, 10).map((item) => (
                <button
                  key={item.state}
                  type="button"
                  onClick={() => toggleStateFilter(item.state)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    selectedState === item.state
                      ? "border-[var(--brand-primary)] bg-[rgba(0,94,184,0.12)] text-[var(--brand-primary-deep)]"
                      : "border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] text-[var(--brand-body)] hover:border-[var(--brand-primary)]"
                  }`}
                >
                  <span>{item.state}</span>
                  <span className="rounded-full bg-[rgba(0,53,84,0.08)] px-1.5 py-0.5 text-[10px]">
                    {item.placements}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Scoped Placements"
              value={analytics.kpis.scopedPlacements.toLocaleString()}
              detail={selectedState ? "State filter active" : "All active states"}
              icon={Users}
            />
            <MetricCard
              label="Active States"
              value={analytics.kpis.activeStates}
              detail={
                analytics.kpis.topStateName
                  ? `Top state: ${analytics.kpis.topStateName}`
                  : "No state records"
              }
              icon={MapPinned}
            />
            <MetricCard
              label="Top State Share"
              value={`${analytics.kpis.topStateShare}%`}
              detail={
                analytics.kpis.topStateName
                  ? `${analytics.kpis.topStateName} concentration`
                  : "No concentration signal"
              }
              icon={BarChart3}
            />
            <MetricCard
              label="States Stale 30+ Days"
              value={analytics.kpis.staleStateCount30d}
              detail="States with no recent placements"
              icon={CalendarClock}
            />
            <MetricCard
              label="Median Placements / State"
              value={analytics.kpis.medianPlacementsPerState}
              detail="Median across active states"
              icon={TrendingUp}
            />
            <MetricCard
              label="Latest Placement"
              value={formatDate(
                analytics.kpis.latestPlacementDate,
                analytics.kpis.latestPlacementRaw
              )}
              detail="Most recent record in scope"
              icon={CalendarClock}
            />
            <MetricCard
              label="Data Health"
              value={metricsError ? "Issue" : "OK"}
              detail={metricsError ? metricsError : "Metrics endpoint responding"}
              icon={Activity}
            />
            <MetricCard
              label="At Risk States"
              value={atRiskCount}
              detail="Recency risk band: 31+ days"
              icon={MapPinned}
            />
          </section>

          {metricsError ? (
            <section className="mt-4 rounded-2xl border border-[rgba(201,18,41,0.42)] bg-[rgba(201,18,41,0.1)] px-5 py-4 text-sm font-semibold text-[var(--brand-danger)]">
              {metricsError}
            </section>
          ) : null}

          <section className="mt-5 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
            <h2 className="text-base font-bold text-[var(--brand-ink)]">State Pace</h2>
            <p className="mt-1 text-xs text-[var(--brand-muted)]">
              Compare recent volume and momentum. Every chart supports state click
              cross-filtering.
            </p>

            <div className="mt-4 grid gap-4 xl:grid-cols-12">
              <article className="xl:col-span-4 rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.56)] p-3">
                <h3 className="text-sm font-bold text-[var(--brand-ink)]">
                  State Pace Leaderboard
                </h3>
                <p className="mt-1 text-xs text-[var(--brand-muted)]">
                  Rank by placements in the last 30 days.
                </p>
                <div className="mt-3 h-[310px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart layout="vertical" data={paceLeaderboard}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,125,131,0.24)" />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#5f6f7a" }}
                        label={{
                          value: "Placements (Last 30 Days)",
                          position: "insideBottom",
                          offset: -2,
                        }}
                      />
                      <YAxis
                        type="category"
                        dataKey="state"
                        width={98}
                        tick={{ fontSize: 11, fill: "#5f6f7a" }}
                        label={{
                          value: "State",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <RechartsTooltip content={<DashboardTooltip />} />
                      <Bar
                        dataKey="placements30d"
                        name="Placements (Last 30 Days)"
                        radius={[0, 6, 6, 0]}
                        onClick={(entry: unknown) =>
                          toggleStateFilter((entry as { state?: string }).state)
                        }
                      >
                        {paceLeaderboard.map((row) => (
                          <Cell
                            key={`pace-${row.state}`}
                            onClick={() => toggleStateFilter(row.state)}
                            fill={
                              selectedState === row.state
                                ? "rgba(255,87,0,0.78)"
                                : "rgba(0,94,184,0.74)"
                            }
                          />
                        ))}
                      </Bar>
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="xl:col-span-4 rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.56)] p-3">
                <h3 className="text-sm font-bold text-[var(--brand-ink)]">
                  State Growth vs Volume Quadrant
                </h3>
                <p className="mt-1 text-xs text-[var(--brand-muted)]">
                  Detect large-but-slow vs small-but-accelerating states.
                </p>
                <div className="mt-3 h-[310px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 18, bottom: 24, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,125,131,0.24)" />
                      <ReferenceLine x={0} stroke="rgba(0,53,84,0.32)" />
                      <XAxis
                        type="number"
                        dataKey="growthPct"
                        name="30-Day Growth vs Prior 30 Days (%)"
                        tick={{ fontSize: 11, fill: "#5f6f7a" }}
                        label={{
                          value: "30-Day Growth vs Prior 30 Days (%)",
                          position: "insideBottom",
                          offset: -2,
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey="recentPlacements"
                        allowDecimals={false}
                        name="Placements (Last 30 Days)"
                        tick={{ fontSize: 11, fill: "#5f6f7a" }}
                        label={{
                          value: "Placements (Last 30 Days)",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <ZAxis
                        type="number"
                        dataKey="totalPlacements"
                        name="Total Scoped Placements"
                        range={[70, 330]}
                      />
                      <RechartsTooltip content={<DashboardTooltip />} cursor={{ strokeDasharray: "4 4" }} />
                      <Scatter
                        name="States"
                        data={growthSummary}
                        onClick={(entry: unknown) =>
                          toggleStateFilter(
                            (entry as { payload?: { state?: string } }).payload?.state
                          )
                        }
                      >
                        {growthSummary.map((row) => (
                          <Cell
                            key={`growth-${row.state}`}
                            fill={
                              selectedState === row.state
                                ? "rgba(255,87,0,0.76)"
                                : "rgba(60,159,192,0.74)"
                            }
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="xl:col-span-4 rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.56)] p-3">
                <h3 className="text-sm font-bold text-[var(--brand-ink)]">
                  Weekly State Momentum
                </h3>
                <p className="mt-1 text-xs text-[var(--brand-muted)]">
                  Top 5 states over the last 16 weeks.
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {analytics.weeklySeriesStates.map((state, index) => (
                    <button
                      key={`weekly-chip-${state}`}
                      type="button"
                      onClick={() => toggleStateFilter(state)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] ${
                        selectedState === state
                          ? "border-[var(--brand-accent)] bg-[rgba(255,87,0,0.12)] text-[var(--brand-accent)]"
                          : "border-[var(--brand-border-soft)] bg-white text-[var(--brand-body)]"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length],
                        }}
                      />
                      {state}
                    </button>
                  ))}
                </div>

                <div className="mt-3 h-[310px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.stateWeeklySeries16w}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,125,131,0.24)" />
                      <XAxis
                        dataKey="weekLabel"
                        tick={{ fontSize: 11, fill: "#5f6f7a" }}
                        label={{ value: "Week", position: "insideBottom", offset: -2 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#5f6f7a" }}
                        label={{
                          value: "Placements Per Week",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <RechartsTooltip content={<DashboardTooltip />} />
                      {analytics.weeklySeriesStates.map((state, index) => (
                        <Line
                          key={`weekly-line-${state}`}
                          type="monotone"
                          dataKey={state}
                          name={state}
                          stroke={CHART_PALETTE[index % CHART_PALETTE.length]}
                          strokeWidth={selectedState === state ? 3 : 2}
                          dot={false}
                          onClick={() => toggleStateFilter(state)}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
            <h2 className="text-base font-bold text-[var(--brand-ink)]">State Distribution</h2>
            <p className="mt-1 text-xs text-[var(--brand-muted)]">
              Measure concentration and detect seasonal placement patterns by state.
            </p>

            <div className="mt-4 grid gap-4 xl:grid-cols-12">
              <article className="xl:col-span-6 rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.56)] p-3">
                <h3 className="text-sm font-bold text-[var(--brand-ink)]">
                  State Concentration Pareto
                </h3>
                <p className="mt-1 text-xs text-[var(--brand-muted)]">
                  Placements and cumulative share across top 12 states.
                </p>
                <div className="mt-3 h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analytics.statePareto} margin={{ top: 10, right: 15, bottom: 50, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,125,131,0.24)" />
                      <XAxis
                        dataKey="state"
                        interval={0}
                        angle={-28}
                        textAnchor="end"
                        height={72}
                        tick={{ fontSize: 10, fill: "#5f6f7a" }}
                        label={{ value: "State", position: "insideBottom", offset: -6 }}
                      />
                      <YAxis
                        yAxisId="left"
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#5f6f7a" }}
                        label={{
                          value: "Placements",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: "#5f6f7a" }}
                        label={{
                          value: "Cumulative Share (%)",
                          angle: 90,
                          position: "insideRight",
                        }}
                      />
                      <RechartsTooltip content={<DashboardTooltip />} />
                      <Bar
                        yAxisId="left"
                        dataKey="placements"
                        name="Placements"
                        radius={[6, 6, 0, 0]}
                        onClick={(entry: unknown) =>
                          toggleStateFilter((entry as { state?: string }).state)
                        }
                      >
                        {analytics.statePareto.map((row) => (
                          <Cell
                            key={`pareto-${row.state}`}
                            onClick={() => toggleStateFilter(row.state)}
                            fill={
                              selectedState === row.state
                                ? "rgba(255,87,0,0.78)"
                                : "rgba(0,94,184,0.74)"
                            }
                          />
                        ))}
                      </Bar>
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="cumulativeShare"
                        name="Cumulative Share (%)"
                        stroke="#FF5700"
                        strokeWidth={2.1}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="xl:col-span-6 rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.56)] p-3">
                <h3 className="text-sm font-bold text-[var(--brand-ink)]">
                  State Seasonality Matrix
                </h3>
                <p className="mt-1 text-xs text-[var(--brand-muted)]">
                  Scatter heatmap: month by state, colored by monthly placements.
                </p>
                <div className="mt-3 h-[340px] w-full">
                  {analytics.stateSeasonalityStates.length === 0 ? (
                    <div className="h-full rounded-xl border border-dashed border-[var(--brand-border)] bg-[rgba(253,254,255,0.8)] px-4 py-8 text-center text-xs font-semibold text-[var(--brand-muted)]">
                      Not enough dated state records for seasonality analysis.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 35, left: 26 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,125,131,0.24)" />
                        <XAxis
                          type="number"
                          dataKey="monthIndex"
                          ticks={analytics.stateSeasonalityMonths.map((_, index) => index)}
                          domain={[-0.5, analytics.stateSeasonalityMonths.length - 0.5]}
                          tickFormatter={(value: number) =>
                            analytics.stateSeasonalityMonths[value] ?? ""
                          }
                          tick={{ fontSize: 10, fill: "#5f6f7a" }}
                          label={{ value: "Month", position: "insideBottom", offset: -5 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="stateIndex"
                          ticks={analytics.stateSeasonalityStates.map((_, index) => index)}
                          domain={[-0.5, analytics.stateSeasonalityStates.length - 0.5]}
                          tickFormatter={(value: number) =>
                            analytics.stateSeasonalityStates[value] ?? ""
                          }
                          tick={{ fontSize: 10, fill: "#5f6f7a" }}
                          width={104}
                          label={{
                            value: "State",
                            angle: -90,
                            position: "insideLeft",
                          }}
                        />
                        <ZAxis type="number" dataKey="placements" range={[90, 90]} />
                        <RechartsTooltip content={<DashboardTooltip />} />
                        <Scatter
                          data={analytics.stateSeasonality12m}
                          name="Placements In Month"
                          shape={(shapeProps: unknown) => {
                            const { cx, cy, payload } = shapeProps as {
                              cx?: number;
                              cy?: number;
                              payload?: StateSeasonalityCell;
                            };
                            if (!cx || !cy || !payload) return <g />;
                            return (
                              <rect
                                x={cx - 8}
                                y={cy - 8}
                                width={16}
                                height={16}
                                rx={3}
                                fill={getSeasonalityColor(payload.intensity)}
                                stroke={
                                  selectedState === payload.state
                                    ? "rgba(255,87,0,0.92)"
                                    : "rgba(255,255,255,0.82)"
                                }
                                strokeWidth={selectedState === payload.state ? 1.8 : 1}
                              />
                            );
                          }}
                          onClick={(entry: unknown) =>
                            toggleStateFilter(
                              (entry as { payload?: { state?: string } }).payload?.state
                            )
                          }
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-[var(--brand-muted)]">
                  Axes: X = Month, Y = State. Cell intensity = placements in that month.
                </p>
              </article>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
            <h2 className="text-base font-bold text-[var(--brand-ink)]">
              State Risk & Freshness
            </h2>
            <p className="mt-1 text-xs text-[var(--brand-muted)]">
              Track stale states and use the state drill-down to inspect city composition.
            </p>

            <div className="mt-4 grid gap-4 xl:grid-cols-12">
              <article className="xl:col-span-7 rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.56)] p-3">
                <h3 className="text-sm font-bold text-[var(--brand-ink)]">
                  State Recency Risk Ladder
                </h3>
                <p className="mt-1 text-xs text-[var(--brand-muted)]">
                  Days since latest placement per state. Healthy: 0-14, Watch: 15-30, At
                  Risk: 31+.
                </p>
                <div className="mt-3 h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart layout="vertical" data={recencyRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,125,131,0.24)" />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#5f6f7a" }}
                        label={{
                          value: "Days Since Last Placement",
                          position: "insideBottom",
                          offset: -2,
                        }}
                      />
                      <YAxis
                        type="category"
                        dataKey="state"
                        width={102}
                        tick={{ fontSize: 11, fill: "#5f6f7a" }}
                        label={{
                          value: "State",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <RechartsTooltip content={<DashboardTooltip />} />
                      <Bar
                        dataKey="daysSinceLastPlacement"
                        name="Days Since Last Placement"
                        radius={[0, 6, 6, 0]}
                        onClick={(entry: unknown) =>
                          toggleStateFilter((entry as { state?: string }).state)
                        }
                      >
                        {recencyRows.map((row) => (
                          <Cell
                            key={`recency-${row.state}`}
                            onClick={() => toggleStateFilter(row.state)}
                            fill={
                              selectedState === row.state
                                ? "rgba(255,87,0,0.84)"
                                : getRecencyColor(row.daysSinceLastPlacement)
                            }
                          />
                        ))}
                      </Bar>
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="xl:col-span-5 rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.56)] p-3">
                <h3 className="text-sm font-bold text-[var(--brand-ink)]">
                  State Drill-Down: Cities
                </h3>
                <p className="mt-1 text-xs text-[var(--brand-muted)]">
                  Secondary city view appears once a state is selected.
                </p>

                {!selectedState ? (
                  <div className="mt-3 rounded-xl border border-dashed border-[var(--brand-border)] bg-[rgba(253,254,255,0.8)] px-4 py-12 text-center">
                    <p className="text-sm font-semibold text-[var(--brand-body)]">
                      Click any state in the charts to open city drill-down.
                    </p>
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">
                      This keeps the dashboard state-first while preserving city context.
                    </p>
                  </div>
                ) : analytics.cityDrilldown.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-[var(--brand-border)] bg-[rgba(253,254,255,0.8)] px-4 py-12 text-center">
                    <p className="text-sm font-semibold text-[var(--brand-body)]">
                      No city records available for {selectedState}.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-3 rounded-lg border border-[rgba(0,94,184,0.28)] bg-[rgba(0,94,184,0.06)] px-3 py-2 text-xs font-semibold text-[var(--brand-primary-deep)]">
                      Selected State: {selectedState}
                    </div>
                    <div className="mt-3 h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart layout="vertical" data={analytics.cityDrilldown}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,125,131,0.24)" />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "#5f6f7a" }}
                            label={{
                              value: "Placements",
                              position: "insideBottom",
                              offset: -2,
                            }}
                          />
                          <YAxis
                            type="category"
                            dataKey="city"
                            width={116}
                            tick={{ fontSize: 10, fill: "#5f6f7a" }}
                            label={{
                              value: "City",
                              angle: -90,
                              position: "insideLeft",
                            }}
                          />
                          <RechartsTooltip content={<DashboardTooltip />} />
                          <Bar dataKey="placements" name="Placements" fill="rgba(60,159,192,0.82)" radius={[0, 6, 6, 0]} />
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}

                <div className="mt-4 space-y-2">
                  <article className="rounded-lg border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.84)] px-3 py-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--brand-primary-deep)]">
                      Pace Signal
                    </h4>
                    <p className="mt-1 text-xs text-[var(--brand-body)]">
                      {paceLeader
                        ? `${paceLeader.state} leads recent pace with ${paceLeader.placements30d} placements in the last 30 days.`
                        : "No pace signal available yet."}
                    </p>
                  </article>
                  <article className="rounded-lg border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.84)] px-3 py-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--brand-primary-deep)]">
                      Concentration Signal
                    </h4>
                    <p className="mt-1 text-xs text-[var(--brand-body)]">
                      {concentrationLeader
                        ? `${concentrationLeader.state} accounts for ${concentrationLeader.share}% of current scoped placements.`
                        : "No concentration signal available yet."}
                    </p>
                  </article>
                </div>
              </article>
            </div>
          </section>

          <section className="mt-5 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <article className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">
                Top States Snapshot
              </h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Share and volume for current scoped states.
              </p>

              <div className="mt-4 space-y-3">
                {analytics.stateTotals.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--brand-border)] bg-[rgba(246,247,248,0.8)] px-3 py-8 text-center text-xs font-semibold text-[var(--brand-muted)]">
                    No placement data available.
                  </p>
                ) : (
                  analytics.stateTotals.slice(0, 50).map((stateRow) => (
                    <button
                      key={stateRow.state}
                      type="button"
                      onClick={() => toggleStateFilter(stateRow.state)}
                      className="w-full space-y-1 text-left"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-[var(--brand-body)]">{stateRow.state}</span>
                        <span className="text-[var(--brand-muted)]">
                          {stateRow.placements} ({stateRow.share}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[rgba(0,53,84,0.08)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]"
                          style={{ width: `${Math.min(100, stateRow.share)}%` }}
                        />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">Records Explorer</h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Detailed records for current range and state cross-filter.
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
              ) : analytics.scopedMetrics.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-[var(--brand-border)] bg-[rgba(246,247,248,0.85)] px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-[var(--brand-body)]">
                    No placements in current scope.
                  </p>
                  <p className="mt-1 text-xs text-[var(--brand-muted)]">
                    Adjust time range or clear the state filter.
                  </p>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--brand-border-soft)]">
                  <table className="w-full min-w-[560px] text-left">
                    <thead className="bg-[rgba(0,53,84,0.06)] text-[11px] uppercase tracking-[0.12em] text-[var(--brand-body)]">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold">App ID</th>
                        <th className="px-3 py-2.5 font-semibold">City</th>
                        <th className="px-3 py-2.5 font-semibold">State</th>
                        <th className="px-3 py-2.5 font-semibold">Placement Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--brand-border-soft)] text-sm">
                      {analytics.scopedMetrics.slice(0, 18).map((item) => (
                        <tr
                          key={`${item.appId}-${item.city}-${item.state}-${item.placementDateRaw}`}
                          className="hover:bg-[rgba(0,94,184,0.05)]"
                        >
                          <td className="px-3 py-2.5 font-semibold text-[var(--brand-primary-deep)]">
                            {item.appId}
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

        {!embedded && <Footer />}
      </div>
    </div>
  );
}
