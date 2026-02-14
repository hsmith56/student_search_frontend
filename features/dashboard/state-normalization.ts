const UNKNOWN_STATE = "Unknown";

const FULL_STATE_NAMES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
  "District of Columbia",
] as const;

export const ALL_STATE_NAMES = FULL_STATE_NAMES;

const ABBREVIATION_TO_STATE: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

const NAME_LOOKUP = Object.fromEntries(
  FULL_STATE_NAMES.map((state) => [normalizeStateToken(state), state])
) as Record<string, string>;

const INVALID_TOKENS = new Set([
  "",
  "unknown",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
  "-",
  "--",
]);

function normalizeStateToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

export function normalizeState(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return UNKNOWN_STATE;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return UNKNOWN_STATE;
  }

  if (INVALID_TOKENS.has(normalized.toLowerCase())) {
    return UNKNOWN_STATE;
  }

  const upper = normalized.toUpperCase().replace(/\./g, "");
  if (ABBREVIATION_TO_STATE[upper]) {
    return ABBREVIATION_TO_STATE[upper];
  }

  const fullState = NAME_LOOKUP[normalizeStateToken(normalized)];
  return fullState ?? UNKNOWN_STATE;
}

export function isUnknownState(state: string): boolean {
  return state === UNKNOWN_STATE;
}

export { UNKNOWN_STATE };
