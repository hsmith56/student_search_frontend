type PerfPayload = Record<string, unknown>;

const isDev = process.env.NODE_ENV === "development";

export const isPerfLoggingEnabled = () => isDev;

export const logPerf = (label: string, payload: PerfPayload = {}) => {
  if (!isPerfLoggingEnabled()) return;

  console.info(`[perf] ${label}`, payload);
};

export const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export const elapsedMs = (startTime: number) =>
  Number((now() - startTime).toFixed(2));
