import { Award, Calendar, Heart, MapPin, Star } from "lucide-react";
import type { StudentRecord } from "@/features/student-search/types";
import {
  animationStyle,
  formatGender,
  getStatusRingColor,
} from "@/features/student-search/utils";

type CardResultsGridProps = {
  students: StudentRecord[];
  shouldAnimateResults: boolean;
  resultsAnimationKey: number;
  favoritedStudents: Set<string>;
  onSelectStudent: (student: StudentRecord) => void;
  onFavorite: (paxId: string, event?: React.MouseEvent) => void;
  onUnfavorite: (paxId: string, event?: React.MouseEvent) => void;
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
      {students.map((student, index) => (
        <div
          key={student.pax_id.toString()}
          onClick={() => onSelectStudent(student)}
          style={animationStyle(shouldAnimateResults, index)}
          className={`group cursor-pointer border-2 ${getStatusRingColor(
            student.placement_status as string | undefined
          )} rounded-xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all duration-200 relative ${
            shouldAnimateResults ? "results-refresh-item" : ""
          }`}
        >
          <button
            onClick={(event) =>
              favoritedStudents.has(student.pax_id.toString())
                ? onUnfavorite(student.pax_id.toString(), event)
                : onFavorite(student.pax_id.toString(), event)
            }
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

          <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-3 pr-8">
            <div className="flex-1">
              <h2 className="text-slate-900 font-semibold text-base tracking-tight group-hover:text-blue-700 transition-colors duration-200">
                {student.first_name} - {formatGender(student.gender_desc)}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {String(student.usahsid ?? "")}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 px-2.5 py-1.5 rounded-lg font-semibold text-sm border border-blue-200/60 shadow-sm">
              <Award className="w-3.5 h-3.5" />
              {String(student.gpa ?? "-")}
            </div>
          </div>

          <div className="space-y-1 text-sm text-slate-600 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Country</span>
              </div>
              <span className="font-semibold text-slate-700">
                {String(student.country ?? "-")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Grade / Age
              </span>
              <span className="font-semibold text-slate-700">
                {String(student.applying_to_grade ?? "-")} /{" "}
                {String(student.adjusted_age ?? "-")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">English</span>
              <span className="font-semibold text-blue-600">
                {String(student.english_score ?? "-")}
              </span>
            </div>
            <div className="flex items-start justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs font-medium text-slate-500">Program</span>
              </div>
              <span className="font-medium text-slate-700 text-xs text-right leading-tight max-w-[180px]">
                {String(student.program_type ?? "-")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Application Status
              </span>
              <span className="font-semibold text-slate-700">
                {String(student.placement_status ?? "-")}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <p className="text-slate-700 text-xs font-semibold mb-2 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-slate-400" />
              Interests
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(student.selected_interests ?? []).slice(0, 4).map((interest) => (
                <span
                  key={interest}
                  className="bg-gradient-to-br from-slate-50 to-blue-50/50 text-slate-700 text-[11px] px-2 py-1 rounded-md border border-slate-200/60 font-medium hover:border-blue-300 transition-colors duration-200"
                >
                  {interest}
                </span>
              ))}
              {(student.selected_interests ?? []).length > 4 && (
                <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-1 rounded-md font-semibold">
                  +{(student.selected_interests ?? []).length - 4}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
