"use client";

import type { DateRange, PlacementMetricItem } from "@/features/dashboard/types";
import { ALL_STATE_NAMES, UNKNOWN_STATE } from "@/features/dashboard/state-normalization";
import {
  REGION_ORDER,
  regionForState,
  type RegionName,
} from "@/features/manager-dashboard/regions";
import type {
  CityHotspotRow,
  CoverageRegionRow,
  ManagerDashboardAnalytics,
  RegionTotalRow,
  SeriesGranularity,
  StateCountRow,
  StaleStateRow,
  TrendPoint,
} from "@/features/manager-dashboard/types";

const DAY_MS = 24 * 60 * 60 * 1000;
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

function getRangeStartTime(dateRange: DateRange, nowTime: number): number | null {
  if (dateRange === "30d") return nowTime - 30 * DAY_MS;
  if (dateRange === "90d") return nowTime - 90 * DAY_MS;
  if (dateRange === "12m") return nowTime - 365 * DAY_MS;
  return null;
}

function startOfWeekTime(date: Date): number {
  const dayOfWeek = date.getDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - daysFromMonday
  ).getTime();
}

function toYmdKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatShortDate(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

function formatLongDate(date: Date | null, fallbackRaw: string): string {
  if (!date) {
    return fallbackRaw || "Unknown date";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function computeAveragePerDay(
  scopedPlacements: number,
  rangeStartTime: number | null,
  nowTime: number,
  earliestScopedPlacementTime: number | null
): number {
  let dayCount = 0;

  if (rangeStartTime !== null) {
    dayCount = Math.max(1, Math.ceil((nowTime - rangeStartTime) / DAY_MS));
  } else if (earliestScopedPlacementTime !== null) {
    dayCount = Math.max(1, Math.ceil((nowTime - earliestScopedPlacementTime) / DAY_MS));
  } else {
    dayCount = 1;
  }

  return Number((scopedPlacements / dayCount).toFixed(2));
}

function buildTrendSeries(
  datedMetrics: Array<PlacementMetricItem & { placementDate: Date }>,
  startTime: number,
  endTime: number,
  granularity: SeriesGranularity
): TrendPoint[] {
  if (datedMetrics.length === 0) {
    return [];
  }

  if (granularity === "weekly") {
    const bucketCounts = new Map<number, number>();
    for (const item of datedMetrics) {
      const weekStart = startOfWeekTime(item.placementDate);
      bucketCounts.set(weekStart, (bucketCounts.get(weekStart) ?? 0) + 1);
    }

    const startWeek = startOfWeekTime(new Date(startTime));
    const endWeek = startOfWeekTime(new Date(endTime));
    const weeks: TrendPoint[] = [];

    for (let time = startWeek; time <= endWeek; time += 7 * DAY_MS) {
      const date = new Date(time);
      weeks.push({
        periodKey: String(time),
        periodLabel: formatShortDate(date),
        placements: bucketCounts.get(time) ?? 0,
      });
    }

    return weeks;
  }

  const bucketCounts = new Map<string, number>();
  for (const item of datedMetrics) {
    const key = toYmdKey(item.placementDate);
    bucketCounts.set(key, (bucketCounts.get(key) ?? 0) + 1);
  }

  const startDate = new Date(startTime);
  const startMidnight = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const endDate = new Date(endTime);
  const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  const days: TrendPoint[] = [];
  for (let time = startMidnight.getTime(); time <= endMidnight.getTime(); time += DAY_MS) {
    const date = new Date(time);
    const key = toYmdKey(date);
    days.push({
      periodKey: key,
      periodLabel: formatShortDate(date),
      placements: bucketCounts.get(key) ?? 0,
    });
  }

  return days;
}

function sortedRegionTotals(
  regionCounts: Map<RegionName, number>,
  totalPlacements: number
): RegionTotalRow[] {
  return REGION_ORDER.map((region) => {
    const placements = regionCounts.get(region) ?? 0;
    return {
      region,
      placements,
      share:
        totalPlacements === 0
          ? 0
          : Number(((placements / totalPlacements) * 100).toFixed(1)),
    };
  }).filter((row) => row.placements > 0 || row.region !== "Unknown");
}

export function buildManagerDashboardAnalytics(args: {
  metrics: PlacementMetricItem[];
  dateRange: DateRange;
  granularity: SeriesGranularity;
  includeUnknownStates: boolean;
}): ManagerDashboardAnalytics {
  const { metrics, dateRange, granularity, includeUnknownStates } = args;
  const nowTime = Date.now();
  const rangeStartTime = getRangeStartTime(dateRange, nowTime);

  const scopedMetrics = metrics.filter((item) => {
    if (!includeUnknownStates && item.state === UNKNOWN_STATE) {
      return false;
    }

    if (rangeStartTime === null) return true;
    if (!item.placementDate) return false;
    return item.placementTime >= rangeStartTime;
  });

  const datedScopedMetrics = scopedMetrics.filter(
    (item): item is PlacementMetricItem & { placementDate: Date } => item.placementDate !== null
  );

  const invalidDateRecords = scopedMetrics.length - datedScopedMetrics.length;
  const unknownStateRecords = scopedMetrics.filter((item) => item.state === UNKNOWN_STATE).length;

  const earliestTime = datedScopedMetrics.reduce<number | null>((min, item) => {
    if (item.placementTime <= 0) return min;
    if (min === null) return item.placementTime;
    return Math.min(min, item.placementTime);
  }, null);

  const latestPlacement = datedScopedMetrics.reduce<PlacementMetricItem | null>((latest, item) => {
    if (!latest) return item;
    if (item.placementTime > latest.placementTime) return item;
    return latest;
  }, null);

  const scopedPlacements = scopedMetrics.length;
  const placementsLast7d = datedScopedMetrics.filter(
    (item) => item.placementTime >= nowTime - 7 * DAY_MS
  ).length;

  const avgPlacementsPerDay = computeAveragePerDay(
    scopedPlacements,
    rangeStartTime,
    nowTime,
    earliestTime
  );

  const stateCounts = new Map<string, number>();
  const cityCounts = new Map<string, { city: string; state: string; region: RegionName; count: number }>();
  const regionCounts = new Map<RegionName, number>();

  for (const item of scopedMetrics) {
    stateCounts.set(item.state, (stateCounts.get(item.state) ?? 0) + 1);

    const region = regionForState(item.state);
    regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1);

    const cityKey = `${item.city}|${item.state}`;
    const existing = cityCounts.get(cityKey);
    if (existing) {
      existing.count += 1;
    } else {
      cityCounts.set(cityKey, {
        city: item.city,
        state: item.state,
        region,
        count: 1,
      });
    }
  }

  const activeStates = [...stateCounts.entries()].filter(
    ([state, count]) => count > 0 && state !== UNKNOWN_STATE
  ).length;
  const activeRegions = [...regionCounts.entries()].filter(
    ([region, count]) => count > 0 && region !== "Unknown"
  ).length;

  const topStates: StateCountRow[] = [...stateCounts.entries()]
    .map(([state, placements]) => ({
      state,
      region: regionForState(state),
      placements,
      share:
        scopedPlacements === 0
          ? 0
          : Number(((placements / scopedPlacements) * 100).toFixed(1)),
    }))
    .filter((row) => includeUnknownStates || row.state !== UNKNOWN_STATE)
    .sort((a, b) => b.placements - a.placements);

  const topCities: CityHotspotRow[] = [...cityCounts.values()]
    .map((row) => ({
      city: row.city,
      state: row.state,
      region: row.region,
      label: `${row.city}, ${row.state}`,
      placements: row.count,
      share:
        scopedPlacements === 0 ? 0 : Number(((row.count / scopedPlacements) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.placements - a.placements);

  const regionTotals = sortedRegionTotals(regionCounts, scopedPlacements);

  const placementsByState = new Map<string, number>();
  for (const row of topStates) {
    placementsByState.set(row.state, row.placements);
  }

  const untappedStates = ALL_STATE_NAMES.filter((state) => (placementsByState.get(state) ?? 0) === 0);

  const coverageByRegion = new Map<RegionName, CoverageRegionRow>();
  for (const region of REGION_ORDER) {
    coverageByRegion.set(region, {
      region,
      totalPlacements: 0,
      states: [],
    });
  }

  for (const state of ALL_STATE_NAMES) {
    const region = regionForState(state);
    const placements = placementsByState.get(state) ?? 0;
    const bucket = coverageByRegion.get(region);
    if (!bucket) continue;
    bucket.states.push({ state, placements });
    bucket.totalPlacements += placements;
  }

  const coverage = REGION_ORDER.map((region) => coverageByRegion.get(region)!)
    .filter((row) => row.states.length > 0 && row.region !== "Unknown")
    .map((row) => ({
      ...row,
      states: [...row.states].sort((a, b) => b.placements - a.placements),
    }));

  const lastPlacementByState = new Map<string, { lastTime: number; lastRaw: string; total: number }>();
  for (const item of metrics) {
    if (item.state === UNKNOWN_STATE) continue;
    const existing = lastPlacementByState.get(item.state);
    const total = (existing?.total ?? 0) + 1;
    if (item.placementTime > (existing?.lastTime ?? 0)) {
      lastPlacementByState.set(item.state, {
        lastTime: item.placementTime,
        lastRaw: item.placementDateRaw,
        total,
      });
    } else {
      lastPlacementByState.set(item.state, {
        lastTime: existing?.lastTime ?? 0,
        lastRaw: existing?.lastRaw ?? item.placementDateRaw,
        total,
      });
    }
  }

  const staleStates90d: StaleStateRow[] = [...lastPlacementByState.entries()]
    .map(([state, info]) => {
      const daysSinceLastPlacement =
        info.lastTime > 0 ? Math.floor((nowTime - info.lastTime) / DAY_MS) : 9999;
      const lastPlacementLabel =
        info.lastTime > 0
          ? formatLongDate(new Date(info.lastTime), info.lastRaw)
          : "No dated records";

      return {
        state,
        region: regionForState(state),
        totalPlacements: info.total,
        daysSinceLastPlacement,
        lastPlacementLabel,
      };
    })
    .filter((row) => row.daysSinceLastPlacement >= 90)
    .sort((a, b) => b.daysSinceLastPlacement - a.daysSinceLastPlacement);

  const seriesStartTime = rangeStartTime ?? (earliestTime ?? nowTime - 30 * DAY_MS);
  const trend = buildTrendSeries(datedScopedMetrics, seriesStartTime, nowTime, granularity);

  const topState = topStates.find((row) => row.state !== UNKNOWN_STATE)?.state ?? null;
  const topCity = topCities[0]?.label ?? null;

  return {
    scopedMetrics,
    trend,
    regionTotals,
    topStates,
    topCities,
    coverage,
    untappedStates,
    staleStates90d,
    kpis: {
      scopedPlacements,
      placementsLast7d,
      avgPlacementsPerDay,
      activeStates,
      activeRegions,
      topState,
      topCity,
      untappedStatesCount: untappedStates.length,
      latestPlacementDate: latestPlacement?.placementDate ?? null,
      latestPlacementRaw: latestPlacement?.placementDateRaw ?? "",
      unknownStateRecords,
      invalidDateRecords,
    },
  };
}

