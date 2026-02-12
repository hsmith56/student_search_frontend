export type DateRange = "30d" | "90d" | "12m" | "all";

export type PlacementMetricRecord = {
  app_id?: number | string;
  city?: string | number;
  state?: string | number;
  placementDate?: string | number;
};

export type PlacementMetricItem = {
  appId: number;
  city: string;
  state: string;
  placementDateRaw: string;
  placementDate: Date | null;
  placementTime: number;
};

export type StateTotalRow = {
  state: string;
  placements: number;
  share: number;
};

export type StateGrowthPoint = {
  state: string;
  recentPlacements: number;
  priorPlacements: number;
  growthPct: number;
  growthDelta: number;
  totalPlacements: number;
};

export type StateWeeklyRow = {
  weekLabel: string;
  weekKey: string;
  [state: string]: string | number;
};

export type StateParetoRow = {
  state: string;
  placements: number;
  share: number;
  cumulativeShare: number;
};

export type StateSeasonalityCell = {
  state: string;
  stateIndex: number;
  monthLabel: string;
  monthIndex: number;
  placements: number;
  intensity: number;
};

export type RecencyRiskBand = "Healthy" | "Watch" | "At Risk";

export type StateRecencyRow = {
  state: string;
  daysSinceLastPlacement: number;
  riskBand: RecencyRiskBand;
  totalPlacements: number;
  lastPlacementLabel: string;
};

export type DashboardKpis = {
  scopedPlacements: number;
  activeStates: number;
  topStateName: string | null;
  topStateShare: number;
  medianPlacementsPerState: number;
  staleStateCount30d: number;
  latestPlacementDate: Date | null;
  latestPlacementRaw: string;
  dataHealth: "OK" | "Issue";
};

export type DashboardAnalytics = {
  filteredMetrics: PlacementMetricItem[];
  scopedMetrics: PlacementMetricItem[];
  stateTotals: StateTotalRow[];
  statePace: Array<{ state: string; placements30d: number }>;
  stateGrowth30d: StateGrowthPoint[];
  stateWeeklySeries16w: StateWeeklyRow[];
  weeklySeriesStates: string[];
  statePareto: StateParetoRow[];
  stateSeasonality12m: StateSeasonalityCell[];
  stateSeasonalityStates: string[];
  stateSeasonalityMonths: string[];
  stateRecencyRisk: StateRecencyRow[];
  cityDrilldown: Array<{ city: string; placements: number }>;
  kpis: DashboardKpis;
};
