import type { LucideIcon } from "lucide-react";

export type ViewMode = "card" | "compact";

export type Filters = {
  country_of_origin: string[];
  interests: string;
  state: string;
  gender_male: boolean;
  gender_female: boolean;
  pets_in_home: string;
  program_types: string[];
  early_placement: string;
  grants_options: string[];
  hasVideo: boolean;
  gpa: string;
  adjusted_age: string;
  religiousPractice: string;
  double_placement: string;
  single_placement: string;
  status?: string;
  statusOptions: string[];
};

export const defaultFilters: Filters = {
  country_of_origin: [],
  interests: "all",
  state: "all",
  gender_male: false,
  gender_female: false,
  pets_in_home: "all",
  program_types: [],
  early_placement: "all",
  grants_options: [],
  hasVideo: false,
  gpa: "all",
  adjusted_age: "all",
  religiousPractice: "all",
  double_placement: "all",
  single_placement: "all",
  statusOptions: ["Allocated"],
};

export type StudentRecord = {
  pax_id: string | number;
  app_id?: string | number;
  first_name?: string;
  gender_desc?: string | string[];
  usahsid?: string | number;
  country?: string;
  selected_interests?: string[];
  states?: string[];
  gpa?: string | number;
  applying_to_grade?: string | number;
  adjusted_age?: string | number;
  english_score?: string | number;
  program_type?: string;
  placement_status?: string;
  urban_request?: string;
  [key: string]: unknown;
};

export type QuickStatsCard = {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClass: string;
  cardClass: string;
  onClick: () => void;
};
