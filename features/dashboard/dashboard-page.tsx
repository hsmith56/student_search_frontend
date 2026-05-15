"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import Footer from "@/components/layout/Footer";
import Header, { type HeaderView } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
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

function normalizeInterestData(payload: unknown): Record<string, number> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const recordPayload = payload as { interests?: unknown; data?: unknown };
    const source = recordPayload.interests ?? recordPayload.data ?? payload;

    if (source && typeof source === "object" && !Array.isArray(source)) {
      return Object.fromEntries(
        Object.entries(source)
          .map(([interest, value]) => [interest, Number(value)] as const)
          .filter(([interest, count]) => interest.trim() && Number.isFinite(count))
      );
    }
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

function RankedBarsView({
  items,
  maxCount,
  query,
  onQueryChange,
}: {
  items: InterestDatum[];
  maxCount: number;
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

      <div className="mt-5 divide-y divide-[var(--brand-border-soft)]">
        {items.length > 0 ? items.map((item) => {
          const width = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 4) : 0;

          return (
            <div
              key={item.interest}
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
                  {getPercentLabel(item.percent)} of current interest matches
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
  const [interestData, setInterestData] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
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
          setInterestData(normalizeInterestData(payload));
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

  const items = useMemo(() => {
    const total = Object.values(interestData).reduce((sum, count) => sum + count, 0);

    return Object.entries(interestData)
      .map(([interest, count]) => ({
        interest,
        count,
        percent: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.interest.localeCompare(b.interest))
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [interestData]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;

    return items.filter((item) => item.interest.toLowerCase().includes(normalizedQuery));
  }, [items, query]);

  const maxCount = items[0]?.count ?? 0;
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
        ) : items.length > 0 ? (
          <RankedBarsView
            items={filteredItems}
            maxCount={maxCount}
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
              Loaded from GET /api/dashboard/interests. The dashboard expects one current count per interest and does not calculate seven-day deltas.
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
