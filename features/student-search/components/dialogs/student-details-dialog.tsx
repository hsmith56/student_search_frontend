import { GraduationCap, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StudentRecord } from "@/features/student-search/types";
import {
  formatGender,
  getFavoriteStudentId,
  textOrNotProvided,
} from "@/features/student-search/utils";

type StudentDetailsDialogProps = {
  selectedStudent: StudentRecord | null;
  selectedStudentMediaLink: string;
  favoritedStudents: Set<string>;
  onFavorite: (appId: string) => void;
  onUnfavorite: (appId: string) => void;
  onClose: () => void;
};

export function StudentDetailsDialog({
  selectedStudent,
  selectedStudentMediaLink,
  favoritedStudents,
  onFavorite,
  onUnfavorite,
  onClose,
}: StudentDetailsDialogProps) {
  const hasMedia = selectedStudentMediaLink.length > 0;

  return (
    <Dialog open={!!selectedStudent} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-[940px] border-stone-300 bg-[#f4eee4]/95 p-0 shadow-[0_24px_70px_-36px_rgba(41,30,22,0.72)] max-h-[88vh] overflow-y-auto rounded-3xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {selectedStudent && (() => {
          const favoriteId = getFavoriteStudentId(selectedStudent);
          const isFavorited = favoriteId ? favoritedStudents.has(favoriteId) : false;

          return (
          <div className="rounded-3xl border border-stone-300/90 bg-[#fffdf9]/90 p-5 sm:p-7">
            <DialogHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
                    <a
                      href={`/StudentProfile?id=${selectedStudent.app_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="decoration-stone-400 underline-offset-4 transition hover:text-stone-700 hover:underline"
                    >
                      {textOrNotProvided(selectedStudent.first_name)}
                    </a>
                  </DialogTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <a
                      href={`https://beacon.ciee.org/participant/${selectedStudent.app_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center rounded-full border border-stone-300 bg-white px-3 font-semibold uppercase tracking-[0.14em] text-stone-700 transition hover:border-stone-400"
                    >
                      USAHS ID {textOrNotProvided(selectedStudent.usahsid)}
                    </a>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <button
                    onClick={() =>
                      favoriteId ? (isFavorited ? onUnfavorite(favoriteId) : onFavorite(favoriteId)) : undefined
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700 transition hover:border-stone-500"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isFavorited
                          ? "fill-pink-500 text-pink-500"
                          : "text-stone-500"
                      }`}
                    />
                    {isFavorited ? "Favorited" : "Add Favorite"}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      try {
                        const text = selectedStudent.usahsid?.toString() ?? "";
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(text);
                        } else {
                          const textarea = document.createElement("textarea");
                          textarea.value = text;
                          textarea.setAttribute("readonly", "");
                          textarea.style.position = "absolute";
                          textarea.style.left = "-9999px";
                          document.body.appendChild(textarea);
                          textarea.select();
                          document.execCommand("copy");
                          document.body.removeChild(textarea);
                        }
                      } catch (error) {
                        console.error(error);
                      }
                    }}
                    title="Copy USAHS ID"
                    aria-label="Copy USAHS ID"
                    className="inline-flex h-9 items-center gap-1 rounded-full border border-stone-300 bg-white px-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700 transition hover:border-stone-500"
                  >
                    Copy ID
                  </button>
                </div>
              </div>
            </DialogHeader>

            <div
              className={`mt-5 grid gap-3 sm:grid-cols-2 ${
                hasMedia ? "xl:grid-cols-4" : "xl:grid-cols-3"
              }`}
            >
              {hasMedia && (
                <a
                  href={selectedStudentMediaLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900 transition hover:border-blue-300 hover:bg-blue-100/70"
                >
                  <p className="text-[11px] uppercase tracking-[0.2em]">Media</p>
                  <p className="mt-1 text-lg font-bold">Video</p>
                </a>
              )}
              <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-900">
                <p className="text-[11px] uppercase tracking-[0.2em]">GPA</p>
                <p className="mt-1 text-lg font-bold">
                  {textOrNotProvided(selectedStudent.gpa)}
                </p>
              </article>
              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <p className="text-[11px] uppercase tracking-[0.2em]">English</p>
                <p className="mt-1 text-lg font-bold">
                  {textOrNotProvided(selectedStudent.english_score)}
                </p>
              </article>
              <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-900">
                <p className="text-[11px] uppercase tracking-[0.2em]">
                  Grade / Age
                </p>
                <p className="mt-1 text-lg font-bold">
                  {textOrNotProvided(selectedStudent.applying_to_grade)} /{" "}
                  {textOrNotProvided(selectedStudent.adjusted_age)}
                </p>
              </article>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-12">
              <section className="rounded-2xl border border-stone-300 bg-white/85 p-5 lg:col-span-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-600">
                  <Star className="h-4 w-4" />
                  Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedStudent.selected_interests) &&
                  selectedStudent.selected_interests.length > 0 ? (
                    selectedStudent.selected_interests.map((interest) => (
                      <span
                        key={interest}
                        className="rounded-full border border-stone-300/90 bg-[#f8f2e8] px-3 py-1 text-xs font-medium text-stone-700"
                      >
                        {interest}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-stone-500">Not provided</span>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-stone-300 bg-white/85 p-5 lg:col-span-7">
                <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-600">
                  <GraduationCap className="h-4 w-4" />
                  Student Snapshot
                </h3>
                <dl>
                  <StudentDataRow
                    label="Gender"
                    value={formatGender(selectedStudent.gender_desc)}
                  />
                  <StudentDataRow
                    label="Country"
                    value={textOrNotProvided(selectedStudent.country)}
                  />
                  <StudentDataRow
                    label="City Preference"
                    value={textOrNotProvided(selectedStudent.urban_request)}
                  />
                  <StudentDataRow
                    label="Program Type"
                    value={textOrNotProvided(selectedStudent.program_type)}
                  />
                  <StudentDataRow
                    label="Placement Status"
                    value={textOrNotProvided(selectedStudent.placement_status)}
                  />
                  <StudentDataRow
                    label="English Score"
                    value={textOrNotProvided(selectedStudent.english_score)}
                    isLast
                  />
                </dl>
              </section>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <a
                href={`/StudentProfile?id=${selectedStudent.app_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 transition hover:border-stone-500 sm:w-auto"
              >
                Open Full Profile
              </a>
              <Button
                onClick={onClose}
                className="h-10 w-full bg-stone-900 text-white shadow-[0_10px_26px_-16px_rgba(28,20,14,0.8)] transition hover:bg-stone-800 sm:w-auto sm:px-8"
              >
                Close
              </Button>
            </div>
          </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}

type StudentDataRowProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

function StudentDataRow({ label, value, isLast = false }: StudentDataRowProps) {
  return (
    <div
      className={`flex items-start justify-between gap-4 py-2 ${
        isLast ? "" : "border-b border-stone-200/80"
      }`}
    >
      <dt className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
        {label}
      </dt>
      <dd className="text-sm font-medium text-stone-800 text-right">{value}</dd>
    </div>
  );
}
