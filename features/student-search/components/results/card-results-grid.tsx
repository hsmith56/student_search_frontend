import { Award, Calendar, Heart, MapPin, Star } from "lucide-react";
import type { StudentRecord } from "@/features/student-search/types";
import {
  animationStyle,
  formatGender,
  getFavoriteStudentId,
  getStatusRingColor,
} from "@/features/student-search/utils";

type CardResultsGridProps = {
  students: StudentRecord[];
  shouldAnimateResults: boolean;
  resultsAnimationKey: number;
  favoritedStudents: Set<string>;
  onSelectStudent: (student: StudentRecord) => void;
  onFavorite: (appId: string, event?: React.MouseEvent) => void;
  onUnfavorite: (appId: string, event?: React.MouseEvent) => void;
};

export function CardResultsGrid({
  students,
  shouldAnimateResults,
  resultsAnimationKey,
  favoritedStudents,
  onSelectStudent,
  onFavorite,
  onUnfavorite,
}: CardResultsGridProps) {
  return (
    <div
      key={`card-results-${resultsAnimationKey}`}
      className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8 ${
        shouldAnimateResults ? "results-refresh-container" : ""
      }`}
    >
      {students.map((student, index) => {
        const favoriteId = getFavoriteStudentId(student);

        return (
        <div
          key={student.pax_id.toString()}
          onClick={() => onSelectStudent(student)}
          style={animationStyle(shouldAnimateResults, index)}
          className={`group cursor-pointer border-2 ${getStatusRingColor(
            student.placement_status as string | undefined
          )} rounded-xl bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_6px_16px_rgba(0,53,84,0.14)] transition-all duration-200 hover:shadow-[0_12px_24px_rgba(0,53,84,0.2)] relative ${
            shouldAnimateResults ? "results-refresh-item" : ""
          }`}
        >
          <button
            onClick={(event) => {
              if (!favoriteId) return;
              favoritedStudents.has(favoriteId)
                ? onUnfavorite(favoriteId, event)
                : onFavorite(favoriteId, event);
            }}
            className="absolute top-3 right-3 z-10 rounded-full border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.92)] p-1.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-[var(--brand-surface-elevated)]"
          >
            <Heart
              className={`w-4 h-4 ${
                favoritedStudents.has(favoriteId)
                  ? "fill-[var(--brand-danger)] text-[var(--brand-danger)]"
                  : "text-[var(--brand-muted)] hover:text-[var(--brand-danger)]"
              } transition-colors duration-200`}
            />
          </button>

          <div className="mb-3 flex items-start justify-between border-b border-[var(--brand-border-soft)] pb-3 pr-8">
            <div className="flex-1">
              <h2 className="text-base font-semibold tracking-tight text-[var(--brand-ink)] transition-colors duration-200 group-hover:text-[var(--brand-primary)]">
                {student.first_name} - {formatGender(student.gender_desc)}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-[var(--brand-muted)]">
                {String(student.usahsid ?? "")}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-[rgba(0,94,184,0.28)] bg-gradient-to-br from-[rgba(0,94,184,0.08)] to-[rgba(60,159,192,0.08)] px-2.5 py-1.5 text-sm font-semibold text-[var(--brand-primary-deep)] shadow-sm">
              <Award className="w-3.5 h-3.5" />
              {String(student.gpa ?? "-")}
            </div>
          </div>

          <div className="mb-3 space-y-1 text-sm text-[var(--brand-muted)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[var(--brand-muted)]" />
                <span className="text-xs font-medium text-[var(--brand-muted)]">Country</span>
              </div>
              <span className="font-semibold text-[var(--brand-body)]">
                {String(student.country ?? "-")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--brand-muted)]">
                Grade / Age
              </span>
              <span className="font-semibold text-[var(--brand-body)]">
                {String(student.applying_to_grade ?? "-")} /{" "}
                {String(student.adjusted_age ?? "-")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--brand-muted)]">English</span>
              <span className="font-semibold text-[var(--brand-primary)]">
                {String(student.english_score ?? "-")}
              </span>
            </div>
            <div className="flex items-start justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--brand-muted)]" />
                <span className="text-xs font-medium text-[var(--brand-muted)]">Program</span>
              </div>
              <span className="max-w-[180px] text-right text-xs font-medium leading-tight text-[var(--brand-body)]">
                {String(student.program_type ?? "-")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--brand-muted)]">
                Application Status
              </span>
              <span className="font-semibold text-[var(--brand-body)]">
                {String(student.placement_status ?? "-")}
              </span>
            </div>
          </div>

          <div className="border-t border-[var(--brand-border-soft)] pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-body)]">
              <Star className="h-3.5 w-3.5 text-[var(--brand-muted)]" />
              Interests
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(student.selected_interests ?? []).slice(0, 4).map((interest) => (
                <span
                  key={interest}
                  className="rounded-md border border-[var(--brand-border-soft)] bg-gradient-to-br from-[rgba(246,247,248,0.95)] to-[rgba(0,94,184,0.06)] px-2 py-1 text-[11px] font-medium text-[var(--brand-body)] transition-colors duration-200 hover:border-[rgba(0,94,184,0.35)]"
                >
                  {interest}
                </span>
              ))}
              {(student.selected_interests ?? []).length > 4 && (
                <span className="rounded-md bg-[rgba(0,53,84,0.08)] px-2 py-1 text-[11px] font-semibold text-[var(--brand-muted)]">
                  +{(student.selected_interests ?? []).length - 4}
                </span>
              )}
            </div>
          </div>
        </div>
      )})}
    </div>
  );
}
