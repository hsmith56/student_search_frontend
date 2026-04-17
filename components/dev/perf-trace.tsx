"use client";

import { Profiler, useEffect, useRef, type ReactNode } from "react";
import { isPerfLoggingEnabled, logPerf, now } from "@/lib/perf-logger";

type PerfTraceProps = {
  id: string;
  children: ReactNode;
  metadata?: Record<string, unknown>;
  hotPathThresholdMs?: number;
};

export default function PerfTrace({
  id,
  children,
  metadata = {},
  hotPathThresholdMs = 24,
}: PerfTraceProps) {
  const shouldTrace = isPerfLoggingEnabled();
  const mountStartRef = useRef(now());
  const metadataRef = useRef(metadata);

  useEffect(() => {
    metadataRef.current = metadata;
  }, [metadata]);

  useEffect(() => {
    if (!shouldTrace) return;

    const rafId = window.requestAnimationFrame(() => {
      logPerf("render.mounted", {
        id,
        mount_to_first_paint_ms: Number((now() - mountStartRef.current).toFixed(2)),
        ...metadataRef.current,
      });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      logPerf("render.unmounted", { id, ...metadataRef.current });
    };
  }, [id, shouldTrace]);

  if (!shouldTrace) {
    return <>{children}</>;
  }

  return (
    <Profiler
      id={id}
      onRender={(
        profilerId,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime
      ) => {
        const actualMs = Number(actualDuration.toFixed(2));

        logPerf("render.commit", {
          id: profilerId,
          phase,
          actual_duration_ms: actualMs,
          base_duration_ms: Number(baseDuration.toFixed(2)),
          start_to_commit_ms: Number((commitTime - startTime).toFixed(2)),
          hot_path: actualMs >= hotPathThresholdMs,
          ...metadataRef.current,
        });
      }}
    >
      {children}
    </Profiler>
  );
}
