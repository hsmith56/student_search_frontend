import type { StudentRecord, ViewMode } from "@/features/student-search/types";
import { CardResultsGrid } from "@/features/student-search/components/results/card-results-grid";
import { DesktopCompactResults } from "@/features/student-search/components/results/desktop-compact-results";
import { MobileCompactResults } from "@/features/student-search/components/results/mobile-compact-results";

type ResultsSectionProps = {
  students: StudentRecord[];
  viewMode: ViewMode;
  isMobile: boolean;
  shouldAnimateResults: boolean;
  resultsAnimationKey: number;
  favoritedStudents: Set<string>;
  orderBy: string;
  descending: boolean;
  onToggleSort: (field: string) => void;
  onFavorite: (appId: string, event?: React.MouseEvent) => void;
  onUnfavorite: (appId: string, event?: React.MouseEvent) => void;
};

export function ResultsSection({
  students,
  viewMode,
  isMobile,
  shouldAnimateResults,
  resultsAnimationKey,
  favoritedStudents,
  orderBy,
  descending,
  onToggleSort,
  onFavorite,
  onUnfavorite,
}: ResultsSectionProps) {
  if (viewMode === "card") {
    return (
      <CardResultsGrid
        students={students}
        shouldAnimateResults={shouldAnimateResults}
        resultsAnimationKey={resultsAnimationKey}
        favoritedStudents={favoritedStudents}
        onFavorite={onFavorite}
        onUnfavorite={onUnfavorite}
      />
    );
  }

  if (isMobile) {
    return (
      <MobileCompactResults
        students={students}
        shouldAnimateResults={shouldAnimateResults}
        resultsAnimationKey={resultsAnimationKey}
        favoritedStudents={favoritedStudents}
        onFavorite={onFavorite}
        onUnfavorite={onUnfavorite}
      />
    );
  }

  return (
    <DesktopCompactResults
      students={students}
      shouldAnimateResults={shouldAnimateResults}
      resultsAnimationKey={resultsAnimationKey}
      favoritedStudents={favoritedStudents}
      orderBy={orderBy}
      descending={descending}
      onToggleSort={onToggleSort}
      onFavorite={onFavorite}
      onUnfavorite={onUnfavorite}
    />
  );
}
