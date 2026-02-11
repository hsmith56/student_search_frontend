"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CalendarRange,
  Clock3,
  Compass,
  Filter,
  Globe2,
  Home,
  MapPinned,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
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
import { getCachedValue } from "@/lib/client-cache";
import type { HeaderView } from "@/components/layout/Header";

const API_URL = "/api";
const CACHE_TTL_SHORT_MS = 30_000;
const CACHE_TTL_MEDIUM_MS = 5 * 60_000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const CHART_PALETTE = [
  "#005EB8",
  "#3C9FC0",
  "#FF5700",
  "#00903F",
  "#FFC23E",
  "#7A9BC2",
] as const;

type DateRange = "30d" | "90d" | "12m" | "all";
type GeoFocus = "states" | "cities";

const RANGE_OPTIONS: Array<{ value: DateRange; label: string }> = [
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "12m", label: "12 Months" },
  { value: "all", label: "All Time" },
];

type PlacementMetricRecord = {
  app_id?: number;
  city?: string;
  state?: string;
  placementDate?: string;
};

type PlacementMetricItem = {
  appId: number;
  city: string;
  state: string;
  placementDateRaw: string;
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

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDayTime(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getHeatCellColor(intensity: number): string {
  if (intensity <= 0) return "rgba(187, 192, 195, 0.28)";
  if (intensity === 1) return "rgba(60, 159, 192, 0.35)";
  if (intensity === 2) return "rgba(0, 94, 184, 0.4)";
  if (intensity === 3) return "rgba(0, 144, 63, 0.42)";
  return "rgba(255, 87, 0, 0.45)";
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
      const placementDate = parsePlacementDate(placementDateRaw);
      const placementTime = placementDate ? placementDate.getTime() : 0;

      return {
        appId,
        city,
        state,
        placementDateRaw,
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
  const [updateTime, setUpdateTime] = useState("");
  const [metrics, setMetrics] = useState<PlacementMetricItem[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("90d");
  const [geoFocus, setGeoFocus] = useState<GeoFocus>("states");
  const [selectedGeo, setSelectedGeo] = useState<string | null>(null);

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

  const rangeStartTime = useMemo(() => {
    const now = Date.now();
    if (dateRange === "30d") return now - 30 * DAY_MS;
    if (dateRange === "90d") return now - 90 * DAY_MS;
    if (dateRange === "12m") return now - 365 * DAY_MS;
    return null;
  }, [dateRange]);

  const filteredMetrics = useMemo(() => {
    return metrics.filter((item) => {
      if (rangeStartTime === null) return true;
      if (!item.placementDate) return false;
      return item.placementTime >= rangeStartTime;
    });
  }, [metrics, rangeStartTime]);

  const geoDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of filteredMetrics) {
      const key = geoFocus === "states" ? item.state : item.city;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const total = filteredMetrics.length || 1;
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({
        name,
        value,
        share: Math.round((value / total) * 100),
      }));
  }, [filteredMetrics, geoFocus]);

  useEffect(() => {
    if (!selectedGeo) return;
    if (!geoDistribution.some((item) => item.name === selectedGeo)) {
      setSelectedGeo(null);
    }
  }, [geoDistribution, selectedGeo]);

  const scopedMetrics = useMemo(() => {
    if (!selectedGeo) return filteredMetrics;
    return filteredMetrics.filter((item) =>
      geoFocus === "states" ? item.state === selectedGeo : item.city === selectedGeo
    );
  }, [filteredMetrics, geoFocus, selectedGeo]);

  const stateOpportunity = useMemo(() => {
    const grouped = new Map<
      string,
      { placements: number; cities: Set<string>; latestPlacementTime: number }
    >();

    for (const item of filteredMetrics) {
      const existing = grouped.get(item.state) ?? {
        placements: 0,
        cities: new Set<string>(),
        latestPlacementTime: 0,
      };
      existing.placements += 1;
      existing.cities.add(item.city);
      if (item.placementTime > existing.latestPlacementTime) {
        existing.latestPlacementTime = item.placementTime;
      }
      grouped.set(item.state, existing);
    }

    const now = Date.now();
    return [...grouped.entries()]
      .map(([state, data]) => ({
        state,
        placements: data.placements,
        citySpread: data.cities.size,
        freshnessDays:
          data.latestPlacementTime > 0
            ? Math.max(0, Math.round((now - data.latestPlacementTime) / DAY_MS))
            : 999,
        density:
          data.cities.size === 0
            ? data.placements
            : Number((data.placements / data.cities.size).toFixed(2)),
      }))
      .sort((a, b) => b.placements - a.placements)
      .slice(0, 16);
  }, [filteredMetrics]);

  const computed = useMemo(() => {
    const totalPlacements = scopedMetrics.length;
    const stateCounts = new Map<string, number>();
    const cityCounts = new Map<string, number>();

    const now = new Date();
    const nowTime = now.getTime();
    let placementsThisMonth = 0;
    let placementsLast30Days = 0;

    const datedMetrics = scopedMetrics.filter(
      (item): item is PlacementMetricItem & { placementDate: Date } =>
        item.placementDate !== null
    );

    for (const item of scopedMetrics) {
      stateCounts.set(item.state, (stateCounts.get(item.state) ?? 0) + 1);
      cityCounts.set(item.city, (cityCounts.get(item.city) ?? 0) + 1);
    }

    for (const item of datedMetrics) {
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

    const monthBuckets = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: `${MONTH_LABELS[date.getMonth()]} '${String(date.getFullYear()).slice(
          -2
        )}`,
        value: 0,
      };
    });
    const monthLookup = new Map(monthBuckets.map((bucket, index) => [bucket.key, index]));
    for (const item of datedMetrics) {
      const monthKey = `${item.placementDate.getFullYear()}-${item.placementDate.getMonth()}`;
      const bucketIndex = monthLookup.get(monthKey);
      if (bucketIndex !== undefined) {
        monthBuckets[bucketIndex].value += 1;
      }
    }
    const monthlyTrend = monthBuckets.map((bucket, index, arr) => {
      const window = arr.slice(Math.max(0, index - 2), index + 1);
      const movingAverage =
        window.reduce((sum, current) => sum + current.value, 0) / window.length;
      return {
        month: bucket.label,
        placements: bucket.value,
        movingAverage: Number(movingAverage.toFixed(1)),
      };
    });

    const weekdayCounts = Array.from({ length: 7 }, () => 0);
    for (const item of datedMetrics) {
      weekdayCounts[item.placementDate.getDay()] += 1;
    }
    const weekdayPulse = WEEKDAY_LABELS.map((label, index) => ({
      day: label,
      placements: weekdayCounts[index],
    }));
    const peakWeekday = [...weekdayPulse].sort((a, b) => b.placements - a.placements)[0];

    const dailyCounts = new Map<string, { count: number; time: number; label: string }>();
    for (const item of datedMetrics) {
      const dayTime = startOfDayTime(item.placementDate);
      const dayDate = new Date(dayTime);
      const dayKey = formatDateKey(dayDate);
      const existing = dailyCounts.get(dayKey);
      if (existing) {
        existing.count += 1;
      } else {
        dailyCounts.set(dayKey, {
          count: 1,
          time: dayTime,
          label: dayDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
        });
      }
    }

    const dailySeries = [...dailyCounts.entries()]
      .map(([key, value]) => ({
        key,
        ...value,
      }))
      .sort((a, b) => a.time - b.time);

    let runningTotal = 0;
    const cumulativeTimelineFull = dailySeries.map((item) => {
      runningTotal += item.count;
      return {
        date: item.label,
        placements: item.count,
        cumulative: runningTotal,
      };
    });
    const cumulativeTimeline =
      cumulativeTimelineFull.length > 120
        ? cumulativeTimelineFull.slice(-120)
        : cumulativeTimelineFull;

    const maxDailyCount = dailySeries.reduce(
      (currentMax, item) => Math.max(currentMax, item.count),
      0
    );
    const today = new Date();
    const activityRibbon = Array.from({ length: 42 }, (_, index) => {
      const reverseIndex = 41 - index;
      const date = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - reverseIndex
      );
      const key = formatDateKey(date);
      const count = dailyCounts.get(key)?.count ?? 0;
      const intensity =
        maxDailyCount === 0
          ? 0
          : Math.min(4, Math.ceil((count / maxDailyCount) * 4));

      return {
        key,
        label: date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        weekday: WEEKDAY_LABELS[date.getDay()],
        count,
        intensity,
      };
    });

    return {
      totalPlacements,
      uniqueStates: stateCounts.size,
      uniqueCities: cityCounts.size,
      placementsThisMonth,
      placementsLast30Days,
      latestPlacementDate: scopedMetrics[0]?.placementDate ?? null,
      latestPlacementRaw: scopedMetrics[0]?.placementDateRaw ?? "",
      topState,
      topCity,
      topStates,
      monthlyTrend,
      weekdayPulse,
      peakWeekday,
      cumulativeTimeline,
      activityRibbon,
    };
  }, [scopedMetrics]);

  const insightCards = useMemo(() => {
    const leadingGeo = geoDistribution[0];
    const secondGeo = geoDistribution[1];
    const concentrationGap =
      leadingGeo && secondGeo ? leadingGeo.share - secondGeo.share : 0;
    const dominantState = stateOpportunity[0];

    return [
      {
        title: "Concentration Signal",
        body: leadingGeo
          ? `${leadingGeo.name} currently represents ${leadingGeo.share}% of placements${
              concentrationGap > 8
                ? ` and leads the next ${geoFocus.slice(0, -1)} by ${concentrationGap}%`
                : "."
            }`
          : "No concentration signal yet.",
      },
      {
        title: "Pace Signal",
        body:
          computed.placementsThisMonth >= computed.placementsLast30Days
            ? "Month-to-date pace is matching or exceeding the last 30-day baseline."
            : "Last 30 days are outpacing this month-to-date cycle; monitor trend momentum.",
      },
      {
        title: "Spread Signal",
        body: dominantState
          ? `${dominantState.state} spans ${dominantState.citySpread} cities with density ${dominantState.density}.`
          : "Not enough data to calculate spread and density.",
      },
    ];
  }, [
    computed.placementsLast30Days,
    computed.placementsThisMonth,
    geoDistribution,
    geoFocus,
    stateOpportunity,
  ]);

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
          />
        )}

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
                  Analytics Studio
                </h2>
                <p className="mt-1 text-xs text-[var(--brand-body)]">
                  Adjust time range and geography, then click chart segments to focus.
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

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGeoFocus("states");
                  setSelectedGeo(null);
                }}
                className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                  geoFocus === "states"
                    ? "border-[var(--brand-secondary)] bg-[rgba(60,159,192,0.16)] text-[var(--brand-primary-deep)]"
                    : "border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-[var(--brand-body)]"
                }`}
              >
                <MapPinned className="mr-1.5 h-3.5 w-3.5" />
                State Focus
              </button>
              <button
                type="button"
                onClick={() => {
                  setGeoFocus("cities");
                  setSelectedGeo(null);
                }}
                className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                  geoFocus === "cities"
                    ? "border-[var(--brand-secondary)] bg-[rgba(60,159,192,0.16)] text-[var(--brand-primary-deep)]"
                    : "border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-[var(--brand-body)]"
                }`}
              >
                <Globe2 className="mr-1.5 h-3.5 w-3.5" />
                City Focus
              </button>
              {selectedGeo ? (
                <button
                  type="button"
                  onClick={() => setSelectedGeo(null)}
                  className="inline-flex h-8 items-center rounded-full border border-[rgba(255,87,0,0.4)] bg-[rgba(255,87,0,0.12)] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-accent)] transition-colors hover:bg-[rgba(255,87,0,0.18)]"
                >
                  <Filter className="mr-1.5 h-3.5 w-3.5" />
                  Clear {geoFocus === "states" ? "State" : "City"}: {selectedGeo}
                </button>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {geoDistribution.slice(0, 8).map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() =>
                    setSelectedGeo((current) =>
                      current === item.name ? null : item.name
                    )
                  }
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    selectedGeo === item.name
                      ? "border-[var(--brand-primary)] bg-[rgba(0,94,184,0.12)] text-[var(--brand-primary-deep)]"
                      : "border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] text-[var(--brand-body)] hover:border-[var(--brand-primary)]"
                  }`}
                >
                  <span>{item.name}</span>
                  <span className="rounded-full bg-[rgba(0,53,84,0.08)] px-1.5 py-0.5 text-[10px]">
                    {item.value}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Scoped Placements"
              value={computed.totalPlacements.toLocaleString()}
              detail={
                selectedGeo
                  ? `${geoFocus === "states" ? "State" : "City"} filter active`
                  : "Current analytics scope"
              }
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
              label="Top State Volume"
              value={computed.topState ? computed.topState[1] : 0}
              detail={
                computed.topState
                  ? `${computed.topState[0]} has the most placements`
                  : "No state data"
              }
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
              icon={TrendingUp}
            />
            <MetricCard
              label="Data Health"
              value={metricsError ? "Issue" : "OK"}
              detail={metricsError ? metricsError : "Metrics endpoint responding"}
              icon={Activity}
            />
          </section>

          {metricsError ? (
            <section className="mt-4 rounded-2xl border border-[rgba(201,18,41,0.42)] bg-[rgba(201,18,41,0.1)] px-5 py-4 text-sm font-semibold text-[var(--brand-danger)]">
              {metricsError}
            </section>
          ) : null}

          <section className="mt-5 grid gap-4 xl:grid-cols-12">
            <article className="xl:col-span-8 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[var(--brand-ink)]">
                    Placement Momentum
                  </h2>
                  <p className="mt-1 text-xs text-[var(--brand-muted)]">
                    Monthly volume with moving average for the active filter scope.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(0,94,184,0.28)] bg-[rgba(0,94,184,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-primary-deep)]">
                  <TrendingUp className="h-3.5 w-3.5" />
                  12-Month Lens
                </span>
              </div>
              <div className="mt-4 h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={computed.monthlyTrend}>
                    <defs>
                      <linearGradient id="placementGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#005EB8" stopOpacity={0.44} />
                        <stop offset="100%" stopColor="#005EB8" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,125,131,0.24)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5f6f7a" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#5f6f7a" }} allowDecimals={false} />
                    <RechartsTooltip content={<DashboardTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="placements"
                      name="Placements"
                      stroke="#005EB8"
                      fill="url(#placementGradient)"
                      strokeWidth={2.4}
                    />
                    <Line
                      type="monotone"
                      dataKey="movingAverage"
                      name="3-Mo Avg"
                      stroke="#FF5700"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="xl:col-span-4 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">
                Geographic Concentration
              </h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Top {geoFocus} share for selected time range.
              </p>
              <div className="mt-4 h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={geoDistribution.slice(0, 6)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={84}
                      paddingAngle={3}
                      onClick={(entry) => {
                        const pieEntry = entry as { name?: string };
                        const pieName = pieEntry.name;
                        if (!pieName) return;
                        setSelectedGeo((current) =>
                          current === pieName ? null : pieName
                        );
                      }}
                    >
                      {geoDistribution.slice(0, 6).map((entry, index) => (
                        <Cell
                          key={`geo-cell-${entry.name}`}
                          fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                          stroke={
                            selectedGeo === entry.name
                              ? "rgba(0,53,84,0.9)"
                              : "rgba(255,255,255,0.86)"
                          }
                          strokeWidth={selectedGeo === entry.name ? 2 : 1}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<DashboardTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-2">
                {geoDistribution.slice(0, 4).map((item, index) => (
                  <button
                    key={`${item.name}-legend`}
                    type="button"
                    onClick={() =>
                      setSelectedGeo((current) =>
                        current === item.name ? null : item.name
                      )
                    }
                    className="flex w-full items-center justify-between rounded-lg border border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] px-2.5 py-2 text-xs font-semibold text-[var(--brand-body)] transition-colors hover:border-[var(--brand-primary)]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_PALETTE[index % CHART_PALETTE.length],
                        }}
                      />
                      {item.name}
                    </span>
                    <span>
                      {item.value} ({item.share}%)
                    </span>
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-12">
            <article className="xl:col-span-5 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">
                Weekday Pulse
              </h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Distribution of placement events by weekday.
              </p>
              <div className="mt-4 h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={computed.weekdayPulse}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,125,131,0.24)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#5f6f7a" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#5f6f7a" }} allowDecimals={false} />
                    <RechartsTooltip content={<DashboardTooltip />} />
                    <Bar dataKey="placements" fill="rgba(60,159,192,0.82)" radius={[6, 6, 0, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs font-semibold text-[var(--brand-body)]">
                Peak weekday: {computed.peakWeekday?.day ?? "N/A"} (
                {computed.peakWeekday?.placements ?? 0})
              </p>
            </article>

            <article className="xl:col-span-7 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">
                Cumulative Growth Curve
              </h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Running cumulative placements for the active filter scope.
              </p>
              <div className="mt-4 h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={computed.cumulativeTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,125,131,0.24)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5f6f7a" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#5f6f7a" }} allowDecimals={false} />
                    <RechartsTooltip content={<DashboardTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      name="Cumulative"
                      stroke="#00903F"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="placements"
                      name="Daily"
                      stroke="#FF5700"
                      strokeWidth={1.8}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-12">
            <article className="xl:col-span-7 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">
                State Opportunity Matrix
              </h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Compare placement volume vs city spread, with bubble size based on freshness.
              </p>
              <div className="mt-4 h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,125,131,0.24)" />
                    <XAxis
                      type="number"
                      dataKey="citySpread"
                      name="City Spread"
                      tick={{ fontSize: 11, fill: "#5f6f7a" }}
                    />
                    <YAxis
                      type="number"
                      dataKey="placements"
                      name="Placements"
                      tick={{ fontSize: 11, fill: "#5f6f7a" }}
                      allowDecimals={false}
                    />
                    <ZAxis
                      type="number"
                      dataKey="freshnessDays"
                      range={[70, 320]}
                      name="Freshness (days)"
                    />
                    <RechartsTooltip content={<DashboardTooltip />} cursor={{ strokeDasharray: "4 4" }} />
                    <Scatter
                      name="States"
                      data={stateOpportunity}
                      fill="rgba(0,94,184,0.72)"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="xl:col-span-5 rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="text-base font-bold text-[var(--brand-ink)]">
                Activity Ribbon
              </h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Last 42 days at a glance. Color intensity tracks daily placement volume.
              </p>
              <div
                className="mt-4 grid gap-1.5"
                style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
              >
                {computed.activityRibbon.map((item) => (
                  <div
                    key={item.key}
                    title={`${item.weekday}, ${item.label}: ${item.count} placement${item.count === 1 ? "" : "s"}`}
                    className="h-4 rounded-[4px] border border-[rgba(255,255,255,0.62)]"
                    style={{ backgroundColor: getHeatCellColor(item.intensity) }}
                  />
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {insightCards.map((insight) => (
                  <article
                    key={insight.title}
                    className="rounded-lg border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.82)] px-3 py-2.5"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--brand-primary-deep)]">
                      {insight.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--brand-body)]">
                      {insight.body}
                    </p>
                  </article>
                ))}
              </div>
            </article>
          </section>

          <section className="mt-5 grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
            <article className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_10px_22px_rgba(0,53,84,0.08)]">
              <h2 className="inline-flex items-center gap-2 text-base font-bold text-[var(--brand-ink)]">
                <Compass className="h-4 w-4 text-[var(--brand-primary)]" />
                Top States Snapshot
              </h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Share of scoped placements by state.
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
                Placement Explorer Table
              </h2>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                Detailed records for the current filters and chart selection.
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
              ) : scopedMetrics.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-[var(--brand-border)] bg-[rgba(246,247,248,0.85)] px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-[var(--brand-body)]">
                    No placements in current scope.
                  </p>
                  <p className="mt-1 text-xs text-[var(--brand-muted)]">
                    Adjust time range or clear the location filter.
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
                      {scopedMetrics.slice(0, 18).map((item) => (
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
