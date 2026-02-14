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
  Globe2,
  MapPinned,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/auth-context";
import { useAuthRedirect } from "@/features/student-search/hooks/use-auth-redirect";
import type { DateRange, PlacementMetricItem } from "@/features/dashboard/types";
import { normalizePlacementMetrics } from "@/features/dashboard/placement-metrics";
import { buildManagerDashboardAnalytics } from "@/features/manager-dashboard/analytics";
import type { SeriesGranularity } from "@/features/manager-dashboard/types";
import { getCachedValue } from "@/lib/client-cache";

const API_URL = "/api";
const CACHE_TTL_SHORT_MS = 30_000;
const CACHE_TTL_MEDIUM_MS = 5 * 60_000;

const CHART_PALETTE = [
  "var(--brand-primary)",
  "var(--brand-secondary)",
  "var(--brand-accent)",
  "var(--brand-success)",
  "var(--brand-highlight)",
  "var(--brand-primary-deep)",
] as const;

const RANGE_OPTIONS: Array<{ value: DateRange; label: string }> = [
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "12m", label: "12 Months" },
  { value: "all", label: "All Time" },
];

type DashboardTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
};

function DashboardTooltip({ active, label, payload }: DashboardTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const rawKey = payload[0]?.payload?.periodKey;
  const keyText = typeof rawKey === "string" ? rawKey : null;

  return (
    <div className="rounded-lg border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.96)] px-3 py-2 text-xs shadow-[0_10px_24px_rgba(0,53,84,0.18)]">
      <p className="mb-1 font-semibold text-[var(--brand-ink)]">
        {label !== undefined ? label : "Details"}
        {keyText && keyText !== String(label) ? (
          <span className="ml-2 font-medium text-[var(--brand-muted)]">{keyText}</span>
        ) : null}
      </p>
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

function placementTone(count: number): string {
  if (count <= 0) return "border-[rgba(187,192,195,0.72)] bg-[rgba(246,247,248,0.8)]";
  if (count <= 2) return "border-[rgba(60,159,192,0.42)] bg-[rgba(60,159,192,0.12)]";
  if (count <= 5) return "border-[rgba(0,94,184,0.42)] bg-[rgba(0,94,184,0.12)]";
  if (count <= 10) return "border-[rgba(0,144,63,0.42)] bg-[rgba(0,144,63,0.12)]";
  return "border-[rgba(255,87,0,0.42)] bg-[rgba(255,87,0,0.12)]";
}

export default function ManagerDashboardPage() {
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
  const [granularity, setGranularity] = useState<SeriesGranularity>("daily");
  const [includeUnknownStates, setIncludeUnknownStates] = useState(false);

  const isLcUser = accountType.toLowerCase() === "lc";

  useEffect(() => {
    if (dateRange === "12m" || dateRange === "all") {
      setGranularity((current) => (current === "daily" ? "weekly" : current));
    }
  }, [dateRange]);

  const fetchPlacementMetrics = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoadingMetrics(true);
    }

    try {
      const normalized = await getCachedValue<PlacementMetricItem[]>(
        "dashv2:placement_metrics",
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
    if (!isAuthenticated) return;
    void fetchPlacementMetrics(false);
  }, [fetchPlacementMetrics, isAuthenticated]);

  const analytics = useMemo(
    () =>
      buildManagerDashboardAnalytics({
        metrics,
        dateRange,
        granularity,
        includeUnknownStates,
      }),
    [dateRange, granularity, includeUnknownStates, metrics]
  );

  const topStates = analytics.topStates
    .filter((row) => row.state !== "Unknown")
    .slice(0, 12);
  const topCities = analytics.topCities.slice(0, 12);
  const regionTotals = analytics.regionTotals.filter((row) => row.placements > 0).slice(0, 6);
  const untappedStates = analytics.untappedStates;
  const staleStates = analytics.staleStates90d.slice(0, 12);

  if (authLoading || !isAuthenticated || !hasLoadedAuthUser) {
    return (
      <div className="brand-page-gradient min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--brand-primary)]" />
          <p className="mt-4 font-medium text-[var(--brand-body)]">
            Loading manager dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (isLcUser) {
    return (
      <div className="brand-page-gradient min-h-screen text-[var(--brand-ink)]">
        <div className="relative z-10">
          <Header
            firstName={firstName}
            onLogout={logout}
            updateTime={updateTime}
            showDashboard={false}
          />
          <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
            <section className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.92)] p-6 text-center shadow-[0_12px_28px_rgba(0,53,84,0.12)]">
              <h1 className="text-2xl font-black tracking-tight text-[var(--brand-ink)]">
                Dashboard Unavailable
              </h1>
              <p className="mt-2 text-sm text-[var(--brand-body)]">
                Manager dashboard access is not available for LC accounts.
              </p>
              <div className="mt-5">
                <Link
                  href="/"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Search
                </Link>
              </div>
            </section>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="brand-page-gradient min-h-screen text-[var(--brand-ink)]">
      <div className="relative z-10">
        <Header
          firstName={firstName}
          onLogout={logout}
          updateTime={updateTime}
          showDashboard={!isLcUser}
        />

        <main className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6">
          <section className="rounded-3xl border border-[rgba(0,94,184,0.3)] bg-[rgba(253,254,255,0.9)] p-6 shadow-[0_16px_38px_rgba(0,53,84,0.14)] backdrop-blur-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
                  Executive Overview
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--brand-ink)]">
                  Placement Intelligence Dashboard (v2)
                </h1>
                <p className="mt-1 text-sm text-[var(--brand-body)]">
                  High-level monitoring from <span className="font-mono">GET /api/placement_metrics</span>:
                  daily pace, region performance, hotspots, and untapped areas.
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

          <section className="mt-5 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.92)] p-4 shadow-[0_12px_26px_rgba(0,53,84,0.1)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="inline-flex items-center gap-2 text-base font-bold text-[var(--brand-ink)]">
                  <BarChart3 className="h-4 w-4 text-[var(--brand-accent)]" />
                  Reporting Controls
                </h2>
                <p className="mt-1 text-xs text-[var(--brand-body)]">
                  Pick a date window and chart granularity. All charts label states using full names.
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
              <div className="flex items-center gap-1 rounded-full border border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] p-1">
                {(["daily", "weekly"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setGranularity(option)}
                    className={`inline-flex h-7 items-center rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                      granularity === option
                        ? "bg-[var(--brand-primary)] text-white"
                        : "text-[var(--brand-body)] hover:bg-[rgba(0,94,184,0.1)]"
                    }`}
                  >
                    {option === "daily" ? "Daily" : "Weekly"}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIncludeUnknownStates((current) => !current)}
                className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                  includeUnknownStates
                    ? "border-[rgba(255,87,0,0.42)] bg-[rgba(255,87,0,0.12)] text-[var(--brand-accent)]"
                    : "border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-[var(--brand-body)] hover:bg-[var(--brand-surface)]"
                }`}
              >
                <Activity className="mr-1.5 h-3.5 w-3.5" />
                {includeUnknownStates ? "Including Unknown States" : "Exclude Unknown States"}
              </button>
            </div>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Placements (Scoped)"
              value={analytics.kpis.scopedPlacements.toLocaleString()}
              detail={`Range: ${RANGE_OPTIONS.find((r) => r.value === dateRange)?.label ?? dateRange}`}
              icon={TrendingUp}
            />
            <MetricCard
              label="Placements (Last 7 Days)"
              value={analytics.kpis.placementsLast7d.toLocaleString()}
              detail="Most recent 7 days of dated records"
              icon={CalendarClock}
            />
            <MetricCard
              label="Avg Placements / Day"
              value={analytics.kpis.avgPlacementsPerDay}
              detail="Average across the selected window"
              icon={BarChart3}
            />
            <MetricCard
              label="Active Coverage"
              value={`${analytics.kpis.activeStates} States`}
              detail={`${analytics.kpis.activeRegions} Regions active`}
              icon={Globe2}
            />
            <MetricCard
              label="Top State"
              value={analytics.kpis.topState ?? "—"}
              detail="Highest placements in scope"
              icon={MapPinned}
            />
            <MetricCard
              label="Top City"
              value={analytics.kpis.topCity ?? "—"}
              detail="Largest city hotspot in scope"
              icon={MapPinned}
            />
            <MetricCard
              label="Untapped States"
              value={analytics.kpis.untappedStatesCount}
              detail="States with 0 placements in selected window"
              icon={MapPinned}
            />
            <MetricCard
              label="Latest Placement"
              value={formatDate(analytics.kpis.latestPlacementDate, analytics.kpis.latestPlacementRaw)}
              detail={
                metricsError
                  ? metricsError
                  : `Unknown state: ${analytics.kpis.unknownStateRecords}, invalid date: ${analytics.kpis.invalidDateRecords}`
              }
              icon={Activity}
            />
          </section>

          {metricsError ? (
            <section className="mt-4 rounded-2xl border border-[rgba(201,18,41,0.42)] bg-[rgba(201,18,41,0.1)] px-5 py-4 text-sm font-semibold text-[var(--brand-danger)]">
              {metricsError}
            </section>
          ) : null}

          <section className="mt-5 grid gap-4 xl:grid-cols-12">
            <article className="xl:col-span-7 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">
                Placements Trend ({granularity === "daily" ? "Daily" : "Weekly"})
              </h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Monitor pace changes over time. Axis is labeled and tooltips show the period key.
              </p>
              <div className="mt-3 h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,125,131,0.24)" />
                    <XAxis
                      dataKey="periodLabel"
                      tick={{ fontSize: 11, fill: "#5f6f7a" }}
                      minTickGap={18}
                      label={{
                        value: granularity === "daily" ? "Date" : "Week Starting",
                        position: "insideBottom",
                        offset: -2,
                      }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#5f6f7a" }}
                      label={{
                        value: "Placements",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <RechartsTooltip content={<DashboardTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="placements"
                      name="Placements"
                      stroke="var(--brand-primary)"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="xl:col-span-5 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">Placements by Region</h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Aggregated by U.S. Census regions for high-level comparison.
              </p>
              <div className="mt-3 h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart layout="vertical" data={regionTotals}>
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
                      dataKey="region"
                      width={92}
                      tick={{ fontSize: 11, fill: "#5f6f7a" }}
                      label={{
                        value: "Region",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <RechartsTooltip content={<DashboardTooltip />} />
                    <Bar dataKey="placements" name="Placements" radius={[0, 10, 10, 0]}>
                      {regionTotals.map((row, index) => (
                        <Cell
                          key={`${row.region}-${index}`}
                          fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                        />
                      ))}
                    </Bar>
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="mt-5 grid gap-4 xl:grid-cols-12">
            <article className="xl:col-span-7 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">Top States</h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Highest placement volume in scope. States are shown by full name.
              </p>
              <div className="mt-3 h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart layout="vertical" data={topStates}>
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
                      dataKey="state"
                      width={132}
                      tick={{ fontSize: 11, fill: "#5f6f7a" }}
                      label={{
                        value: "State",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <RechartsTooltip content={<DashboardTooltip />} />
                    <Bar dataKey="placements" name="Placements" radius={[0, 10, 10, 0]}>
                      {topStates.map((row, index) => (
                        <Cell
                          key={`${row.state}-${index}`}
                          fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                        />
                      ))}
                    </Bar>
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="xl:col-span-5 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">City Hotspots</h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                The cities generating the most placements (City, State).
              </p>
              <div className="mt-3 h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart layout="vertical" data={topCities}>
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
                      dataKey="label"
                      width={148}
                      tick={{ fontSize: 10, fill: "#5f6f7a" }}
                      label={{
                        value: "City, State",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <RechartsTooltip content={<DashboardTooltip />} />
                    <Bar
                      dataKey="placements"
                      name="Placements"
                      radius={[0, 10, 10, 0]}
                      fill="var(--brand-secondary)"
                    />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="mt-5 grid gap-4 xl:grid-cols-12">
            <article className="xl:col-span-7 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">
                Coverage and Untapped Areas
              </h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                States with zero placements in the selected window can indicate untapped or under-served areas.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {untappedStates.length === 0 ? (
                  <span className="rounded-full border border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] px-3 py-1 text-xs font-semibold text-[var(--brand-body)]">
                    No untapped states in this window.
                  </span>
                ) : (
                  untappedStates.map((state) => (
                    <span
                      key={state}
                      className="rounded-full border border-[rgba(187,192,195,0.8)] bg-[rgba(246,247,248,0.9)] px-3 py-1 text-xs font-semibold text-[var(--brand-body)]"
                    >
                      {state}
                    </span>
                  ))
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {analytics.coverage.map((region) => (
                  <section
                    key={region.region}
                    className="rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.56)] p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm font-bold text-[var(--brand-ink)]">{region.region}</h3>
                      <span className="text-xs font-semibold text-[var(--brand-muted)]">
                        {region.totalPlacements.toLocaleString()} placements
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {region.states.slice(0, 12).map((stateRow) => (
                        <span
                          key={stateRow.state}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${placementTone(
                            stateRow.placements
                          )}`}
                        >
                          <span className="text-[var(--brand-ink)]">{stateRow.state}</span>
                          <span className="rounded-full bg-[rgba(0,53,84,0.08)] px-1.5 py-0.5 text-[10px] text-[var(--brand-body)]">
                            {stateRow.placements}
                          </span>
                        </span>
                      ))}
                    </div>
                    {region.states.length > 12 ? (
                      <p className="mt-2 text-[11px] font-medium text-[var(--brand-muted)]">
                        Showing top 12 states by placements in this region.
                      </p>
                    ) : null}
                  </section>
                ))}
              </div>
            </article>

            <article className="xl:col-span-5 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">
                Stale States (90+ Days Since Last Placement)
              </h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Useful for flagging previously-active states that may be cooling off.
              </p>
              <div className="mt-3 space-y-2">
                {staleStates.length === 0 ? (
                  <p className="text-sm font-medium text-[var(--brand-body)]">
                    No states are 90+ days stale based on dated records.
                  </p>
                ) : (
                  staleStates.map((row, index) => (
                    <div
                      key={`${row.state}-${index}`}
                      className="rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.56)] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-[var(--brand-ink)]">{row.state}</p>
                        <p className="text-xs font-semibold text-[var(--brand-accent)]">
                          {row.daysSinceLastPlacement} days
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-[var(--brand-muted)]">
                        Last placement: {row.lastPlacementLabel} • Total records:{" "}
                        {row.totalPlacements.toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>

          {isLoadingMetrics ? (
            <div className="mt-6 text-center text-sm font-medium text-[var(--brand-muted)]">
              Loading charts...
            </div>
          ) : null}
        </main>

        <Footer />
      </div>
    </div>
  );
}
