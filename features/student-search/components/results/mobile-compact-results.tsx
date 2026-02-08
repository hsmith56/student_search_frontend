import { Award, Heart } from "lucide-react";
import type { StudentRecord } from "@/features/student-search/types";
import {
  animationStyle,
  formatGender,
  getStatusBadgeClass,
  getStatusRingColor,
} from "@/features/student-search/utils";

type MobileCompactResultsProps = {
  students: StudentRecord[];
  shouldAnimateResults: boolean;
  resultsAnimationKey: number;
  favoritedStudents: Set<string>;
  onSelectStudent: (student: StudentRecord) => void;
  onFavorite: (paxId: string, event?: React.MouseEvent) => void;
  onUnfavorite: (paxId: string, event?: React.MouseEvent) => void;
};

export function MobileCompactResults({
  students,
  shouldAnimateResults,
  resultsAnimationKey,
  favoritedStudents,
  onSelectStudent,
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
      {students.map((student, index) => (
        <div
          key={student.pax_id.toString()}
          onClick={() => onSelectStudent(student)}
          style={animationStyle(shouldAnimateResults, index)}
          className={`bg-white/95 backdrop-blur-sm border-2 ${getStatusRingColor(
            student.placement_status as string | undefined
          )} rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer relative ${
            shouldAnimateResults ? "results-refresh-item" : ""
          }`}
        >
          <button
            onClick={(event) => {
              event.stopPropagation();
              favoritedStudents.has(student.pax_id.toString())
                ? onUnfavorite(student.pax_id.toString(), event)
                : onFavorite(student.pax_id.toString(), event);
            }}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 hover:bg-white hover:scale-110 transition-all duration-200 shadow-sm"
          >
            <Heart
              className={`w-4 h-4 ${
                favoritedStudents.has(student.pax_id.toString())
                  ? "fill-pink-500 text-pink-500"
                  : "text-slate-400 hover:text-pink-500"
              } transition-colors duration-200`}
            />
          </button>

          <div className="mb-3 pr-8">
            <h3 className="text-lg font-bold text-slate-900">
              {student.first_name} - {formatGender(student.gender_desc)}
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              {String(student.usahsid ?? "")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500">Country</span>
              <span className="font-semibold text-slate-700 text-sm">
                {String(student.country ?? "-")}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500">GPA</span>
              <span className="font-semibold text-blue-600 text-sm flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                {String(student.gpa ?? "-")}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500">
                Grade / Age
              </span>
              <span className="font-semibold text-slate-700 text-sm">
                {String(student.applying_to_grade ?? "-")} /{" "}
                {String(student.adjusted_age ?? "-")}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500">English</span>
              <span className="font-semibold text-blue-600 text-sm">
                {String(student.english_score ?? "-")}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-2">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500 mb-1">Program</span>
              <span className="font-medium text-slate-700 text-xs leading-tight">
                {String(student.program_type ?? "-")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Status</span>
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
      ))}
    </div>
  );
}
