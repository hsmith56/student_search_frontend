import type {
  DashboardAnalytics,
  DateRange,
  PlacementMetricItem,
  RecencyRiskBand,
  StateParetoRow,
  StateSeasonalityCell,
  StateWeeklyRow,
} from "@/features/dashboard/types";

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

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function toWeekKey(time: number): string {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function getRiskBand(daysSinceLastPlacement: number): RecencyRiskBand {
  if (daysSinceLastPlacement <= 14) return "Healthy";
  if (daysSinceLastPlacement <= 30) return "Watch";
  return "At Risk";
}

function formatPlacementDate(value: Date | null): string {
  if (!value) return "No dated records";
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function percentileMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Number(((sorted[middle - 1] + sorted[middle]) / 2).toFixed(1));
}

function clampGrowth(value: number): number {
  return Math.max(-100, Math.min(300, value));
}

export function buildDashboardAnalytics(
  metrics: PlacementMetricItem[],
  dateRange: DateRange,
  selectedState: string | null
): DashboardAnalytics {
  const nowTime = Date.now();
  const rangeStartTime = getRangeStartTime(dateRange, nowTime);

  const filteredMetrics = metrics.filter((item) => {
    if (rangeStartTime === null) return true;
    if (!item.placementDate) return false;
    return item.placementTime >= rangeStartTime;
  });

  const scopedMetrics = selectedState
    ? filteredMetrics.filter((item) => item.state === selectedState)
    : filteredMetrics;

  const datedScopedMetrics = scopedMetrics.filter(
    (item): item is PlacementMetricItem & { placementDate: Date } =>
      item.placementDate !== null
  );

  const stateCounts = new Map<string, number>();
  const stateLatestPlacement = new Map<string, number>();
  for (const item of scopedMetrics) {
    stateCounts.set(item.state, (stateCounts.get(item.state) ?? 0) + 1);
    if (item.placementTime > 0) {
      const currentLatest = stateLatestPlacement.get(item.state) ?? 0;
      if (item.placementTime > currentLatest) {
        stateLatestPlacement.set(item.state, item.placementTime);
      }
    }
  }

  const totalScopedPlacements = scopedMetrics.length;
  const stateTotals = [...stateCounts.entries()]
    .map(([state, placements]) => ({
      state,
      placements,
      share:
        totalScopedPlacements === 0
          ? 0
          : Number(((placements / totalScopedPlacements) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.placements - a.placements);

  const recentStart = nowTime - 30 * DAY_MS;
  const priorStart = nowTime - 60 * DAY_MS;
  const recentByState = new Map<string, number>();
  const priorByState = new Map<string, number>();

  for (const item of datedScopedMetrics) {
    if (item.placementTime >= recentStart) {
      recentByState.set(item.state, (recentByState.get(item.state) ?? 0) + 1);
    } else if (item.placementTime >= priorStart && item.placementTime < recentStart) {
      priorByState.set(item.state, (priorByState.get(item.state) ?? 0) + 1);
    }
  }

  const statePace = stateTotals
    .map((row) => ({
      state: row.state,
      placements30d: recentByState.get(row.state) ?? 0,
    }))
    .sort((a, b) => b.placements30d - a.placements30d);

  const stateGrowth30d = stateTotals
    .map((row) => {
      const recentPlacements = recentByState.get(row.state) ?? 0;
      const priorPlacements = priorByState.get(row.state) ?? 0;
      const growthDelta = recentPlacements - priorPlacements;
      const growthPct =
        priorPlacements === 0
          ? recentPlacements === 0
            ? 0
            : 100
          : clampGrowth((growthDelta / priorPlacements) * 100);

      return {
        state: row.state,
        recentPlacements,
        priorPlacements,
        growthPct: Number(growthPct.toFixed(1)),
        growthDelta,
        totalPlacements: row.placements,
      };
    })
    .sort((a, b) => b.recentPlacements - a.recentPlacements);

  const weeklySeriesStates = stateTotals.slice(0, 5).map((row) => row.state);
  const stateSet = new Set(weeklySeriesStates);
  const currentWeekStart = startOfWeekTime(new Date(nowTime));
  const weekStarts = Array.from({ length: 16 }, (_, index) => {
    const offset = 15 - index;
    return currentWeekStart - offset * 7 * DAY_MS;
  });
  const oldestWeekStart = weekStarts[0] ?? currentWeekStart;
  const weekIndexLookup = new Map(weekStarts.map((time, index) => [time, index]));

  const stateWeeklySeries16w: StateWeeklyRow[] = weekStarts.map((time) => {
    const date = new Date(time);
    const row: StateWeeklyRow = {
      weekKey: toWeekKey(time),
      weekLabel: `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`,
    };
    for (const state of weeklySeriesStates) {
      row[state] = 0;
    }
    return row;
  });

  for (const item of datedScopedMetrics) {
    if (!stateSet.has(item.state)) continue;
    if (item.placementTime < oldestWeekStart) continue;
    const weekStart = startOfWeekTime(item.placementDate);
    const weekIndex = weekIndexLookup.get(weekStart);
    if (weekIndex === undefined) continue;

    const row = stateWeeklySeries16w[weekIndex];
    const currentCount = row[item.state];
    row[item.state] = typeof currentCount === "number" ? currentCount + 1 : 1;
  }

  let runningPlacements = 0;
  const statePareto: StateParetoRow[] = stateTotals.slice(0, 12).map((row) => {
    runningPlacements += row.placements;
    return {
      state: row.state,
      placements: row.placements,
      share: row.share,
      cumulativeShare:
        totalScopedPlacements === 0
          ? 0
          : Number(((runningPlacements / totalScopedPlacements) * 100).toFixed(1)),
    };
  });

  const seasonalityStates = stateTotals.slice(0, 15).map((row) => row.state);
  const seasonalityStateSet = new Set(seasonalityStates);
  const nowDate = new Date(nowTime);
  const monthBuckets = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(nowDate.getFullYear(), nowDate.getMonth() - (11 - index), 1);
    return {
      monthKey: toMonthKey(date),
      monthLabel: `${MONTH_LABELS[date.getMonth()]} '${String(date.getFullYear()).slice(-2)}`,
    };
  });
  const monthLookup = new Map(monthBuckets.map((bucket, index) => [bucket.monthKey, index]));
  const seasonalityCounts = new Map<string, number>();

  for (const item of datedScopedMetrics) {
    if (!seasonalityStateSet.has(item.state)) continue;
    const monthIndex = monthLookup.get(toMonthKey(item.placementDate));
    if (monthIndex === undefined) continue;
    const key = `${item.state}|${monthIndex}`;
    seasonalityCounts.set(key, (seasonalityCounts.get(key) ?? 0) + 1);
  }

  let seasonalityMax = 0;
  for (const value of seasonalityCounts.values()) {
    seasonalityMax = Math.max(seasonalityMax, value);
  }

  const stateSeasonality12m: StateSeasonalityCell[] = [];
  seasonalityStates.forEach((state, stateIndex) => {
    monthBuckets.forEach((month, monthIndex) => {
      const placements = seasonalityCounts.get(`${state}|${monthIndex}`) ?? 0;
      stateSeasonality12m.push({
        state,
        stateIndex,
        monthLabel: month.monthLabel,
        monthIndex,
        placements,
        intensity:
          seasonalityMax === 0 ? 0 : Number((placements / seasonalityMax).toFixed(3)),
      });
    });
  });

  const stateRecencyRisk = stateTotals
    .map((row) => {
      const latestTime = stateLatestPlacement.get(row.state) ?? 0;
      const latestDate = latestTime > 0 ? new Date(latestTime) : null;
      const daysSinceLastPlacement =
        latestTime > 0 ? Math.max(0, Math.round((nowTime - latestTime) / DAY_MS)) : 999;

      return {
        state: row.state,
        daysSinceLastPlacement,
        riskBand: getRiskBand(daysSinceLastPlacement),
        totalPlacements: row.placements,
        lastPlacementLabel: formatPlacementDate(latestDate),
      };
    })
    .sort((a, b) => b.daysSinceLastPlacement - a.daysSinceLastPlacement)
    .slice(0, 15);

  const selectedStateCityCounts = new Map<string, number>();
  if (selectedState) {
    for (const item of filteredMetrics) {
      if (item.state !== selectedState) continue;
      selectedStateCityCounts.set(
        item.city,
        (selectedStateCityCounts.get(item.city) ?? 0) + 1
      );
    }
  }
  const cityDrilldown = [...selectedStateCityCounts.entries()]
    .map(([city, placements]) => ({ city, placements }))
    .sort((a, b) => b.placements - a.placements)
    .slice(0, 10);

  const latestScopedItem = scopedMetrics.reduce<PlacementMetricItem | null>((latest, item) => {
    if (!latest) return item;
    return item.placementTime > latest.placementTime ? item : latest;
  }, null);

  const staleStateCount30d = stateTotals.filter((row) => {
    const latestTime = stateLatestPlacement.get(row.state) ?? 0;
    if (latestTime === 0) return true;
    return nowTime - latestTime > 30 * DAY_MS;
  }).length;

  return {
    filteredMetrics,
    scopedMetrics,
    stateTotals,
    statePace,
    stateGrowth30d,
    stateWeeklySeries16w,
    weeklySeriesStates,
    statePareto,
    stateSeasonality12m,
    stateSeasonalityStates: seasonalityStates,
    stateSeasonalityMonths: monthBuckets.map((month) => month.monthLabel),
    stateRecencyRisk,
    cityDrilldown,
    kpis: {
      scopedPlacements: totalScopedPlacements,
      activeStates: stateTotals.length,
      topStateName: stateTotals[0]?.state ?? null,
      topStateShare: stateTotals[0]?.share ?? 0,
      medianPlacementsPerState: percentileMedian(stateTotals.map((row) => row.placements)),
      staleStateCount30d,
      latestPlacementDate: latestScopedItem?.placementDate ?? null,
      latestPlacementRaw: latestScopedItem?.placementDateRaw ?? "",
      dataHealth: "OK",
    },
  };
}
