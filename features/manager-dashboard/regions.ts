"use client";

import { UNKNOWN_STATE } from "@/features/dashboard/state-normalization";

export type RegionName = "Northeast" | "Midwest" | "South" | "West" | "Unknown";

export const REGION_ORDER: RegionName[] = [
  "Northeast",
  "Midwest",
  "South",
  "West",
  "Unknown",
];

const STATE_TO_REGION: Record<string, Exclude<RegionName, "Unknown">> = {
  // Northeast
  Connecticut: "Northeast",
  Maine: "Northeast",
  Massachusetts: "Northeast",
  "New Hampshire": "Northeast",
  "Rhode Island": "Northeast",
  Vermont: "Northeast",
  "New Jersey": "Northeast",
  "New York": "Northeast",
  Pennsylvania: "Northeast",

  // Midwest
  Illinois: "Midwest",
  Indiana: "Midwest",
  Michigan: "Midwest",
  Ohio: "Midwest",
  Wisconsin: "Midwest",
  Iowa: "Midwest",
  Kansas: "Midwest",
  Minnesota: "Midwest",
  Missouri: "Midwest",
  Nebraska: "Midwest",
  "North Dakota": "Midwest",
  "South Dakota": "Midwest",

  // South
  Delaware: "South",
  Florida: "South",
  Georgia: "South",
  Maryland: "South",
  "North Carolina": "South",
  "South Carolina": "South",
  Virginia: "South",
  "District of Columbia": "South",
  "West Virginia": "South",
  Alabama: "South",
  Kentucky: "South",
  Mississippi: "South",
  Tennessee: "South",
  Arkansas: "South",
  Louisiana: "South",
  Oklahoma: "South",
  Texas: "South",

  // West
  Arizona: "West",
  Colorado: "West",
  Idaho: "West",
  Montana: "West",
  Nevada: "West",
  "New Mexico": "West",
  Utah: "West",
  Wyoming: "West",
  Alaska: "West",
  California: "West",
  Hawaii: "West",
  Oregon: "West",
  Washington: "West",
};

export function regionForState(state: string): RegionName {
  if (!state || state === UNKNOWN_STATE) {
    return "Unknown";
  }

  return STATE_TO_REGION[state] ?? "Unknown";
}

