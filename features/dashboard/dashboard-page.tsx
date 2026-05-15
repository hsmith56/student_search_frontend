"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Search, SlidersHorizontal } from "lucide-react";

import Footer from "@/components/layout/Footer";
import Header, { type HeaderView } from "@/components/layout/Header";
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
import { getDashboardInterests } from "@/lib/api/dashboard";
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
  const [query, setQuery] = useState("");
  const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
  const [showStateGroups, setShowStateGroups] = useState(true);
  const [showRegionGroups, setShowRegionGroups] = useState(true);
  const [selectedStateGroup, setSelectedStateGroup] = useState(ALL_GROUPS_VALUE);
  const [selectedRegionGroup, setSelectedRegionGroup] = useState(ALL_GROUPS_VALUE);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isInterestsLoading, setIsInterestsLoading] = useState(true);
  const [interestsError, setInterestsError] = useState<string | null>(null);

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
                    <Switch
                      checked={showRegionGroups}
                      onCheckedChange={setShowRegionGroups}
                      aria-label="Show regions"
                    />
                  </div>
                  <Select
                    value={selectedRegionGroup}
                    onValueChange={setSelectedRegionGroup}
                    disabled={!showRegionGroups || regionGroups.length === 0}
                  >
                    <SelectTrigger className="w-full border-[var(--brand-border-soft)] bg-white">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_GROUPS_VALUE}>All regions</SelectItem>
                      {regionGroups.map((group) => (
                        <SelectItem key={group.key} value={group.key}>
                          {group.label} ({group.key.toUpperCase()})
                        </SelectItem>
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
                    <Switch
                      checked={showStateGroups}
                      onCheckedChange={setShowStateGroups}
                      aria-label="Show states"
                    />
                  </div>
                  <Select
                    value={selectedStateGroup}
                    onValueChange={setSelectedStateGroup}
                    disabled={!showStateGroups || stateGroups.length === 0}
                  >
                    <SelectTrigger className="w-full border-[var(--brand-border-soft)] bg-white">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_GROUPS_VALUE}>All states</SelectItem>
                      {stateGroups.map((group) => (
                        <SelectItem key={group.key} value={group.key}>
                          {group.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-5 shadow-[var(--brand-shadow-soft)]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
              Current JSON source
            </p>
            <pre className="mt-3 max-h-[260px] overflow-auto rounded-2xl bg-[var(--brand-ink)] p-4 text-xs leading-5 text-white">
              {JSON.stringify(interestData, null, 2)}
            </pre>
          </div>
          <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-5 shadow-[var(--brand-shadow-soft)]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
              Data source
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-body)]">
              Loaded from GET /api/dashboard/interests. Gen-Pop comes from no_requests. Region groups (R1, R2, etc.) display before state groups.
            </p>
          </div>
        </aside>
      </div>
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
