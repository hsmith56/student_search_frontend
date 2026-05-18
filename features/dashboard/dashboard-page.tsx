"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Search, SlidersHorizontal } from "lucide-react";

import Footer from "@/components/layout/Footer";
import Header, { type HeaderView } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";
import { canAccessDashboard } from "@/lib/account-permissions";
import { getCurrentUser } from "@/lib/api/auth";
import { getDashboardInterestRarity, getDashboardInterests } from "@/lib/api/dashboard";
import { getLastUpdateTime } from "@/lib/api/misc";
import { ENABLE_ADMIN_PANEL, ENABLE_RPM } from "@/lib/feature-flags";

type InterestDatum = {
  interest: string;
  count: number;
  percent: number;
  rank: number;
};

type InterestGroupData = Record<string, number>;

type RankedInterestGroup = {
  key: string;
  label: string;
  items: InterestDatum[];
  maxCount: number;
};

type InterestFrequencyEntry = {
  interest: string;
  student_count: number;
  student_percent: number;
};

type MetricDistribution = {
  count: number;
  min: number;
  mean: number;
  median: number;
  p75: number;
  p90: number;
  p95: number;
  max: number;
};

type StudentInterestRarity = {
  interest: string;
  student_count: number;
  student_percent: number;
  idf: number;
};

type SimilarStudent = {
  app_id: number;
  first_name: string | null;
  country: string | null;
  shared_interest_count: number;
  student_interest_overlap_ratio: number;
  jaccard_similarity: number;
  shared_interests: string[];
};

type StudentRarity = {
  app_id: number;
  first_name: string | null;
  country: string | null;
  religion?: string | null;
  religious_frequency?: number | string | null;
  allergy_comments?: string | null;
  dietary_restrictions?: string | null;
  health_comments?: string[];
  live_with_pets?: boolean | null;
  has_allergy_comments?: boolean;
  has_dietary_restrictions?: boolean;
  has_health_comments?: boolean;
  request_group?: string;
  overall_rarity_score: number;
  interest_rarity_score: number;
  overlap_rarity_score: number;
  nearest_neighbor_similarity: number;
  nearest_neighbor_uniqueness_score: number;
  average_interest_idf: number;
  selected_interest_count: number;
  low_interest_count: boolean;
  interests: string[];
  unique_interests: string[];
  rarest_interests: StudentInterestRarity[];
  overlap_student_count: number;
  overlap_student_percent: number;
  max_shared_interest_count: number;
  exact_interest_set_match_count: number;
  duplicate_interest_set_count: number;
  rarity_percentile: number;
  overall_rarity_percentile: number;
  interest_rarity_percentile: number;
  rarity_label: "very_rare" | "rare" | "somewhat_uncommon" | "common" | "very_common";
  most_similar_students: SimilarStudent[];
};

type InterestRarityGroup = {
  comparison_group: string;
  comparison_group_size: number;
  excluded_without_interests: number;
  summary: {
    comparison_group: string;
    comparison_group_size: number;
    returned_student_count: number;
    excluded_without_interests: number;
    interest_count: number;
    zero_overlap_student_count: number;
    students_with_unique_interests_count: number;
    duplicate_interest_set_count: number;
    students_in_duplicate_interest_sets: number;
    low_interest_count_students: number;
    most_common_interests: InterestFrequencyEntry[];
    rarest_interests: InterestFrequencyEntry[];
    distributions: Record<string, MetricDistribution>;
  };
  scoring: {
    primary_score: "overall_rarity_score";
    labels: Record<StudentRarity["rarity_label"], string>;
  } & Record<string, unknown>;
  sort: string | null;
  limit: null;
  include_similar_students: true;
  interest_frequencies: Record<string, number>;
  students: StudentRarity[];
};

type InterestRarityResponse = {
  comparison_group: "allocated_students_by_request";
  request_groups: string[];
  request_group_count: number;
  total_allocated_students: number;
  sort: string | null;
  limit: null;
  include_similar_students: true;
  scoring: {
    primary_score: "overall_rarity_score";
    labels: Record<StudentRarity["rarity_label"], string>;
  } & Record<string, unknown>;
  groups: Record<string, InterestRarityGroup>;
};

type RaritySortKey = "overall" | "interest" | "overlap" | "uniqueness" | "least";

const GEN_POP_GROUP_KEY = "no_requests";
const REGION_GROUP_PATTERN = /^R(\d+)$/i;
const ALL_GROUPS_VALUE = "__all__";

type DashboardPageProps = {
  activeView?: HeaderView;
  onViewChange?: (view: HeaderView) => void;
  embedded?: boolean;
};

function formatInterestLabel(value: string) {
  return value
    .split(" ")
    .map((word) => (word === "-" ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

function getPercentLabel(percent: number) {
  if (percent > 0 && percent < 1) return "<1%";
  return `${Math.round(percent)}%`;
}

function formatRarityLabel(label: StudentRarity["rarity_label"]) {
  return {
    very_rare: "Highly Unique",
    rare: "Unique",
    somewhat_uncommon: "Somewhat Distinct",
    common: "Typical",
    very_common: "Very Typical",
  }[label];
}

function formatReligiousFrequency(value: StudentRarity["religious_frequency"]) {
  if (value === undefined || value === null || value === "") return "Not provided";

  const numericValue = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return {
    0: "Does not practice",
    1: "Practices rarely",
    2: "Practices sometimes",
    3: "Practices frequently",
  }[numericValue] ?? String(value);
}

function getReligionBadgeLabel(student: StudentRarity) {
  const religion = student.religion?.trim();
  const frequency = formatReligiousFrequency(student.religious_frequency);

  if (religion && frequency !== "Not provided") return `${religion} · ${frequency}`;
  if (religion) return religion;
  if (frequency !== "Not provided") return frequency;
  return null;
}

function getStudentProfileBadges(student: StudentRarity) {
  return [
    student.has_allergy_comments ? { label: "Allergies", className: "border-[rgba(201,18,41,0.24)] bg-[rgba(201,18,41,0.08)] text-[var(--brand-danger)]" } : null,
    student.has_dietary_restrictions ? { label: "Dietary", className: "border-[rgba(255,87,0,0.24)] bg-[rgba(255,87,0,0.08)] text-[rgba(140,60,14,0.92)]", detail: student.dietary_restrictions?.trim() } : null,
    student.has_health_comments ? { label: "Medical", className: "border-[rgba(201,18,41,0.24)] bg-[rgba(201,18,41,0.08)] text-[var(--brand-danger)]", detail: student.health_comments?.filter((comment) => comment.trim()).join("\n") } : null,
    student.live_with_pets === false ? { label: "No pets", className: "border-[rgba(201,18,41,0.24)] bg-[rgba(201,18,41,0.08)] text-[var(--brand-danger)]" } : null,
    student.live_with_pets === true ? { label: "Pets OK", className: "border-[rgba(0,160,70,0.22)] bg-[rgba(0,160,70,0.1)] text-[#00703c]" } : null,
  ].filter((badge): badge is { label: string; className: string; detail?: string } => badge !== null);
}

function getRaritySortValue(student: StudentRarity, sort: RaritySortKey) {
  if (sort === "interest") return student.interest_rarity_score;
  if (sort === "overlap") return student.overlap_rarity_score;
  if (sort === "uniqueness") return student.nearest_neighbor_uniqueness_score;
  return student.overall_rarity_score;
}

function normalizeInterestCounts(payload: unknown): InterestGroupData {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return Object.fromEntries(
      Object.entries(payload)
        .map(([interest, value]) => [interest, Number(value)] as const)
        .filter(([interest, count]) => interest.trim() && Number.isFinite(count))
    );
  }

  if (Array.isArray(payload)) {
    return Object.fromEntries(
      payload
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as { interest?: unknown; name?: unknown; count?: unknown };
          const interest = typeof record.interest === "string" ? record.interest : typeof record.name === "string" ? record.name : "";
          const count = Number(record.count);
          return interest.trim() && Number.isFinite(count) ? ([interest, count] as const) : null;
        })
        .filter((item): item is readonly [string, number] => item !== null)
    );
  }

  return {};
}

function normalizeInterestGroups(payload: unknown): Record<string, InterestGroupData> {
  const source = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as { interests?: unknown; data?: unknown }).interests ?? (payload as { interests?: unknown; data?: unknown }).data ?? payload
    : payload;

  if (source && typeof source === "object" && !Array.isArray(source)) {
    const entries = Object.entries(source);
    const hasGroupedData = entries.some(([, value]) => value && typeof value === "object" && !Array.isArray(value));

    if (hasGroupedData) {
      return Object.fromEntries(
        entries
          .map(([group, values]) => [group, normalizeInterestCounts(values)] as const)
          .filter(([group, values]) => group.trim() && Object.keys(values).length > 0)
      );
    }
  }

  const genPopCounts = normalizeInterestCounts(source);
  return Object.keys(genPopCounts).length > 0 ? { [GEN_POP_GROUP_KEY]: genPopCounts } : {};
}

function isGenPopGroup(group: string) {
  return group.toLowerCase() === GEN_POP_GROUP_KEY;
}

function isRegionGroup(group: string) {
  return REGION_GROUP_PATTERN.test(group);
}

function isStateGroup(group: string) {
  return !isGenPopGroup(group) && !isRegionGroup(group);
}

function formatGroupLabel(group: string) {
  if (isGenPopGroup(group)) return "Gen-Pop";

  const regionMatch = group.match(REGION_GROUP_PATTERN);
  if (regionMatch) return `Region ${regionMatch[1]}`;

  return group.toUpperCase();
}

function getGroupSortValue(group: string) {
  if (isGenPopGroup(group)) return { type: 0, value: 0 };

  const regionMatch = group.match(REGION_GROUP_PATTERN);
  if (regionMatch) return { type: 1, value: Number(regionMatch[1]) };

  return { type: 2, value: Number.POSITIVE_INFINITY };
}

function RankedBarsView({
  groups,
  expandedGroups,
  onToggleGroup,
  query,
  onQueryChange,
}: {
  groups: RankedInterestGroup[];
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (groupKey: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-5 shadow-[var(--brand-shadow-soft)]">
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
          <Search className="h-3.5 w-3.5" />
          Search interests
        </span>
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Type to filter interests..."
          className="border-[var(--brand-border-soft)] bg-white"
        />
      </label>

      <div className="mt-5 space-y-6">
        {groups.length > 0 ? groups.map((group) => {
          const isExpanded = expandedGroups[group.key] ?? isGenPopGroup(group.key);

          return (
            <div key={group.key}>
              <button
                type="button"
                className="mb-2 flex w-full items-center justify-between gap-3 border-b border-[var(--brand-border-soft)] pb-2 text-left"
                aria-expanded={isExpanded}
                onClick={() => onToggleGroup(group.key)}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
                  )}
                  <span className="truncate text-lg font-black text-[var(--brand-ink)]">{group.label}</span>
                </span>
                <span className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                  {group.items.length} interests
                </span>
              </button>
              {isExpanded ? (
                <div className="divide-y divide-[var(--brand-border-soft)]">
                  {group.items.map((item) => {
                    const width = group.maxCount > 0 ? Math.max((item.count / group.maxCount) * 100, 4) : 0;

                    return (
                      <div
                        key={`${group.key}-${item.interest}`}
                        className="grid w-full gap-3 py-3 text-left md:grid-cols-[52px_190px_1fr_92px] md:items-center"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(0,94,184,0.08)] text-sm font-black text-[var(--brand-primary)]">
                          #{item.rank}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[var(--brand-ink)]">
                            {formatInterestLabel(item.interest)}
                          </p>
                          <p className="text-xs text-[var(--brand-muted)]">
                            {getPercentLabel(item.percent)} of {group.label} interest matches
                          </p>
                        </div>
                        <div className="h-7 overflow-hidden rounded-full bg-[rgba(0,94,184,0.1)] shadow-inner ring-1 ring-[rgba(0,94,184,0.08)]">
                          <div
                            className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] pr-2 text-xs font-black text-white shadow-sm"
                            style={{ width: `${width}%` }}
                          >
                            {item.count}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-[var(--brand-ink)]">{item.count}</p>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--brand-muted)]">Remaining</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        }) : (
          <p className="py-8 text-center text-sm font-medium text-[var(--brand-body)]">
            No interests match your search.
          </p>
        )}
      </div>
    </section>
  );
}

function InterestRarityView({
  data,
  query,
  onQueryChange,
  sort,
  onSortChange,
}: {
  data: InterestRarityResponse;
  query: string;
  onQueryChange: (value: string) => void;
  sort: RaritySortKey;
  onSortChange: (value: RaritySortKey) => void;
}) {
  const [selectedInterestFilter, setSelectedInterestFilter] = useState<string | null>(null);
  const [profileFilters, setProfileFilters] = useState({
    allergies: false,
    dietary: false,
    medical: false,
    pets: false,
  });
  const [selectedGroupKey, setSelectedGroupKey] = useState(data.request_groups[0] ?? Object.keys(data.groups)[0] ?? "");
  const selectedGroup = data.groups[selectedGroupKey] ?? Object.values(data.groups)[0];
  const groupOptions = data.request_groups.filter((group) => data.groups[group]);

  const students = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const selectedInterest = selectedInterestFilter?.toLowerCase();

    return [...(selectedGroup?.students ?? [])]
      .filter((student) => {
        if (!selectedInterest) return true;
        return student.interests.some((interest) => interest.toLowerCase() === selectedInterest);
      })
      .filter((student) => {
        if (profileFilters.allergies && !student.has_allergy_comments) return false;
        if (profileFilters.dietary && !student.has_dietary_restrictions) return false;
        if (profileFilters.medical && !student.has_health_comments) return false;
        if (profileFilters.pets && student.live_with_pets !== false) return false;
        return true;
      })
      .filter((student) => {
        if (!normalizedQuery) return true;
        return [student.first_name, student.country, String(student.app_id), ...student.interests]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        const direction = sort === "least" ? 1 : -1;
        return direction * (getRaritySortValue(a, sort) - getRaritySortValue(b, sort)) || a.app_id - b.app_id;
      });
  }, [profileFilters, query, selectedGroup, selectedInterestFilter, sort]);

  useEffect(() => {
    setSelectedInterestFilter(null);
  }, [selectedGroupKey]);

  const toggleInterestFilter = (interest: string) => {
    setSelectedInterestFilter((current) => (current === interest ? null : interest));
  };

  if (!selectedGroup) {
    return (
      <section className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-10 text-center shadow-[var(--brand-shadow-soft)]">
        <p className="font-medium text-[var(--brand-body)]">No profile uniqueness groups available.</p>
      </section>
    );
  }

  const sortedFrequencies = Object.entries(selectedGroup.interest_frequencies).sort((a, b) => b[1] - a[1]);
  const maxFrequency = sortedFrequencies[0]?.[1] ?? 1;

  return (
    <section>
      <div className="grid justify-center gap-5 xl:grid-cols-[minmax(0,820px)_320px]">
        <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-5 shadow-[var(--brand-shadow-soft)]">
          <div className="mb-4 grid grid-cols-4 gap-4">
            {[
              ["allergies", "Allergies"],
              ["dietary", "Dietary"],
              ["medical", "Medical"],
              ["pets", "Pets"],
            ].map(([key, label]) => (
              <label key={key} className="flex flex-col items-center gap-1.5 text-center text-xs font-bold text-[var(--brand-muted)]">
                <span>{label}</span>
                <Switch
                  checked={profileFilters[key as keyof typeof profileFilters]}
                  onCheckedChange={(checked) => setProfileFilters((current) => ({ ...current, [key]: checked }))}
                  aria-label={key === "pets" ? "Show only students with no pets" : `Show only students with ${label.toLowerCase()}`}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <label className="block flex-1">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                <Search className="h-3.5 w-3.5" /> Search students or interests
              </span>
              <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Name, app ID, country, interest..." className="border-[var(--brand-border-soft)] bg-white" />
            </label>
            <Select value={sort} onValueChange={(value) => onSortChange(value as RaritySortKey)}>
              <SelectTrigger className="w-full border-[var(--brand-border-soft)] bg-white md:w-[260px]">
                <SelectValue placeholder="Sort profiles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">Most unique profiles</SelectItem>
                <SelectItem value="least">Most typical profiles</SelectItem>
                <SelectItem value="interest">Most distinctive interests</SelectItem>
                <SelectItem value="overlap">Least profile overlap</SelectItem>
                <SelectItem value="uniqueness">Nearest-neighbor uniqueness</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-5 space-y-3">
            {students.map((student, index) => (
              <article key={student.app_id} className="rounded-3xl border border-[var(--brand-border-soft)] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-[var(--brand-primary)]">#{index + 1}</span>
                      <Link
                        href={`/StudentProfile?id=${student.app_id}`}
                        className="text-lg font-black text-[var(--brand-ink)] underline-offset-4 transition hover:text-[var(--brand-primary)] hover:underline"
                      >
                        {student.first_name ?? `App ${student.app_id}`}
                      </Link>
                      <Badge variant="outline" className="border-[var(--brand-border-soft)] bg-white text-[var(--brand-primary)]">{formatRarityLabel(student.rarity_label)}</Badge>
                      {student.country ? <span className="text-sm text-[var(--brand-muted)]">{student.country}</span> : null}
                      {getReligionBadgeLabel(student) ? (
                        <Badge variant="outline" className="border-[rgba(255,87,0,0.24)] bg-[rgba(255,87,0,0.08)] text-[rgba(140,60,14,0.92)]">
                          {getReligionBadgeLabel(student)}
                        </Badge>
                      ) : null}
                      {getStudentProfileBadges(student).map((badge) => (
                        <span key={badge.label} className="group relative inline-flex">
                          <Badge variant="outline" className={badge.className}>
                            {badge.label}
                          </Badge>
                          {badge.detail ? (
                            <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-72 -translate-x-1/2 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-3 text-left text-xs leading-5 text-[var(--brand-body)] opacity-0 shadow-[var(--brand-shadow-soft)] ring-1 ring-[rgba(0,94,184,0.06)] transition group-hover:block group-hover:opacity-100">
                              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                                {badge.label} note
                              </span>
                              <span className="whitespace-pre-line">{badge.detail}</span>
                            </span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {student.rarest_interests.slice(0, 5).map((interest) => (
                        <span key={`${student.app_id}-${interest.interest}`} className="rounded-full bg-[rgba(0,94,184,0.08)] px-2.5 py-1 text-xs font-bold text-[var(--brand-primary)]">
                          {formatInterestLabel(interest.interest)} · {getPercentLabel(interest.student_percent)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-[var(--brand-body)] md:grid-cols-3">
                  <p><span className="font-black text-[var(--brand-ink)]">{student.selected_interest_count}</span> selected interests</p>
                  <p><span className="font-black text-[var(--brand-ink)]">{student.overlap_student_count}</span> students share at least one</p>
                  <p><span className="font-black text-[var(--brand-ink)]">{student.exact_interest_set_match_count}</span> exact set matches</p>
                </div>
              </article>
            ))}
            {students.length === 0 ? <p className="py-8 text-center text-sm font-medium text-[var(--brand-body)]">No student profiles match search.</p> : null}
          </div>
        </div>

        <aside>
          <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-5 shadow-[var(--brand-shadow-soft)]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">Request group</span>
              <Select value={selectedGroupKey} onValueChange={setSelectedGroupKey}>
                <SelectTrigger className="w-full border-[var(--brand-border-soft)] bg-white font-black">
                  <SelectValue placeholder="Select request group" />
                </SelectTrigger>
                <SelectContent>
                  {groupOptions.map((group) => (
                    <SelectItem key={group} value={group}>{formatGroupLabel(group)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <div className="mt-5 border-t border-[var(--brand-border-soft)] pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">Most distinctive interests</p>
                  <p className="mt-1 text-xs text-[var(--brand-muted)]">Select one interest to find matching student profiles.</p>
                </div>
                {selectedInterestFilter ? (
                  <Button type="button" variant="outline" size="sm" className="border-[var(--brand-border-soft)] bg-white text-xs font-black text-[var(--brand-primary)]" onClick={() => setSelectedInterestFilter(null)}>
                    Clear
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 divide-y divide-[var(--brand-border-soft)]">
                {selectedGroup.summary.rarest_interests.slice(0, 20).map((interest) => {
                  const isSelected = selectedInterestFilter === interest.interest;

                  return (
                    <button
                      key={interest.interest}
                      type="button"
                      aria-pressed={isSelected}
                      className={`flex w-full items-center justify-between gap-3 py-2.5 text-left transition ${
                        isSelected
                          ? "text-[var(--brand-primary)]"
                          : "text-[var(--brand-ink)] hover:text-[var(--brand-primary)]"
                      }`}
                      onClick={() => toggleInterestFilter(interest.interest)}
                    >
                      <span className="text-sm font-black">{formatInterestLabel(interest.interest)}</span>
                      <span className={`text-xs font-bold ${isSelected ? "text-[var(--brand-primary)]" : "text-[var(--brand-muted)]"}`}>
                        {interest.student_count} · {getPercentLabel(interest.student_percent)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedInterestFilter ? (
                <p className="mt-3 text-xs font-bold text-[var(--brand-primary)]">
                  Showing profiles with {formatInterestLabel(selectedInterestFilter)}.
                </p>
              ) : null}
            </div>

            <div className="mt-5 border-t border-[var(--brand-border-soft)] pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">Interest profile map</p>
                  <p className="mt-1 text-xs text-[var(--brand-muted)]">Click one interest to filter student profiles.</p>
                </div>
                {selectedInterestFilter ? (
                  <Button type="button" variant="outline" size="sm" className="border-[var(--brand-border-soft)] bg-white text-xs font-black text-[var(--brand-primary)]" onClick={() => setSelectedInterestFilter(null)}>
                    Clear
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {sortedFrequencies.slice(0, 24).map(([interest, count]) => {
                  const isSelected = selectedInterestFilter === interest;

                  return (
                    <button
                      key={interest}
                      type="button"
                      aria-pressed={isSelected}
                      className={`rounded-full px-3 py-1 font-bold ring-1 transition ${
                        isSelected
                          ? "bg-[var(--brand-primary)] text-white ring-[var(--brand-primary)]"
                          : "bg-[rgba(0,94,184,0.08)] text-[var(--brand-primary)] ring-transparent hover:bg-[rgba(0,94,184,0.14)]"
                      }`}
                      style={{ fontSize: `${Math.max(11, Math.min(20, 10 + (count / maxFrequency) * 10))}px` }}
                      onClick={() => toggleInterestFilter(interest)}
                    >
                      {formatInterestLabel(interest)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function DashboardPage({
  activeView = "dashboard",
  onViewChange,
  embedded = false,
}: DashboardPageProps) {
  const { isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [updateTime, setUpdateTime] = useState("");
  const [interestData, setInterestData] = useState<Record<string, InterestGroupData>>({});
  const [dashboardMode, setDashboardMode] = useState<"interests" | "rarity">("interests");
  const [query, setQuery] = useState("");
  const [rarityQuery, setRarityQuery] = useState("");
  const [raritySort, setRaritySort] = useState<RaritySortKey>("overall");
  const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
  const [showStateGroups, setShowStateGroups] = useState(true);
  const [showRegionGroups, setShowRegionGroups] = useState(true);
  const [selectedStateGroup, setSelectedStateGroup] = useState(ALL_GROUPS_VALUE);
  const [selectedRegionGroup, setSelectedRegionGroup] = useState(ALL_GROUPS_VALUE);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isInterestsLoading, setIsInterestsLoading] = useState(true);
  const [interestsError, setInterestsError] = useState<string | null>(null);
  const [rarityData, setRarityData] = useState<InterestRarityResponse | null>(null);
  const [isRarityLoading, setIsRarityLoading] = useState(false);
  const [rarityError, setRarityError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchHeaderData = async () => {
      try {
        const [userData, updateData] = await Promise.all([
          getCurrentUser({ redirectOnUnauthorized: false }),
          getLastUpdateTime(),
        ]);

        setFirstName(userData?.first_name ?? "");
        setAccountType(userData?.account_type ?? "");
        if (Array.isArray(updateData)) {
          setUpdateTime(String(updateData[0] ?? ""));
        }
      } catch (error) {
        console.error("Error loading dashboard header data:", error);
      }
    };

    if (!embedded) {
      void fetchHeaderData();
    }
  }, [embedded, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;

    const fetchInterests = async () => {
      setIsInterestsLoading(true);
      setInterestsError(null);

      try {
        const payload = await getDashboardInterests();
        if (isMounted) {
          setInterestData(normalizeInterestGroups(payload));
        }
      } catch (error) {
        console.error("Error loading dashboard interests:", error);
        if (isMounted) {
          setInterestData({});
          setInterestsError("Unable to load dashboard interests.");
        }
      } finally {
        if (isMounted) {
          setIsInterestsLoading(false);
        }
      }
    };

    void fetchInterests();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || dashboardMode !== "rarity" || rarityData) return;

    let isMounted = true;

    const fetchRarity = async () => {
      setIsRarityLoading(true);
      setRarityError(null);

      try {
        const payload = await getDashboardInterestRarity<InterestRarityResponse>();
        if (isMounted) {
          setRarityData(payload);
        }
      } catch (error) {
        console.error("Error loading interest rarity:", error);
        if (isMounted) {
          setRarityError("Unable to load profile uniqueness analysis.");
        }
      } finally {
        if (isMounted) {
          setIsRarityLoading(false);
        }
      }
    };

    void fetchRarity();

    return () => {
      isMounted = false;
    };
  }, [dashboardMode, isAuthenticated, rarityData]);

  const groups = useMemo(() => {
    return Object.entries(interestData)
      .map(([group, values]) => {
        const total = Object.values(values).reduce((sum, count) => sum + count, 0);
        const items = Object.entries(values)
          .map(([interest, count]) => ({
            interest,
            count,
            percent: total > 0 ? (count / total) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count || a.interest.localeCompare(b.interest))
          .map((item, index) => ({ ...item, rank: index + 1 }));

        return {
          key: group,
          label: formatGroupLabel(group),
          items,
          maxCount: items[0]?.count ?? 0,
        };
      })
      .sort((a, b) => {
        const aSort = getGroupSortValue(a.key);
        const bSort = getGroupSortValue(b.key);

        return aSort.type - bSort.type || aSort.value - bSort.value || a.label.localeCompare(b.label);
      });
  }, [interestData]);

  const regionGroups = useMemo(() => groups.filter((group) => isRegionGroup(group.key)), [groups]);
  const stateGroups = useMemo(() => groups.filter((group) => isStateGroup(group.key)), [groups]);

  const visibleGroups = useMemo(() => {
    return groups.filter((group) => {
      if (isGenPopGroup(group.key)) return true;

      if (isRegionGroup(group.key)) {
        if (!showRegionGroups) return false;
        return selectedRegionGroup === ALL_GROUPS_VALUE || group.key === selectedRegionGroup;
      }

      if (isStateGroup(group.key)) {
        if (!showStateGroups) return false;
        return selectedStateGroup === ALL_GROUPS_VALUE || group.key === selectedStateGroup;
      }

      return true;
    });
  }, [groups, selectedRegionGroup, selectedStateGroup, showRegionGroups, showStateGroups]);

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return visibleGroups;

    return visibleGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.interest.toLowerCase().includes(normalizedQuery)),
      }))
      .filter((group) => group.items.length > 0);
  }, [query, visibleGroups]);

  const hasInterestData = groups.some((group) => group.items.length > 0);
  const toggleGroupExpanded = (groupKey: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [groupKey]: !(current[groupKey] ?? isGenPopGroup(groupKey)),
    }));
  };
  const normalizedAccountType = accountType.toLowerCase();
  const showRpmNav = ENABLE_RPM && !normalizedAccountType.includes("lc");
  const showAdminNav = ENABLE_ADMIN_PANEL && normalizedAccountType.includes("admin");
  const showDashboardNav = canAccessDashboard(accountType);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="brand-page-gradient flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--brand-primary)]" />
          <p className="mt-4 font-medium text-[var(--brand-body)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const content = (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-3 shadow-[var(--brand-shadow-soft)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">Dashboard views</p>
          <p className="text-sm text-[var(--brand-body)]">Switch between interest counts and student profile uniqueness.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[rgba(0,94,184,0.06)] p-1">
          <Button
            type="button"
            variant={dashboardMode === "interests" ? "default" : "outline"}
            className={dashboardMode === "interests" ? "font-black" : "border-transparent bg-white font-black text-[var(--brand-primary)]"}
            onClick={() => setDashboardMode("interests")}
          >
            Interest counts
          </Button>
          <Button
            type="button"
            variant={dashboardMode === "rarity" ? "default" : "outline"}
            className={dashboardMode === "rarity" ? "font-black" : "border-transparent bg-white font-black text-[var(--brand-primary)]"}
            onClick={() => setDashboardMode("rarity")}
          >
            Profile uniqueness
          </Button>
        </div>
      </div>

      {dashboardMode === "rarity" ? (
        isRarityLoading ? (
          <section className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-10 text-center shadow-[var(--brand-shadow-soft)]">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--brand-primary)]" />
            <p className="mt-4 font-medium text-[var(--brand-body)]">Loading profile uniqueness analysis...</p>
          </section>
        ) : rarityError ? (
          <section className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-10 text-center shadow-[var(--brand-shadow-soft)]">
            <p className="font-semibold text-[var(--brand-danger)]">{rarityError}</p>
          </section>
        ) : rarityData ? (
          <InterestRarityView
            data={rarityData}
            query={rarityQuery}
            onQueryChange={setRarityQuery}
            sort={raritySort}
            onSortChange={setRaritySort}
          />
        ) : (
          <section className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-10 text-center shadow-[var(--brand-shadow-soft)]">
            <p className="font-medium text-[var(--brand-body)]">No profile uniqueness analysis available.</p>
          </section>
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {isInterestsLoading ? (
            <section className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-10 text-center shadow-[var(--brand-shadow-soft)]">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--brand-primary)]" />
              <p className="mt-4 font-medium text-[var(--brand-body)]">Loading interest data...</p>
            </section>
          ) : interestsError ? (
            <section className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-10 text-center shadow-[var(--brand-shadow-soft)]">
              <p className="font-semibold text-[var(--brand-danger)]">{interestsError}</p>
            </section>
          ) : hasInterestData ? (
            <RankedBarsView
              groups={filteredGroups}
              expandedGroups={expandedGroups}
              onToggleGroup={toggleGroupExpanded}
              query={query}
              onQueryChange={setQuery}
            />
          ) : (
            <section className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-10 text-center shadow-[var(--brand-shadow-soft)]">
              <p className="font-medium text-[var(--brand-body)]">No interest data available.</p>
            </section>
          )}

          <aside className="space-y-4">
            <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-5 shadow-[var(--brand-shadow-soft)]">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between border-[var(--brand-border-soft)] bg-white font-black text-[var(--brand-primary)]"
                aria-expanded={isGroupFilterOpen}
                onClick={() => setIsGroupFilterOpen((isOpen) => !isOpen)}
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </span>
                <span className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">
                  {isGroupFilterOpen ? "Hide" : "Show"}
                </span>
              </Button>

              {isGroupFilterOpen ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-[var(--brand-border-soft)] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[var(--brand-ink)]">Regions</p>
                        <p className="text-xs text-[var(--brand-muted)]">Show/hide R1, R2, etc.</p>
                      </div>
                      <Switch checked={showRegionGroups} onCheckedChange={setShowRegionGroups} aria-label="Show regions" />
                    </div>
                    <Select value={selectedRegionGroup} onValueChange={setSelectedRegionGroup} disabled={!showRegionGroups || regionGroups.length === 0}>
                      <SelectTrigger className="w-full border-[var(--brand-border-soft)] bg-white">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_GROUPS_VALUE}>All regions</SelectItem>
                        {regionGroups.map((group) => (
                          <SelectItem key={group.key} value={group.key}>{group.label} ({group.key.toUpperCase()})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-2xl border border-[var(--brand-border-soft)] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[var(--brand-ink)]">States</p>
                        <p className="text-xs text-[var(--brand-muted)]">Show/hide state groups.</p>
                      </div>
                      <Switch checked={showStateGroups} onCheckedChange={setShowStateGroups} aria-label="Show states" />
                    </div>
                    <Select value={selectedStateGroup} onValueChange={setSelectedStateGroup} disabled={!showStateGroups || stateGroups.length === 0}>
                      <SelectTrigger className="w-full border-[var(--brand-border-soft)] bg-white">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_GROUPS_VALUE}>All states</SelectItem>
                        {stateGroups.map((group) => (
                          <SelectItem key={group.key} value={group.key}>{group.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-5 shadow-[var(--brand-shadow-soft)]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">Current JSON source</p>
              <pre className="mt-3 max-h-[260px] overflow-auto rounded-2xl bg-[var(--brand-ink)] p-4 text-xs leading-5 text-white">
                {JSON.stringify(interestData, null, 2)}
              </pre>
            </div>
            <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-5 shadow-[var(--brand-shadow-soft)]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">Data source</p>
              <p className="mt-2 text-sm leading-6 text-[var(--brand-body)]">
                Loaded from GET /api/dashboard/interests. Gen-Pop comes from no_requests. Region groups (R1, R2, etc.) display before state groups.
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="brand-page-gradient min-h-screen">
      <Header
        firstName={firstName}
        onLogout={logout}
        updateTime={updateTime}
        activeView={activeView}
        onViewChange={onViewChange}
        showRpm={showRpmNav}
        showAdmin={showAdminNav}
        showDashboard={showDashboardNav}
      />
      {content}
      <Footer />
    </div>
  );
}
