"use client";

import type { PlacementMetricItem } from "@/features/dashboard/types";
import type { RegionName } from "@/features/manager-dashboard/regions";

export type SeriesGranularity = "daily" | "weekly";

export type TrendPoint = {
  periodKey: string;
  periodLabel: string;
  placements: number;
};

export type RegionTotalRow = {
  region: RegionName;
  placements: number;
  share: number;
};

export type StateCountRow = {
  state: string;
  region: RegionName;
  placements: number;
  share: number;
};

export type CityHotspotRow = {
  city: string;
  state: string;
  region: RegionName;
  label: string;
  placements: number;
  share: number;
};

export type StaleStateRow = {
  state: string;
  region: RegionName;
  totalPlacements: number;
  daysSinceLastPlacement: number;
  lastPlacementLabel: string;
};

export type CoverageStateRow = {
  state: string;
  placements: number;
};

export type CoverageRegionRow = {
  region: RegionName;
  totalPlacements: number;
  states: CoverageStateRow[];
};

export type ManagerKpis = {
  scopedPlacements: number;
  placementsLast7d: number;
  avgPlacementsPerDay: number;
  activeStates: number;
  activeRegions: number;
  topState: string | null;
  topCity: string | null;
  untappedStatesCount: number;
  latestPlacementDate: Date | null;
  latestPlacementRaw: string;
  unknownStateRecords: number;
  invalidDateRecords: number;
};

export type ManagerDashboardAnalytics = {
  scopedMetrics: PlacementMetricItem[];
  trend: TrendPoint[];
  regionTotals: RegionTotalRow[];
  topStates: StateCountRow[];
  topCities: CityHotspotRow[];
  coverage: CoverageRegionRow[];
  untappedStates: string[];
  staleStates90d: StaleStateRow[];
  kpis: ManagerKpis;
};

