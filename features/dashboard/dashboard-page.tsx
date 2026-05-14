"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Activity,
  LayoutDashboard,
  ListFilter,
  Medal,
  Minus,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import Footer from "@/components/layout/Footer";
import Header, { type HeaderView } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { getCurrentUser } from "@/lib/api/auth";
import { getLastUpdateTime } from "@/lib/api/misc";
import { ENABLE_ADMIN_PANEL, ENABLE_RPM } from "@/lib/feature-flags";

const mockInterestData = {
  basketball: 14,
  "table tennis - playing": 5,
  soccer: 21,
  chess: 3,
  volleyball: 12,
  robotics: 8,
  painting: 6,
  "creative writing": 4,
  "video games": 18,
  photography: 7,
  dance: 10,
  cooking: 2,
  swimming: 11,
  coding: 16,
  theater: 5,
  gardening: 1,
  "track and field": 9,
  music: 19,
} satisfies Record<string, number>;

const mockInterestSevenDayChangeData = {
  basketball: -3,
  "table tennis - playing": -1,
  soccer: -4,
  chess: 0,
  volleyball: -2,
  robotics: -3,
  painting: 0,
  "creative writing": -1,
  "video games": -2,
  photography: -2,
  dance: -3,
  cooking: -1,
  swimming: 0,
  coding: -5,
  theater: -2,
  gardening: 0,
  "track and field": -2,
  music: -1,
} satisfies Record<keyof typeof mockInterestData, number>;

type InterestDatum = {
  interest: string;
  count: number;
  percent: number;
  rank: number;
  previousCount: number;
  sevenDayChange: number;
  sevenDayRate: number;
  dailyChange: number;
};

type DashboardMode = "1" | "2" | "3";

type DashboardPageProps = {
  activeView?: HeaderView;
  onViewChange?: (view: HeaderView) => void;
  embedded?: boolean;
};

const modeDetails: Record<DashboardMode, { title: string; description: string; icon: typeof BarChart3 }> = {
  "1": {
    title: "Ranked bars",
    description: "Scan remaining profiles by abundance, rarity, or seven day depletion.",
    icon: BarChart3,
  },
  "2": {
    title: "Top / Bottom summary",
    description: "Compare abundant and rare interests plus fastest disappearing profile interests.",
    icon: Medal,
  },
  "3": {
    title: "Inventory velocity",
    description: "Review remaining profile inventory beside seven day rate of change and stock-out risk.",
    icon: Activity,
  },
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

function TrendBadge({ item, compact = false }: { item: InterestDatum; compact?: boolean }) {
  const isUnexpectedIncrease = item.sevenDayChange > 0;
  const isDepleting = item.sevenDayChange < 0;
  const Icon = isUnexpectedIncrease ? ArrowUpRight : isDepleting ? ArrowDownRight : Minus;
  const label = isUnexpectedIncrease
    ? `+${item.sevenDayChange} unexpected`
    : isDepleting
      ? `${Math.abs(item.sevenDayChange)} lost in 7d`
      : "No loss in 7d";
  const rateLabel = `${Math.abs(item.sevenDayRate).toFixed(0)}% depletion`;
  const toneClass = isUnexpectedIncrease
    ? "border-[rgba(0,144,63,0.28)] bg-[rgba(0,144,63,0.1)] text-[var(--brand-success-deep)]"
    : isDepleting
      ? "border-[rgba(201,18,41,0.24)] bg-[rgba(201,18,41,0.08)] text-[var(--brand-danger)]"
      : "border-[var(--brand-border-soft)] bg-[var(--brand-surface-muted)] text-[var(--brand-muted)]";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${toneClass}`}>
      <Icon className="h-3.5 w-3.5" />
      {compact ? label : `${label} • ${rateLabel}`}
    </span>
  );
}

function InterestDetailCard({ item }: { item: InterestDatum | null }) {
  if (!item) {
    return (
      <aside className="rounded-2xl border border-dashed border-[var(--brand-border-soft)] bg-white/70 p-5 text-sm text-[var(--brand-body)]">
        Select any interest to see how many matching profiles remain, how rare it is, and how quickly that interest is disappearing.
      </aside>
    );
  }

  return (
    <aside className="rounded-2xl border border-[rgba(0,94,184,0.2)] bg-[rgba(0,94,184,0.06)] p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
        Selected interest
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h3 className="text-2xl font-black text-[var(--brand-ink)]">
          {formatInterestLabel(item.interest)}
        </h3>
        <TrendBadge item={item} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
        <div className="rounded-xl bg-white/85 p-3">
          <p className="text-xl font-black text-[var(--brand-ink)]">{item.count}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
            Remaining
          </p>
        </div>
        <div className="rounded-xl bg-white/85 p-3">
          <p className="text-xl font-black text-[var(--brand-ink)]">{item.previousCount}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
            Available 7d Ago
          </p>
        </div>
        <div className="rounded-xl bg-white/85 p-3">
          <p className="text-xl font-black text-[var(--brand-ink)]">
            {getPercentLabel(item.percent)}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
            Share
          </p>
        </div>
        <div className="rounded-xl bg-white/85 p-3">
          <p className="text-xl font-black text-[var(--brand-ink)]">#{item.rank}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
            Rank
          </p>
        </div>
        <div className="rounded-xl bg-white/85 p-3">
          <p className="text-xl font-black text-[var(--brand-ink)]">
            {Math.abs(item.sevenDayRate).toFixed(0)}%
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
            7d Depletion
          </p>
        </div>
        <div className="rounded-xl bg-white/85 p-3">
          <p className="text-xl font-black text-[var(--brand-ink)]">
            {Math.abs(item.dailyChange).toFixed(1)}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
            Lost / Day
          </p>
        </div>
      </div>
    </aside>
  );
}

function InterestRow({
  item,
  maxCount,
  selected,
  onSelect,
  compact = false,
}: {
  item: InterestDatum;
  maxCount: number;
  selected: boolean;
  onSelect: (item: InterestDatum) => void;
  compact?: boolean;
}) {
  const width = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 4) : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`w-full rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
        selected
          ? "border-[var(--brand-primary)] bg-[rgba(0,94,184,0.08)] shadow-sm"
          : "border-[var(--brand-border-soft)] bg-white/85"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--brand-ink)]">
            {formatInterestLabel(item.interest)}
          </p>
          {!compact ? (
            <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
              Rank #{item.rank} • {getPercentLabel(item.percent)} of remaining profiles • {item.previousCount} available seven days ago
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="rounded-full bg-[var(--brand-surface-muted)] px-3 py-1 text-sm font-black text-[var(--brand-primary-deep)]">
            {item.count}
          </div>
          <TrendBadge item={item} compact />
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(0,94,184,0.1)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]"
          style={{ width: `${width}%` }}
        />
      </div>
    </button>
  );
}

function RankedBarsView({
  items,
  maxCount,
  selectedInterest,
  onSelect,
}: {
  items: InterestDatum[];
  maxCount: number;
  selectedInterest: string | null;
  onSelect: (item: InterestDatum) => void;
}) {
  const maxPreviousCount = Math.max(...items.map((item) => item.previousCount), 1);
  const maxLoss = Math.max(...items.map((item) => Math.abs(Math.min(item.sevenDayChange, 0))), 1);
  const abundantItems = useMemo(
    () => [...items].sort((a, b) => b.count - a.count || a.interest.localeCompare(b.interest)),
    [items]
  );
  const rareItems = useMemo(
    () => [...items].sort((a, b) => a.count - b.count || a.interest.localeCompare(b.interest)),
    [items]
  );
  const depletingItems = useMemo(
    () => [...items].sort((a, b) => a.sevenDayRate - b.sevenDayRate || a.sevenDayChange - b.sevenDayChange),
    [items]
  );

  const getRarityLabel = (count: number) => {
    if (count <= 3) return "Critical";
    if (count <= 7) return "Rare";
    if (count <= 12) return "Limited";
    return "Abundant";
  };

  return (
    <section className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-5 shadow-[var(--brand-shadow-soft)]">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
          Implementation 1
        </p>
        <h2 className="mt-1 text-xl font-black text-[var(--brand-ink)]">Three bar graph concepts</h2>
        <p className="mt-1 text-sm text-[var(--brand-body)]">
          These replace the simple ranked list with bar views focused on remaining profile inventory, rarity, and depletion speed.
        </p>
      </div>

      <div className="mt-5 space-y-5">
        <div className="rounded-2xl border border-[rgba(0,94,184,0.16)] bg-[rgba(0,94,184,0.04)] p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">Bar style A</p>
              <h3 className="text-lg font-black text-[var(--brand-ink)]">Inventory depletion ledger</h3>
            </div>
            <p className="text-xs font-semibold text-[var(--brand-muted)]">Blue = remaining now • Red = profiles lost in 7 days</p>
          </div>
          <div className="mt-4 space-y-3">
            {abundantItems.map((item) => {
              const loss = Math.abs(Math.min(item.sevenDayChange, 0));
              const previousWidth = Math.max((item.previousCount / maxPreviousCount) * 100, 6);
              const remainingWidth = item.previousCount > 0 ? (item.count / item.previousCount) * 100 : 0;
              const lostWidth = item.previousCount > 0 ? (loss / item.previousCount) * 100 : 0;
              const isSelected = selectedInterest === item.interest;

              return (
                <button
                  key={item.interest}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`grid w-full gap-2 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[180px_1fr_130px] md:items-center ${
                    isSelected ? "border-[var(--brand-primary)] bg-white shadow-sm" : "border-[var(--brand-border-soft)] bg-white/80"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--brand-ink)]">{formatInterestLabel(item.interest)}</p>
                    <p className="text-xs text-[var(--brand-muted)]">{item.previousCount} available 7d ago</p>
                  </div>
                  <div className="h-7 rounded-full bg-white shadow-inner ring-1 ring-[rgba(0,94,184,0.1)] md:max-w-full" style={{ width: `${previousWidth}%` }}>
                    <div className="flex h-full overflow-hidden rounded-full">
                      <div className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]" style={{ width: `${remainingWidth}%` }} />
                      <div className="bg-[var(--brand-danger)]" style={{ width: `${lostWidth}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 md:justify-end">
                    <span className="text-lg font-black text-[var(--brand-ink)]">{item.count}</span>
                    <span className="rounded-full bg-[rgba(201,18,41,0.08)] px-2.5 py-1 text-xs font-black text-[var(--brand-danger)]">-{loss}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[rgba(255,87,0,0.18)] bg-[rgba(255,87,0,0.04)] p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-accent)]">Bar style B</p>
              <h3 className="text-lg font-black text-[var(--brand-ink)]">Rarity threshold runway</h3>
            </div>
            <p className="text-xs font-semibold text-[var(--brand-muted)]">Rarest interests appear first with threshold bands for urgency.</p>
          </div>
          <div className="mt-4 space-y-3">
            {rareItems.map((item) => {
              const width = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 3) : 0;
              const isSelected = selectedInterest === item.interest;
              const rarity = getRarityLabel(item.count);

              return (
                <button
                  key={item.interest}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`w-full rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    isSelected ? "border-[var(--brand-primary)] bg-white shadow-sm" : "border-[var(--brand-border-soft)] bg-white/80"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--brand-ink)]">{formatInterestLabel(item.interest)}</p>
                      <p className="text-xs text-[var(--brand-muted)]">{rarity} availability</p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-sm font-black text-[var(--brand-primary-deep)] shadow-sm">{item.count} left</div>
                  </div>
                  <div className="relative h-8 overflow-hidden rounded-full border border-[rgba(0,0,0,0.06)] bg-[linear-gradient(to_right,rgba(201,18,41,0.16)_0%,rgba(201,18,41,0.16)_18%,rgba(255,87,0,0.15)_18%,rgba(255,87,0,0.15)_38%,rgba(255,194,62,0.2)_38%,rgba(255,194,62,0.2)_62%,rgba(0,144,63,0.13)_62%,rgba(0,144,63,0.13)_100%)]">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--brand-primary-deep)] to-[var(--brand-primary)]" style={{ width: `${width}%` }} />
                    <div className="absolute inset-y-0 flex items-center pl-3 text-xs font-black text-white drop-shadow">{item.count}</div>
                  </div>
                  <div className="mt-1 grid grid-cols-4 text-[10px] font-bold uppercase tracking-wide text-[var(--brand-muted)]">
                    <span>Critical</span>
                    <span>Rare</span>
                    <span>Limited</span>
                    <span className="text-right">Abundant</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[rgba(201,18,41,0.16)] bg-[rgba(201,18,41,0.035)] p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-danger)]">Bar style C</p>
              <h3 className="text-lg font-black text-[var(--brand-ink)]">Depletion velocity bars</h3>
            </div>
            <p className="text-xs font-semibold text-[var(--brand-muted)]">Paired bars compare remaining inventory against recent weekly loss.</p>
          </div>
          <div className="mt-4 space-y-3">
            {depletingItems.map((item) => {
              const loss = Math.abs(Math.min(item.sevenDayChange, 0));
              const remainingWidth = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 3) : 0;
              const lossWidth = Math.max((loss / maxLoss) * 100, loss > 0 ? 4 : 0);
              const daysLeft = loss > 0 ? Math.round(item.count / (loss / 7)) : null;
              const isSelected = selectedInterest === item.interest;

              return (
                <button
                  key={item.interest}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`grid w-full gap-3 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md lg:grid-cols-[180px_1fr_110px] lg:items-center ${
                    isSelected ? "border-[var(--brand-primary)] bg-white shadow-sm" : "border-[var(--brand-border-soft)] bg-white/80"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--brand-ink)]">{formatInterestLabel(item.interest)}</p>
                    <p className="text-xs text-[var(--brand-muted)]">{daysLeft ? `~${daysLeft} days at this pace` : "Stable this week"}</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-[10px] font-black uppercase tracking-wide text-[var(--brand-primary)]">Left</span>
                      <div className="h-3 flex-1 rounded-full bg-[rgba(0,94,184,0.08)]">
                        <div className="h-full rounded-full bg-[var(--brand-primary)]" style={{ width: `${remainingWidth}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-[10px] font-black uppercase tracking-wide text-[var(--brand-danger)]">Lost</span>
                      <div className="h-3 flex-1 rounded-full bg-[rgba(201,18,41,0.08)]">
                        <div className="h-full rounded-full bg-[var(--brand-danger)]" style={{ width: `${lossWidth}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 lg:block lg:text-right">
                    <p className="text-lg font-black text-[var(--brand-ink)]">{item.count}</p>
                    <p className="text-xs font-black text-[var(--brand-danger)]">{loss} lost / 7d</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function TopBottomView({
  items,
  maxCount,
  selectedInterest,
  onSelect,
}: {
  items: InterestDatum[];
  maxCount: number;
  selectedInterest: string | null;
  onSelect: (item: InterestDatum) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(5);
  const topItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const bottomItems = useMemo(
    () => [...items].sort((a, b) => a.count - b.count || a.interest.localeCompare(b.interest)).slice(0, visibleCount),
    [items, visibleCount]
  );
  const fastestDepleting = useMemo(
    () => [...items].sort((a, b) => a.sevenDayRate - b.sevenDayRate).slice(0, 3),
    [items]
  );
  const mostStable = useMemo(
    () => [...items].sort((a, b) => b.sevenDayRate - a.sevenDayRate).slice(0, 3),
    [items]
  );

  return (
    <section className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-5 shadow-[var(--brand-shadow-soft)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
            Implementation 2
          </p>
          <h2 className="mt-1 text-xl font-black text-[var(--brand-ink)]">Top / Bottom summary</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--brand-body)]">
          <span className="font-semibold">Show</span>
          {[3, 5, 8].map((count) => (
            <Button
              key={count}
              type="button"
              size="sm"
              variant={visibleCount === count ? "default" : "outline"}
              onClick={() => setVisibleCount(count)}
              className={visibleCount === count ? "bg-[var(--brand-primary)] text-white" : "bg-white"}
            >
              {count}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[rgba(0,144,63,0.2)] bg-[rgba(0,144,63,0.05)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--brand-success)]" />
            <h3 className="font-black text-[var(--brand-ink)]">Most abundant interests</h3>
          </div>
          <div className="space-y-3">
            {topItems.map((item) => (
              <InterestRow
                key={item.interest}
                item={item}
                maxCount={maxCount}
                selected={selectedInterest === item.interest}
                onSelect={onSelect}
                compact
              />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[rgba(255,87,0,0.22)] bg-[rgba(255,87,0,0.06)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-[var(--brand-accent)]" />
            <h3 className="font-black text-[var(--brand-ink)]">Rarest interests</h3>
          </div>
          <div className="space-y-3">
            {bottomItems.map((item) => (
              <InterestRow
                key={item.interest}
                item={item}
                maxCount={maxCount}
                selected={selectedInterest === item.interest}
                onSelect={onSelect}
                compact
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[rgba(0,144,63,0.2)] bg-white/80 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-[var(--brand-danger)]" />
            <h3 className="font-black text-[var(--brand-ink)]">Fastest disappearing</h3>
          </div>
          <div className="space-y-3">
            {fastestDepleting.map((item) => (
              <InterestRow
                key={item.interest}
                item={item}
                maxCount={maxCount}
                selected={selectedInterest === item.interest}
                onSelect={onSelect}
                compact
              />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[rgba(201,18,41,0.18)] bg-white/80 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Minus className="h-5 w-5 text-[var(--brand-muted)]" />
            <h3 className="font-black text-[var(--brand-ink)]">Most stable availability</h3>
          </div>
          <div className="space-y-3">
            {mostStable.map((item) => (
              <InterestRow
                key={item.interest}
                item={item}
                maxCount={maxCount}
                selected={selectedInterest === item.interest}
                onSelect={onSelect}
                compact
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VelocityBarsView({
  items,
  maxCount,
  selectedInterest,
  onSelect,
}: {
  items: InterestDatum[];
  maxCount: number;
  selectedInterest: string | null;
  onSelect: (item: InterestDatum) => void;
}) {
  const sortedByVelocity = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          Math.abs(Math.min(b.sevenDayChange, 0)) - Math.abs(Math.min(a.sevenDayChange, 0)) ||
          b.count - a.count ||
          a.interest.localeCompare(b.interest)
      ),
    [items]
  );
  const watchlist = useMemo(
    () =>
      [...items]
        .sort((a, b) => {
          const aLoss = Math.abs(Math.min(a.sevenDayChange, 0));
          const bLoss = Math.abs(Math.min(b.sevenDayChange, 0));
          const aDays = aLoss > 0 ? a.count / (aLoss / 7) : Number.POSITIVE_INFINITY;
          const bDays = bLoss > 0 ? b.count / (bLoss / 7) : Number.POSITIVE_INFINITY;

          return aDays - bDays || bLoss - aLoss || a.count - b.count;
        })
        .slice(0, 5),
    [items]
  );

  const chartWidth = Math.max(980, sortedByVelocity.length * 64 + 132);
  const chartHeight = 540;
  const topPadding = 58;
  const bottomPadding = 126;
  const leftPadding = 64;
  const rightPadding = 46;
  const plotWidth = chartWidth - leftPadding - rightPadding;
  const plotHeight = chartHeight - topPadding - bottomPadding;
  const barSlotWidth = plotWidth / Math.max(sortedByVelocity.length, 1);
  const barWidth = Math.min(38, Math.max(24, barSlotWidth * 0.52));
  const maxPreviousCount = Math.max(...items.map((item) => item.previousCount), maxCount, 1);
  const yAxisTicks = [0, 0.25, 0.5, 0.75, 1];
  const totalRemaining = items.reduce((sum, item) => sum + item.count, 0);
  const totalLost = items.reduce((sum, item) => sum + Math.abs(Math.min(item.sevenDayChange, 0)), 0);
  const averageDailyLoss = totalLost / 7;
  const atRiskCount = items.filter((item) => item.count <= 7 || Math.abs(item.sevenDayRate) >= 20).length;

  const getDaysRemaining = (item: InterestDatum) => {
    const loss = Math.abs(Math.min(item.sevenDayChange, 0));
    if (loss === 0) return null;
    return Math.ceil(item.count / (loss / 7));
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_58%,#f6f9fc_100%)] p-5 shadow-[0_24px_70px_rgba(0,53,84,0.10)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-primary)]">
            Implementation 3
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--brand-ink)]">Inventory velocity dashboard</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--brand-body)]">
            A single, Apple-inspired stacked bar graph comparing each interest by current availability plus profiles placed over the last seven days.
          </p>
        </div>
        <div className="grid min-w-[300px] grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white/90 px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <p className="text-2xl font-black tracking-tight text-[var(--brand-ink)]">{totalRemaining}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Remaining</p>
          </div>
          <div className="rounded-2xl border border-[rgba(201,18,41,0.10)] bg-white/90 px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <p className="text-2xl font-black tracking-tight text-[var(--brand-danger)]">-{totalLost}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Placed 7d</p>
          </div>
          <div className="rounded-2xl border border-[rgba(255,87,0,0.10)] bg-white/90 px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <p className="text-2xl font-black tracking-tight text-[var(--brand-accent)]">{atRiskCount}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-muted)]">At Risk</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[1.75rem] border border-[rgba(15,23,42,0.08)] bg-white/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_42px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-black tracking-tight text-[var(--brand-ink)]">Available + placed by interest</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--brand-muted)]">
                X-axis is the interest. Y-axis is the total seven-day inventory baseline, stacked as available now plus placed in the last seven days.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--brand-muted)] shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
              Avg loss {averageDailyLoss.toFixed(1)} / day
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-[1.35rem] border border-[rgba(15,23,42,0.06)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <svg
              className="h-auto w-full min-w-[860px]"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label="Stacked vertical bar chart with interests on the x axis and available plus placed profiles on the y axis"
            >
              <title>Available and placed profiles by interest</title>
              <defs>
                <linearGradient id="availableBarGradient" x1="0" x2="0" y1="1" y2="0">
                  <stop offset="0%" stopColor="#003554" />
                  <stop offset="58%" stopColor="#005eb8" />
                  <stop offset="100%" stopColor="#58b6d2" />
                </linearGradient>
                <linearGradient id="placedBarGradient" x1="0" x2="0" y1="1" y2="0">
                  <stop offset="0%" stopColor="#f4b4bb" />
                  <stop offset="100%" stopColor="#c91229" />
                </linearGradient>
                <linearGradient id="inventorySelectedGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(0,94,184,0.12)" />
                  <stop offset="100%" stopColor="rgba(60,159,192,0.03)" />
                </linearGradient>
                <filter id="verticalBarShadow" x="-80%" y="-12%" width="260%" height="130%">
                  <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#003554" floodOpacity="0.13" />
                </filter>
              </defs>

              <rect x="0" y="0" width={chartWidth} height={chartHeight} rx="24" fill="rgba(255,255,255,0.76)" />
              <text x={leftPadding} y="30" className="fill-[var(--brand-muted)] text-[10px] font-bold uppercase tracking-[0.16em]">
                Profiles
              </text>
              <text x={leftPadding + plotWidth / 2} y={chartHeight - 10} textAnchor="middle" className="fill-[var(--brand-muted)] text-[10px] font-bold uppercase tracking-[0.16em]">
                Interest
              </text>

              {yAxisTicks.map((tick) => {
                const y = topPadding + plotHeight - tick * plotHeight;
                const value = Math.round(tick * maxPreviousCount);

                return (
                  <g key={tick}>
                    <line x1={leftPadding} x2={leftPadding + plotWidth} y1={y} y2={y} stroke="rgba(15,23,42,0.06)" />
                    <text x={leftPadding - 14} y={y + 4} textAnchor="end" className="fill-[var(--brand-muted)] text-[10px] font-semibold">
                      {value}
                    </text>
                  </g>
                );
              })}
              <line x1={leftPadding} x2={leftPadding} y1={topPadding} y2={topPadding + plotHeight} stroke="rgba(15,23,42,0.10)" />
              <line x1={leftPadding} x2={leftPadding + plotWidth} y1={topPadding + plotHeight} y2={topPadding + plotHeight} stroke="rgba(15,23,42,0.10)" />

              {sortedByVelocity.map((item, index) => {
                const loss = Math.abs(Math.min(item.sevenDayChange, 0));
                const x = leftPadding + index * barSlotWidth + (barSlotWidth - barWidth) / 2;
                const availableHeight = Math.max((item.count / maxPreviousCount) * plotHeight, item.count > 0 ? 3 : 0);
                const placedHeight = Math.max((loss / maxPreviousCount) * plotHeight, loss > 0 ? 3 : 0);
                const totalHeight = availableHeight + placedHeight;
                const availableY = topPadding + plotHeight - availableHeight;
                const placedY = availableY - placedHeight;
                const label = formatInterestLabel(item.interest);
                const isSelected = selectedInterest === item.interest;

                return (
                  <g
                    key={item.interest}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer outline-none transition-opacity hover:opacity-90"
                    onClick={() => onSelect(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(item);
                      }
                    }}
                  >
                    {isSelected ? (
                      <rect
                        x={x - 10}
                        y={topPadding - 12}
                        width={barWidth + 20}
                        height={plotHeight + 92}
                        rx={18}
                        fill="url(#inventorySelectedGradient)"
                        stroke="rgba(0,94,184,0.16)"
                      />
                    ) : null}
                    <rect
                      x={x}
                      y={topPadding}
                      width={barWidth}
                      height={plotHeight}
                      rx={barWidth / 2}
                      fill="rgba(15,23,42,0.055)"
                    />
                    {loss > 0 ? (
                      <rect
                        x={x}
                        y={placedY}
                        width={barWidth}
                        height={placedHeight}
                        rx={barWidth / 2}
                        fill="url(#placedBarGradient)"
                        opacity="0.94"
                      />
                    ) : null}
                    <rect
                      x={x}
                      y={availableY}
                      width={barWidth}
                      height={availableHeight}
                      rx={barWidth / 2}
                      fill="url(#availableBarGradient)"
                      filter="url(#verticalBarShadow)"
                    />
                    {loss > 0 ? (
                      <line
                        x1={x + 4}
                        x2={x + barWidth - 4}
                        y1={availableY}
                        y2={availableY}
                        stroke="rgba(255,255,255,0.78)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    ) : null}
                    <text x={x + barWidth / 2} y={topPadding + plotHeight - totalHeight - 10} textAnchor="middle" className="fill-[var(--brand-ink)] text-[10px] font-black">
                      {item.previousCount}
                    </text>
                    <text x={x + barWidth / 2} y={topPadding + plotHeight + 18} textAnchor="end" transform={`rotate(-45 ${x + barWidth / 2} ${topPadding + plotHeight + 18})`} className="fill-[var(--brand-muted)] text-[10px] font-bold">
                      {label}
                    </text>
                    <text x={x + barWidth / 2} y={topPadding + plotHeight + 76} textAnchor="middle" className="fill-[var(--brand-ink)] text-[10px] font-black">
                      {item.count} avail
                    </text>
                    <text x={x + barWidth / 2} y={topPadding + plotHeight + 90} textAnchor="middle" className="fill-[var(--brand-danger)] text-[9px] font-bold">
                      {loss > 0 ? `${loss} placed` : "0 placed"}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-[rgba(15,23,42,0.08)] bg-white/90 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black tracking-tight text-[var(--brand-ink)]">Depletion watchlist</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--brand-body)]">
                  Shortest inventory runway based on the current seven-day placement pace.
                </p>
              </div>
              <span className="rounded-full bg-[rgba(201,18,41,0.08)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--brand-danger)]">
                Live risk
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {watchlist.map((item) => {
                const loss = Math.abs(Math.min(item.sevenDayChange, 0));
                const daysRemaining = getDaysRemaining(item);
                const isSelected = selectedInterest === item.interest;
                const runwayPercent = daysRemaining ? Math.max(100 - (Math.min(daysRemaining, 60) / 60) * 100, 8) : 0;

                return (
                  <button
                    key={item.interest}
                    type="button"
                    onClick={() => onSelect(item)}
                    className={`w-full rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected ? "border-[rgba(0,94,184,0.28)] bg-[rgba(0,94,184,0.04)] shadow-sm" : "border-[rgba(15,23,42,0.07)] bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[var(--brand-ink)]">{formatInterestLabel(item.interest)}</p>
                        <p className="mt-0.5 text-xs text-[var(--brand-muted)]">{item.count} available · {loss} placed in 7d</p>
                      </div>
                      <div className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[var(--brand-danger)] shadow-sm ring-1 ring-[rgba(201,18,41,0.12)]">
                        {daysRemaining ? `${daysRemaining}d` : "Stable"}
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(15,23,42,0.07)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[rgba(255,87,0,0.55)] to-[var(--brand-danger)]"
                        style={{ width: `${runwayPercent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[rgba(15,23,42,0.08)] bg-white/90 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <h3 className="font-black tracking-tight text-[var(--brand-ink)]">Design language</h3>
            <dl className="mt-3 space-y-3 text-xs leading-5 text-[var(--brand-body)]">
              <div className="flex gap-2">
                <dt className="mt-1 h-2.5 w-7 rounded-full bg-gradient-to-r from-[#003554] via-[#005eb8] to-[#58b6d2] shadow-sm" />
                <dd><span className="font-bold text-[var(--brand-ink)]">Blue bars</span> are profiles still available for that interest.</dd>
              </div>
              <div className="flex gap-2">
                <dt className="mt-1 h-2.5 w-7 rounded-full bg-gradient-to-r from-[#f4b4bb] to-[#c91229]" />
                <dd><span className="font-bold text-[var(--brand-ink)]">Red stack</span> shows profiles placed over the last seven days.</dd>
              </div>
              <div className="flex gap-2">
                <dt className="mt-1 h-2.5 w-7 rounded-full bg-[rgba(15,23,42,0.08)]" />
                <dd><span className="font-bold text-[var(--brand-ink)]">Light rail</span> shows the full y-axis scale without heavy chart ink.</dd>
              </div>
            </dl>
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
  const [mode, setMode] = useState<DashboardMode>("3");
  const [query, setQuery] = useState("");
  const [selectedInterest, setSelectedInterest] = useState<string | null>("basketball");

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

  const allItems = useMemo(() => {
    const total = Object.values(mockInterestData).reduce((sum, count) => sum + count, 0);

    return Object.entries(mockInterestData)
      .map(([interest, count]) => {
        const sevenDayChange = mockInterestSevenDayChangeData[interest as keyof typeof mockInterestSevenDayChangeData] ?? 0;
        const previousCount = Math.max(count - sevenDayChange, 0);
        const sevenDayRate = previousCount > 0 ? (sevenDayChange / previousCount) * 100 : 0;

        return {
          interest,
          count,
          previousCount,
          sevenDayChange,
          sevenDayRate,
          dailyChange: sevenDayChange / 7,
          percent: total > 0 ? (count / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.count - a.count || a.interest.localeCompare(b.interest))
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return allItems;

    return allItems.filter((item) => item.interest.toLowerCase().includes(normalizedQuery));
  }, [allItems, query]);

  const totalSelections = useMemo(
    () => allItems.reduce((sum, item) => sum + item.count, 0),
    [allItems]
  );
  const totalPreviousSelections = useMemo(
    () => allItems.reduce((sum, item) => sum + item.previousCount, 0),
    [allItems]
  );
  const netSevenDayChange = totalSelections - totalPreviousSelections;
  const netSevenDayRate = totalPreviousSelections > 0 ? (netSevenDayChange / totalPreviousSelections) * 100 : 0;
  const maxCount = filteredItems[0]?.count ?? 0;
  const selectedItem = allItems.find((item) => item.interest === selectedInterest) ?? null;
  const activeMode = modeDetails[mode];
  const ActiveModeIcon = activeMode.icon;
  const normalizedAccountType = accountType.toLowerCase();
  const showRpmNav = ENABLE_RPM && !normalizedAccountType.includes("lc");
  const showAdminNav = ENABLE_ADMIN_PANEL && normalizedAccountType.includes("admin");

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
      <section className="rounded-3xl border border-[rgba(0,94,184,0.18)] bg-white/85 p-6 shadow-[var(--brand-shadow-card)] max-md:rounded-2xl max-md:p-4">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(0,94,184,0.08)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--brand-ink)] sm:text-4xl">
              Student interest dashboard
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-body)] sm:text-base">
              Track how many remaining profiles are available for each interest, which interests are abundant or rare, and which profile interests are disappearing fastest.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-surface)] p-2 text-center sm:grid-cols-4">
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <p className="text-2xl font-black text-[var(--brand-ink)]">{totalSelections}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-muted)]">
                Remaining Profiles
              </p>
            </div>
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <p className="text-2xl font-black text-[var(--brand-ink)]">{allItems.length}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-muted)]">
                Interests
              </p>
            </div>
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <p className="text-2xl font-black text-[var(--brand-ink)]">{allItems[0]?.count ?? 0}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-muted)]">
                Most Abundant
              </p>
            </div>
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <p className="text-2xl font-black text-[var(--brand-ink)]">
                {Math.abs(netSevenDayChange)}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-muted)]">
                7d Loss ({Math.abs(netSevenDayChange)} / {Math.abs(netSevenDayRate).toFixed(0)}%)
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-surface)] p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                  Choose implementation
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(modeDetails) as DashboardMode[]).map((modeKey) => {
                    const details = modeDetails[modeKey];
                    const Icon = details.icon;
                    const isActive = mode === modeKey;

                    return (
                      <button
                        key={modeKey}
                        type="button"
                        onClick={() => setMode(modeKey)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-all ${
                          isActive
                            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-md"
                            : "border-[var(--brand-border-soft)] bg-white text-[var(--brand-body)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-ink)]"
                        }`}
                      >
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${isActive ? "bg-white/20" : "bg-[var(--brand-surface-muted)]"}`}>
                          {modeKey}
                        </span>
                        <Icon className="h-4 w-4" />
                        {details.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="min-w-0 xl:w-72">
                <span className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                  <Search className="h-3.5 w-3.5" />
                  Filter interests
                </span>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search basketball, coding..."
                  className="border-[var(--brand-border-soft)] bg-white"
                />
              </label>
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-white/80 p-3 text-sm text-[var(--brand-body)]">
              <ActiveModeIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
              <p>
                <span className="font-bold text-[var(--brand-ink)]">{activeMode.title}:</span>{" "}
                {activeMode.description}
              </p>
            </div>
          </div>

          <InterestDetailCard item={selectedItem} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          {filteredItems.length > 0 ? (
            <>
              {mode === "1" ? (
                <RankedBarsView
                  items={filteredItems}
                  maxCount={maxCount}
                  selectedInterest={selectedInterest}
                  onSelect={(item) => setSelectedInterest(item.interest)}
                />
              ) : null}
              {mode === "2" ? (
                <TopBottomView
                  items={filteredItems}
                  maxCount={maxCount}
                  selectedInterest={selectedInterest}
                  onSelect={(item) => setSelectedInterest(item.interest)}
                />
              ) : null}
              {mode === "3" ? (
                <VelocityBarsView
                  items={filteredItems}
                  maxCount={maxCount}
                  selectedInterest={selectedInterest}
                  onSelect={(item) => setSelectedInterest(item.interest)}
                />
              ) : null}
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--brand-border-soft)] bg-white/80 p-10 text-center shadow-[var(--brand-shadow-soft)]">
              <ListFilter className="mx-auto h-10 w-10 text-[var(--brand-muted)]" />
              <h2 className="mt-3 text-xl font-black text-[var(--brand-ink)]">No interests found</h2>
              <p className="mt-1 text-sm text-[var(--brand-body)]">
                Try a different search term to explore the remaining profile interest data.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-5 shadow-[var(--brand-shadow-soft)]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
              Mock current JSON source
            </p>
            <pre className="mt-3 max-h-[220px] overflow-auto rounded-2xl bg-[var(--brand-ink)] p-4 text-xs leading-5 text-white">
              {JSON.stringify(mockInterestData, null, 2)}
            </pre>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
              Mock 7-day change JSON
            </p>
            <pre className="mt-3 max-h-[220px] overflow-auto rounded-2xl bg-[var(--brand-ink)] p-4 text-xs leading-5 text-white">
              {JSON.stringify(mockInterestSevenDayChangeData, null, 2)}
            </pre>
          </div>
          <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-white/80 p-5 shadow-[var(--brand-shadow-soft)]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
              Future data contract
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-body)]">
              Replace the current remaining-profile counts and seven-day-loss mock objects with API JSON in the same format. The dashboard assumes profile counts only stay flat or decrease, so rarity, depletion rate, lost-per-day values, sorting, rankings, and visuals update automatically.
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
      />
      {content}
      <Footer />
    </div>
  );
}
