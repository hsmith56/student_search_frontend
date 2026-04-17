"use client";

import { memo, Profiler } from "react";
import type { StudentRecord, ViewMode } from "@/features/student-search/types";
import { CardResultsGrid } from "@/features/student-search/components/results/card-results-grid";
import { DesktopCompactResults } from "@/features/student-search/components/results/desktop-compact-results";
import { MobileCompactResults } from "@/features/student-search/components/results/mobile-compact-results";
import { isPerfLoggingEnabled, logPerf } from "@/lib/perf-logger";

type ResultsSectionProps = {
  students: StudentRecord[];
  viewMode: ViewMode;
  isMobile: boolean;
  shouldAnimateResults: boolean;
  favoritedStudents: Set<string>;
  orderBy: string;
  descending: boolean;
  onToggleSort: (field: string) => void;
  onFavorite: (appId: string, event?: React.MouseEvent) => void;
  onUnfavorite: (appId: string, event?: React.MouseEvent) => void;
  onOpenSimilarStudents: (student: StudentRecord) => void;
};

export const ResultsSection = memo(function ResultsSection({
  students,
  viewMode,
  isMobile,
  shouldAnimateResults,
  favoritedStudents,
  orderBy,
  descending,
  onToggleSort,
  onFavorite,
  onUnfavorite,
  onOpenSimilarStudents,
}: ResultsSectionProps) {
  const handleProfilerRender = (
    _id: string,
    phase: "mount" | "update" | "nested-update",
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    if (!isPerfLoggingEnabled()) return;

    logPerf("studentSearch.resultsRender", {
      phase,
      student_count: students.length,
      view_mode: viewMode,
      is_mobile: isMobile,
      actual_duration_ms: Number(actualDuration.toFixed(2)),
      base_duration_ms: Number(baseDuration.toFixed(2)),
      start_time_ms: Number(startTime.toFixed(2)),
      commit_time_ms: Number(commitTime.toFixed(2)),
    });
  };

  if (viewMode === "card") {
    return (
      <CardResultsGrid
        students={students}
        shouldAnimateResults={shouldAnimateResults}
        favoritedStudents={favoritedStudents}
        onFavorite={onFavorite}
        onUnfavorite={onUnfavorite}
        onOpenSimilarStudents={onOpenSimilarStudents}
      />
    );
  }

  if (isMobile) {
    return (
      <MobileCompactResults
        students={students}
        shouldAnimateResults={shouldAnimateResults}
        favoritedStudents={favoritedStudents}
        onFavorite={onFavorite}
        onUnfavorite={onUnfavorite}
        onOpenSimilarStudents={onOpenSimilarStudents}
      />
    );
  }

  return (
    <Profiler id="results-section" onRender={handleProfilerRender}>
      <DesktopCompactResults
        students={students}
        shouldAnimateResults={shouldAnimateResults}
        favoritedStudents={favoritedStudents}
        orderBy={orderBy}
        descending={descending}
        onToggleSort={onToggleSort}
        onFavorite={onFavorite}
        onUnfavorite={onUnfavorite}
        onOpenSimilarStudents={onOpenSimilarStudents}
      />
    </Profiler>
  );
}, areResultsSectionPropsEqual);

function areResultsSectionPropsEqual(
  prev: ResultsSectionProps,
  next: ResultsSectionProps
) {
  return (
    prev.students === next.students &&
    prev.viewMode === next.viewMode &&
    prev.isMobile === next.isMobile &&
    prev.shouldAnimateResults === next.shouldAnimateResults &&
    prev.favoritedStudents === next.favoritedStudents &&
    prev.orderBy === next.orderBy &&
    prev.descending === next.descending &&
    prev.onToggleSort === next.onToggleSort &&
    prev.onFavorite === next.onFavorite &&
    prev.onUnfavorite === next.onUnfavorite &&
    prev.onOpenSimilarStudents === next.onOpenSimilarStudents
  );
}
