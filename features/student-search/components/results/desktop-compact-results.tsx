import { Award, ChevronDown, ChevronUp, Heart } from "lucide-react";
import type { StudentRecord } from "@/features/student-search/types";
import {
  animationStyle,
  formatGender,
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
  onSelectStudent: (student: StudentRecord) => void;
  onFavorite: (paxId: string, event?: React.MouseEvent) => void;
  onUnfavorite: (paxId: string, event?: React.MouseEvent) => void;
};

export function DesktopCompactResults({
  students,
  shouldAnimateResults,
  resultsAnimationKey,
  favoritedStudents,
  orderBy,
  descending,
  onToggleSort,
  onSelectStudent,
  onFavorite,
  onUnfavorite,
}: DesktopCompactResultsProps) {
  const headerCellClass =
    "px-2.5 md:px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-body)]";
  const bodyCellClass =
    "px-2.5 md:px-3 py-2.5 text-[13px] leading-5 font-normal text-[var(--brand-body)]";

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
            <col style={{ width: "8%" }} />
            <col style={{ width: "29%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "7%" }} />
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
              <th className={headerCellClass}>
                <SortableHeader
                  label="Country"
                  isActive={orderBy === "country"}
                  descending={descending}
                  onClick={() => onToggleSort("country")}
                />
              </th>
              <th className={headerCellClass}>
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
            {students.map((student, index) => (
              <tr
                key={student.pax_id.toString()}
                onClick={() => onSelectStudent(student)}
                style={animationStyle(shouldAnimateResults, index)}
                className={`cursor-pointer transition-colors duration-150 hover:bg-[rgba(0,94,184,0.07)] ${
                  shouldAnimateResults ? "results-refresh-item" : ""
                }`}
              >
                <td
                  className="truncate px-2 py-2.5 text-[13px] font-normal leading-5 text-[var(--brand-body)] md:px-2.5"
                  title={String(student.first_name ?? "-")}
                >
                  {String(student.first_name ?? "-")}
                </td>
                <td className={bodyCellClass}>
                  {formatGender(student.gender_desc)}
                </td>
                <td className="px-2.5 py-2.5 font-mono text-[12px] text-[var(--brand-muted)] md:px-3">
                  {String(student.usahsid ?? "")}
                </td>
                <td className={bodyCellClass}>
                  {String(student.country ?? "-")}
                </td>
                <td
                  className="whitespace-normal break-words px-2.5 py-2.5 text-[13px] font-normal leading-5 text-[var(--brand-body)] md:px-3"
                  title={
                    Array.isArray(student.selected_interests)
                      ? student.selected_interests.join(", ")
                      : ""
                  }
                >
                  {Array.isArray(student.selected_interests) &&
                  student.selected_interests.length > 0
                    ? student.selected_interests.join(", ")
                    : "-"}
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
                      favoritedStudents.has(student.pax_id.toString())
                        ? onUnfavorite(student.pax_id.toString(), event)
                        : onFavorite(student.pax_id.toString(), event);
                    }}
                    className="rounded-full p-1.5 transition-all duration-200 hover:bg-[rgba(0,94,184,0.08)]"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        favoritedStudents.has(student.pax_id.toString())
                          ? "fill-[var(--brand-danger)] text-[var(--brand-danger)]"
                          : "text-[var(--brand-muted)] hover:text-[var(--brand-danger)]"
                      } transition-colors duration-200`}
                    />
                  </button>
                </td>
              </tr>
            ))}
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
