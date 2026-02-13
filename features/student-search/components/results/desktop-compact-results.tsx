import { useState } from "react";
import { Award, ChevronDown, ChevronUp, Heart } from "lucide-react";
import type { StudentRecord } from "@/features/student-search/types";
import {
  animationStyle,
  formatGender,
  getFavoriteStudentId,
  getStatusBadgeClass,
} from "@/features/student-search/utils";

type DesktopCompactResultsProps = {
  students: StudentRecord[];
  shouldAnimateResults: boolean;
  resultsAnimationKey: number;
  favoritedStudents: Set<string>;
  orderBy: string;
  descending: boolean;
  onToggleSort: (field: string) => void;
  onFavorite: (appId: string, event?: React.MouseEvent) => void;
  onUnfavorite: (appId: string, event?: React.MouseEvent) => void;
};

const getRowId = (student: StudentRecord) => String(student.pax_id);

const toStringList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];

export function DesktopCompactResults({
  students,
  shouldAnimateResults,
  resultsAnimationKey,
  favoritedStudents,
  orderBy,
  descending,
  onToggleSort,
  onFavorite,
  onUnfavorite,
}: DesktopCompactResultsProps) {
  const [rowsShowingStates, setRowsShowingStates] = useState<Set<string>>(
    () => new Set()
  );

  const headerCellClass =
    "px-2.5 md:px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-body)]";
  const bodyCellClass =
    "px-2.5 md:px-3 py-2.5 text-[13px] leading-5 font-normal text-[var(--brand-body)]";
  const countryHeaderCellClass =
    "pl-2.5 pr-1.5 md:pl-3 md:pr-2 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-body)]";
  const interestsHeaderCellClass =
    "pl-1.5 pr-2.5 md:pl-2 md:pr-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-body)]";
  const countryBodyCellClass =
    "pl-2.5 pr-1.5 md:pl-3 md:pr-2 py-2.5 text-[13px] leading-5 font-normal text-[var(--brand-body)]";
  const interestsBodyCellClass =
    "whitespace-normal break-words pl-1.5 pr-2.5 md:pl-2 md:pr-3 py-2.5 text-[13px] font-normal leading-5 text-[var(--brand-body)]";

  return (
    <div
      key={`desktop-results-${resultsAnimationKey}`}
      className={`mb-8 overflow-hidden rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] shadow-lg shadow-[rgba(0,53,84,0.08)] backdrop-blur-sm ${
        shouldAnimateResults ? "results-refresh-container" : ""
      }`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] table-fixed">
          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "25%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "4%" }} />
          </colgroup>
          <thead className="border-b border-[var(--brand-border-soft)] bg-[rgba(0,53,84,0.05)]">
            <tr>
              <th className={headerCellClass}>
                <SortableHeader
                  label="Name"
                  isActive={orderBy === "first_name"}
                  descending={descending}
                  onClick={() => onToggleSort("first_name")}
                />
              </th>
              <th className={headerCellClass}>
                Gender
              </th>
              <th className={headerCellClass}>
                ID
              </th>
              <th className={countryHeaderCellClass}>
                <SortableHeader
                  label="Country"
                  isActive={orderBy === "country"}
                  descending={descending}
                  onClick={() => onToggleSort("country")}
                />
              </th>
              <th className={interestsHeaderCellClass}>
                Interests
              </th>
              <th className={headerCellClass}>
                <SortableHeader
                  label="GPA"
                  isActive={orderBy === "gpa"}
                  descending={descending}
                  onClick={() => onToggleSort("gpa")}
                />
              </th>
              <th className={headerCellClass}>
                <SortableHeader
                  label="Grade/Age"
                  isActive={orderBy === "adjusted_age"}
                  descending={descending}
                  onClick={() => onToggleSort("adjusted_age")}
                />
              </th>
              <th className={headerCellClass}>
                English
              </th>
              <th className={headerCellClass}>
                Program
              </th>
              <th className={headerCellClass}>
                <SortableHeader
                  label="Status"
                  isActive={orderBy === "placement_status"}
                  descending={descending}
                  onClick={() => onToggleSort("placement_status")}
                />
              </th>
              <th className="px-2.5 md:px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-body)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-border-soft)]">
            {students.map((student, index) => {
              const favoriteId = getFavoriteStudentId(student);
              const appId = student.app_id?.toString() ?? "";
              const hasAppId = appId.trim().length > 0;
              const rowId = getRowId(student);
              const states = toStringList(student.states);
              const hasStates = states.length > 0;
              const isShowingStates = rowsShowingStates.has(rowId);
              const interests = toStringList(student.selected_interests);
              const interestsText = interests.length > 0 ? interests.join(", ") : "-";
              const statesText = states.join(", ");
              const shouldShowStates = hasStates && isShowingStates;
              const interestsDisplayText = shouldShowStates ? statesText : interestsText;
              const interestsTitle = hasStates
                ? `Interests: ${interestsText} | States: ${statesText}`
                : interestsText;
              const profileHref = hasAppId
                ? `/StudentProfile?id=${encodeURIComponent(appId)}`
                : "";
              const beaconHref = hasAppId
                ? `https://beacon.ciee.org/participant/${encodeURIComponent(appId)}`
                : "";

              return (
              <tr
                key={student.pax_id.toString()}
                style={animationStyle(shouldAnimateResults, index)}
                onClick={() => {
                  if (!hasStates) return;
                  setRowsShowingStates((previous) => {
                    const next = new Set(previous);
                    if (next.has(rowId)) {
                      next.delete(rowId);
                    } else {
                      next.add(rowId);
                    }
                    return next;
                  });
                }}
                className={`${hasStates ? "cursor-pointer" : ""} ${
                  shouldAnimateResults ? "results-refresh-item" : ""
                }`}
              >
                <td
                  className="truncate px-2 py-2.5 text-[13px] font-normal leading-5 text-[var(--brand-body)] md:px-2.5"
                  title={String(student.first_name ?? "-")}
                >
                  {hasAppId ? (
                    <a
                      href={profileHref}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="font-semibold text-[var(--brand-primary-deep)] underline decoration-[rgba(0,94,184,0.35)] underline-offset-2 transition hover:text-[var(--brand-primary)]"
                    >
                      {String(student.first_name ?? "-")}
                    </a>
                  ) : (
                    String(student.first_name ?? "-")
                  )}
                </td>
                <td className={bodyCellClass}>
                  {formatGender(student.gender_desc)}
                </td>
                <td className="px-2.5 py-2.5 font-mono text-[12px] text-[rgba(255,87,0,0.72)] md:px-3">
                  {hasAppId ? (
                    <a
                      href={beaconHref}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="underline decoration-[rgba(255,87,0,0.4)] underline-offset-2 transition hover:text-[var(--brand-accent)]"
                    >
                      {String(student.usahsid ?? "")}
                    </a>
                  ) : (
                    String(student.usahsid ?? "")
                  )}
                </td>
                <td className={countryBodyCellClass}>
                  {String(student.country ?? "-")}
                  {hasStates ? " 📍" : ""}
                </td>
                <td
                  className={interestsBodyCellClass}
                  title={interestsTitle}
                >
                  {interestsDisplayText}
                </td>
                <td className="px-2.5 md:px-3 py-2.5">
                  <span className="inline-flex items-center gap-1 rounded-md border border-[rgba(0,94,184,0.28)] bg-gradient-to-br from-[rgba(0,94,184,0.08)] to-[rgba(60,159,192,0.08)] px-2 py-1 text-[12px] font-semibold text-[var(--brand-primary-deep)]">
                    <Award className="w-3 h-3" />
                    {String(student.gpa ?? "-")}
                  </span>
                </td>
                <td className="px-2.5 py-2.5 text-[13px] font-medium leading-5 text-[var(--brand-body)] md:px-3">
                  {String(student.applying_to_grade ?? "-")} /{" "}
                  {String(student.adjusted_age ?? "-")}
                </td>
                <td className={bodyCellClass}>
                  {String(student.english_score ?? "-")}
                </td>
                <td
                  className="truncate px-2.5 py-2.5 text-[13px] font-normal leading-5 text-[var(--brand-body)] md:px-3"
                  title={String(student.program_type ?? "")}
                >
                  {String(student.program_type ?? "-")}
                </td>
                <td className="px-2.5 md:px-3 py-2.5">
                  <span
                    className={`inline-block whitespace-nowrap px-2 py-1 rounded-md text-[12px] font-medium ${getStatusBadgeClass(
                      student.placement_status as string | undefined
                    )}`}
                  >
                    {String(student.placement_status ?? "-")}
                  </span>
                </td>
                <td className="px-2.5 md:px-3 py-2.5 text-center">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!favoriteId) return;
                      favoritedStudents.has(favoriteId)
                        ? onUnfavorite(favoriteId, event)
                        : onFavorite(favoriteId, event);
                    }}
                    className="rounded-full p-1.5 transition-all duration-200 hover:bg-[rgba(0,94,184,0.08)]"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        favoritedStudents.has(favoriteId)
                          ? "fill-[var(--brand-danger)] text-[var(--brand-danger)]"
                          : "text-[var(--brand-muted)] hover:text-[var(--brand-danger)]"
                      } transition-colors duration-200`}
                    />
                  </button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type SortableHeaderProps = {
  label: string;
  isActive: boolean;
  descending: boolean;
  onClick: () => void;
};

function SortableHeader({
  label,
  isActive,
  descending,
  onClick,
}: SortableHeaderProps) {
  return (
    <div
      className="flex items-center gap-1.5 cursor-pointer select-none"
      onClick={onClick}
    >
      <span>{label}</span>
      {isActive && (
        <span className="text-[var(--brand-muted)]">
          {descending ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </span>
      )}
    </div>
  );
}
