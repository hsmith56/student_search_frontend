import { Award, Heart } from "lucide-react";
import type { StudentRecord } from "@/features/student-search/types";
import {
  animationStyle,
  formatGender,
  getFavoriteStudentId,
  getStatusBadgeClass,
  getStatusRingColor,
} from "@/features/student-search/utils";

type MobileCompactResultsProps = {
  students: StudentRecord[];
  shouldAnimateResults: boolean;
  resultsAnimationKey: number;
  favoritedStudents: Set<string>;
  onFavorite: (appId: string, event?: React.MouseEvent) => void;
  onUnfavorite: (appId: string, event?: React.MouseEvent) => void;
};

export function MobileCompactResults({
  students,
  shouldAnimateResults,
  resultsAnimationKey,
  favoritedStudents,
  onFavorite,
  onUnfavorite,
}: MobileCompactResultsProps) {
  return (
    <div
      key={`mobile-results-${resultsAnimationKey}`}
      className={`space-y-3 mb-8 ${
        shouldAnimateResults ? "results-refresh-container" : ""
      }`}
    >
      {students.map((student, index) => {
        const favoriteId = getFavoriteStudentId(student);
        const appId = student.app_id?.toString() ?? "";
        const hasAppId = appId.trim().length > 0;
        const profileHref = hasAppId
          ? `/StudentProfile?id=${encodeURIComponent(appId)}`
          : "";
        const beaconHref = hasAppId
          ? `https://beacon.ciee.org/participant/${encodeURIComponent(appId)}`
          : "";

        return (
        <div
          key={student.pax_id.toString()}
          style={animationStyle(shouldAnimateResults, index)}
          className={`border-2 ${getStatusRingColor(
            student.placement_status as string | undefined
          )} relative rounded-xl bg-[rgba(253,254,255,0.95)] p-4 shadow-md shadow-[rgba(0,53,84,0.12)] transition-all duration-200 hover:shadow-lg hover:shadow-[rgba(0,53,84,0.16)] backdrop-blur-sm ${
            shouldAnimateResults ? "results-refresh-item" : ""
          }`}
        >
          <button
            onClick={(event) => {
              event.stopPropagation();
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

          <div className="mb-3 pr-8">
            <h3 className="text-lg font-bold text-[var(--brand-ink)]">
              {hasAppId ? (
                <a
                  href={profileHref}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-[rgba(0,94,184,0.35)] underline-offset-3 transition hover:text-[var(--brand-primary)]"
                >
                  {student.first_name} - {formatGender(student.gender_desc)}
                </a>
              ) : (
                <>
                  {student.first_name} - {formatGender(student.gender_desc)}
                </>
              )}
            </h3>
            <p className="font-mono text-xs text-[var(--brand-muted)]">
              {hasAppId ? (
                <a
                  href={beaconHref}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-[rgba(0,53,84,0.35)] underline-offset-2 transition hover:text-[var(--brand-primary-deep)]"
                >
                  {String(student.usahsid ?? "")}
                </a>
              ) : (
                String(student.usahsid ?? "")
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[var(--brand-muted)]">Country</span>
              <span className="text-sm font-semibold text-[var(--brand-body)]">
                {String(student.country ?? "-")}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[var(--brand-muted)]">GPA</span>
              <span className="flex items-center gap-1 text-sm font-semibold text-[var(--brand-primary)]">
                <Award className="w-3.5 h-3.5" />
                {String(student.gpa ?? "-")}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[var(--brand-muted)]">
                Grade / Age
              </span>
              <span className="text-sm font-semibold text-[var(--brand-body)]">
                {String(student.applying_to_grade ?? "-")} /{" "}
                {String(student.adjusted_age ?? "-")}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[var(--brand-muted)]">English</span>
              <span className="text-sm font-semibold text-[var(--brand-primary)]">
                {String(student.english_score ?? "-")}
              </span>
            </div>
          </div>

          <div className="space-y-2 border-t border-[var(--brand-border-soft)] pt-3">
            <div className="flex flex-col">
              <span className="mb-1 text-xs font-medium text-[var(--brand-muted)]">Program</span>
              <span className="text-xs font-medium leading-tight text-[var(--brand-body)]">
                {String(student.program_type ?? "-")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--brand-muted)]">Status</span>
              <span
                className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${getStatusBadgeClass(
                  student.placement_status as string | undefined
                )}`}
              >
                {String(student.placement_status ?? "-")}
              </span>
            </div>
          </div>
        </div>
      )})}
    </div>
  );
}
