type PerfPayload = Record<string, unknown>;

type PerfEvent = {
  label: string;
  payload: PerfPayload;
  at_iso: string;
  since_page_load_ms: number;
};

type HotPathSummary = {
  id: string;
  commits: number;
  hot_commits: number;
  avg_actual_duration_ms: number;
  p95_actual_duration_ms: number;
  max_actual_duration_ms: number;
  total_actual_duration_ms: number;
  avg_start_to_commit_ms: number;
};

type PerfSummary = {
  total_events: number;
  labels: Record<string, number>;
  render_commit_count: number;
  top_hotpaths: HotPathSummary[];
};

type PerfJs = {
  events: PerfEvent[];
  latest: (count?: number) => PerfEvent[];
  clear: () => void;
  summary: () => PerfSummary;
  print: (count?: number) => void;
};

declare global {
  interface Window {
    perf_js?: PerfJs;
  }
}

const isDev = process.env.NODE_ENV === "development";
const MAX_STORED_EVENTS = 500;

export const isPerfLoggingEnabled = () => isDev;

const perfNow = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const asNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const percentile = (values: number[], percentileRank: number) => {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileRank / 100) * sorted.length) - 1)
  );

  return Number(sorted[index].toFixed(2));
};

const ensurePerfJs = (): PerfJs | undefined => {
  if (typeof window === "undefined") return undefined;

  if (window.perf_js) return window.perf_js;

  const state: PerfJs = {
    events: [],
    latest: (count = 20) => state.events.slice(Math.max(state.events.length - count, 0)),
    clear: () => {
      state.events.length = 0;
    },
    summary: () => {
      const labels = state.events.reduce<Record<string, number>>((acc, event) => {
        acc[event.label] = (acc[event.label] ?? 0) + 1;
        return acc;
      }, {});

      const groupedByPath = new Map<
        string,
        {
          actualDurations: number[];
          startToCommitDurations: number[];
          hotCommits: number;
        }
      >();

      state.events.forEach((event) => {
        if (event.label !== "render.commit") return;

        const id = typeof event.payload.id === "string" ? event.payload.id : "unknown";
        const actualDuration = asNumber(event.payload.actual_duration_ms);
        const startToCommitDuration = asNumber(event.payload.start_to_commit_ms);
        const isHotCommit = event.payload.hot_path === true;

        if (actualDuration === null) return;

        const existing = groupedByPath.get(id) ?? {
          actualDurations: [],
          startToCommitDurations: [],
          hotCommits: 0,
        };

        existing.actualDurations.push(actualDuration);
        if (startToCommitDuration !== null) {
          existing.startToCommitDurations.push(startToCommitDuration);
        }
        if (isHotCommit) {
          existing.hotCommits += 1;
        }

        groupedByPath.set(id, existing);
      });

      const topHotpaths = [...groupedByPath.entries()]
        .map<HotPathSummary>(([id, stats]) => {
          const totalActualDuration = stats.actualDurations.reduce((sum, value) => sum + value, 0);
          const maxActualDuration = Math.max(...stats.actualDurations);
          const avgActualDuration = totalActualDuration / stats.actualDurations.length;
          const avgStartToCommit =
            stats.startToCommitDurations.length > 0
              ? stats.startToCommitDurations.reduce((sum, value) => sum + value, 0) /
                stats.startToCommitDurations.length
              : 0;

          return {
            id,
            commits: stats.actualDurations.length,
            hot_commits: stats.hotCommits,
            avg_actual_duration_ms: Number(avgActualDuration.toFixed(2)),
            p95_actual_duration_ms: percentile(stats.actualDurations, 95),
            max_actual_duration_ms: Number(maxActualDuration.toFixed(2)),
            total_actual_duration_ms: Number(totalActualDuration.toFixed(2)),
            avg_start_to_commit_ms: Number(avgStartToCommit.toFixed(2)),
          };
        })
        .sort((left, right) => {
          if (right.total_actual_duration_ms !== left.total_actual_duration_ms) {
            return right.total_actual_duration_ms - left.total_actual_duration_ms;
          }

          return right.p95_actual_duration_ms - left.p95_actual_duration_ms;
        })
        .slice(0, 5);

      return {
        total_events: state.events.length,
        labels,
        render_commit_count: labels["render.commit"] ?? 0,
        top_hotpaths: topHotpaths,
      };
    },
    print: (count = 20) => {
      console.table(state.latest(count));
    },
  };

  window.perf_js = state;
  return state;
};

export const logPerf = (label: string, payload: PerfPayload = {}) => {
  if (!isPerfLoggingEnabled()) return;

  const event: PerfEvent = {
    label,
    payload,
    at_iso: new Date().toISOString(),
    since_page_load_ms: Number(perfNow().toFixed(2)),
  };

  const perfJs = ensurePerfJs();
  if (perfJs) {
    perfJs.events.push(event);
    if (perfJs.events.length > MAX_STORED_EVENTS) {
      perfJs.events.splice(0, perfJs.events.length - MAX_STORED_EVENTS);
    }
  }

  console.info(`[perf] ${label}`, payload);
  console.info("[perf_js]", event);
};

export const now = perfNow;

export const elapsedMs = (startTime: number) => Number((now() - startTime).toFixed(2));
