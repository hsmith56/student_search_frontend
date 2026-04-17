import posthog from "posthog-js";
import { logPerf } from "@/lib/perf-logger";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  // Include the defaults option as required by PostHog
  defaults: "2026-01-30",
  // Enables capturing unhandled exceptions via Error Tracking
  capture_exceptions: true,
  // Turn on debug in development mode
  debug: process.env.NODE_ENV === "development",
});

if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  window.addEventListener("load", () => {
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    if (navigation) {
      logPerf("navigation", {
        dom_content_loaded_ms: Number(
          (navigation.domContentLoadedEventEnd - navigation.startTime).toFixed(2)
        ),
        load_event_ms: Number((navigation.loadEventEnd - navigation.startTime).toFixed(2)),
        transfer_size: navigation.transferSize,
      });
    }

    logPerf("perf_js.ready", {
      helpers: ["window.perf_js.latest()", "window.perf_js.summary()", "window.perf_js.print()"],
    });
  });

  if ("PerformanceObserver" in window) {
    const longTaskObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.entryType === "longtask") {
          logPerf("longtask", {
            duration_ms: Number(entry.duration.toFixed(2)),
            name: entry.name,
            start_time_ms: Number(entry.startTime.toFixed(2)),
          });
        }
      }
    });
    longTaskObserver.observe({ entryTypes: ["longtask"] });

    const paintObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.entryType === "paint") {
          logPerf(`paint.${entry.name}`, {
            start_time_ms: Number(entry.startTime.toFixed(2)),
            duration_ms: Number(entry.duration.toFixed(2)),
          });
        }
      }
    });
    paintObserver.observe({ type: "paint", buffered: true });

    let cumulativeLayoutShift = 0;
    const layoutShiftObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const shiftEntry = entry as PerformanceEntry & {
          value?: number;
          hadRecentInput?: boolean;
        };

        if (!shiftEntry.hadRecentInput) {
          cumulativeLayoutShift += shiftEntry.value ?? 0;
          logPerf("render.layout_shift", {
            delta: Number((shiftEntry.value ?? 0).toFixed(4)),
            cls: Number(cumulativeLayoutShift.toFixed(4)),
            start_time_ms: Number(shiftEntry.startTime.toFixed(2)),
          });
        }
      }
    });
    layoutShiftObserver.observe({ type: "layout-shift", buffered: true });

    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (!lastEntry) return;

      logPerf("render.lcp", {
        start_time_ms: Number(lastEntry.startTime.toFixed(2)),
        size: (lastEntry as PerformanceEntry & { size?: number }).size,
      });
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  }
}
