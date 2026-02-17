"use client";

import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BadgeCheck,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Flag,
  Globe2,
  Heart,
  Leaf,
  MapPinned,
  MessageSquareQuote,
  ShieldAlert,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Manrope, Merriweather } from "next/font/google";
import { useStudentProfile } from "@/features/student-profile/hooks/use-student-profile";
import {
  boolText,
  cleanList,
  collectNarratives,
  religiousFrequencyText,
  statusTone,
  textOrDash,
} from "@/features/student-profile/utils";

const headingFont = Merriweather({
  subsets: ["latin"],
  weight: ["700", "900"],
});

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

function hasContent(value: string | null | undefined) {
  return Boolean(value && value.trim());
}

export default function StudentProfileSixPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams?.get("id") ?? "";
  const { student, loading, error, authLoading, isAuthenticated } =
    useStudentProfile(studentId);
  const [copiedUsahsId, setCopiedUsahsId] = useState(false);

  if (!studentId) {
    return (
      <div className="brand-page-gradient grid min-h-screen place-items-center px-6">
        <div className="max-w-xl rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] p-8 text-[var(--brand-body)] shadow-[var(--brand-shadow-card)]">
          Include a student ID in the URL. Example: `/StudentProfile?id=12345`
        </div>
      </div>
    );
  }

  if (authLoading || (!isAuthenticated && !student) || (loading && !student)) {
    return (
      <div className="brand-page-gradient grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-4 text-[var(--brand-body)]">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-[var(--brand-border)] border-t-[var(--brand-primary)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.22em]">
            Loading profile
          </p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="brand-page-gradient grid min-h-screen place-items-center px-6">
        <div className="max-w-xl rounded-3xl border border-[rgba(201,18,41,0.3)] bg-[rgba(201,18,41,0.08)] p-8 text-[var(--brand-danger)] shadow-[0_16px_36px_rgba(130,20,32,0.16)]">
          {error ?? `Unable to load student data for ID ${studentId}.`}
        </div>
      </div>
    );
  }

  const states = cleanList(student.states);
  const selectedInterests = cleanList(student.selected_interests);
  const additionalInterests = cleanList(student.free_text_interests);
  const healthNotes = cleanList(student.health_comments);
  const narratives = collectNarratives(student);
  const usahsIdValue = student.usahsid?.toString().trim() ?? "";
  const canCopyUsahsId = usahsIdValue.length > 0;
  const hasAllergy = hasContent(student.allergy_comments);
  const hasDietary = hasContent(student.dietary_restrictions);
  const status = statusTone(student.placement_status);

  const statusClass = {
    placed:
      "border-[rgba(0,144,63,0.42)] bg-[rgba(0,144,63,0.14)] text-[var(--brand-success-deep)]",
    pending:
      "border-[rgba(255,87,0,0.45)] bg-[rgba(255,87,0,0.15)] text-[rgba(126,55,14,1)]",
    allocated:
      "border-[rgba(0,94,184,0.42)] bg-[rgba(0,94,184,0.14)] text-[var(--brand-primary-deep)]",
    other:
      "border-[var(--brand-border-soft)] bg-[rgba(34,31,33,0.06)] text-[var(--brand-body)]",
  }[status];

  return (
    <div
      className={`${bodyFont.className} min-h-screen bg-[linear-gradient(180deg,#f6fbff_0%,#ffffff_58%)] pb-12 text-[var(--brand-ink)]`}
    >
      <main className="mx-auto w-full max-w-[96rem] px-4 pt-7 md:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-[rgba(0,53,84,0.2)] bg-[var(--brand-surface-elevated)] shadow-[0_22px_44px_rgba(0,53,84,0.12)]">
          <div className="grid gap-5 bg-[linear-gradient(135deg,var(--brand-primary-deep)_0%,var(--brand-primary)_62%,var(--brand-secondary)_100%)] p-6 text-white lg:grid-cols-[1fr_auto] lg:items-end lg:p-8">
            <div>
              
              <h1 className={`${headingFont.className} mt-1 text-4xl md:text-6xl`}>
                {student.first_name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[rgba(255,255,255,0.44)] bg-[rgba(255,255,255,0.18)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]">
                  USAHS ID {textOrDash(student.usahsid)}
                </span>
                <button
                  type="button"
                  disabled={!canCopyUsahsId}
                  onClick={async () => {
                    if (!canCopyUsahsId) return;

                    try {
                      if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(usahsIdValue);
                      } else {
                        const textarea = document.createElement("textarea");
                        textarea.value = usahsIdValue;
                        textarea.setAttribute("readonly", "");
                        textarea.style.position = "absolute";
                        textarea.style.left = "-9999px";
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand("copy");
                        document.body.removeChild(textarea);
                      }

                      setCopiedUsahsId(true);
                      window.setTimeout(() => setCopiedUsahsId(false), 1400);
                    } catch (copyError) {
                      console.error("Unable to copy USAHS ID:", copyError);
                    }
                  }}
                  className="inline-flex items-center rounded-full border border-[rgba(255,255,255,0.44)] bg-[rgba(255,255,255,0.18)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-[rgba(255,255,255,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                  title="Copy USAHS ID"
                  aria-label="Copy USAHS ID"
                >
                  {copiedUsahsId ? "Copied" : "Copy to Clipboard"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={`https://beacon.ciee.org/participant/${student.app_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.42)] bg-[rgba(255,255,255,0.15)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-[rgba(255,255,255,0.24)]"
              >
                Open Beacon
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
              <a
                href={`https://beacon.ciee.org/participant/print/${student.app_id}/redacted`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.42)] bg-[rgba(255,255,255,0.15)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-[rgba(255,255,255,0.24)]"
              >
                Print View
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
              {student.media_link ? (
                <a
                  href={student.media_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,194,62,0.65)] bg-[rgba(255,194,62,0.18)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-[rgba(255,194,62,0.26)]"
                >
                  <Video className="h-3.5 w-3.5" />
                  Media
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 border-t border-[var(--brand-border-soft)] bg-[rgba(0,53,84,0.03)] p-4 lg:grid-cols-12 md:p-6">
            <TopCallout
              icon={MapPinned}
              title="State Request"
              className="lg:col-span-4 border-[rgba(0,94,184,0.28)] bg-[rgba(0,94,184,0.08)]"
              body={
                states.length > 0
                  ? states.join(", ")
                  : "No specific state requests provided."
              }
              detail={`City preference: ${textOrDash(student.urban_request)}`}
            />
            <TopCallout
              icon={Heart}
              title="Interests"
              className="lg:col-span-4 border-[rgba(255,87,0,0.3)] bg-[rgba(255,87,0,0.1)]"
              body={
                selectedInterests.length > 0
                  ? selectedInterests.slice(0, 5).join(", ")
                  : "No interests listed."
              }
              detail={
                selectedInterests.length > 5
                  ? `+${selectedInterests.length - 5} more interests`
                  : "Interest set captured"
              }
            />
            <TopCallout
              icon={ShieldAlert}
              title="Health Alerts"
              className="lg:col-span-4 border-[rgba(201,18,41,0.25)] bg-[rgba(201,18,41,0.08)]"
              body={
                hasAllergy
                  ? `Allergy: ${student.allergy_comments}`
                  : "Allergy: no notes"
              }
              detail={
                hasDietary
                  ? `Dietary: ${student.dietary_restrictions}`
                  : "Dietary: no restrictions noted"
              }
            />
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-4 lg:sticky lg:top-6 lg:self-start">
            <Panel title="Core Summary" icon={ClipboardList}>
              <SummaryRow label="Program" value={textOrDash(student.program_type)} />
              <SummaryRow label="Country" value={textOrDash(student.country)} />
              <SummaryRow label="Gender" value={textOrDash(student.gender_desc)} />
              <SummaryRow label="Age" value={textOrDash(student.adjusted_age)} />
              <SummaryRow label="GPA" value={textOrDash(student.gpa)} />
              <SummaryRow
                label="English Score"
                value={textOrDash(student.english_score)}
              />
              <SummaryRow
                label="Applying Grade"
                value={textOrDash(student.applying_to_grade)}
              />
              <SummaryRow
                label="Current Grade"
                value={textOrDash(student.current_grade)}
              />
            </Panel>

            <Panel title="Placement Flags" icon={Flag}>
              <SummaryRow
                label="Single Placement"
                value={boolText(student.single_placement)}
              />
              <SummaryRow
                label="Double Placement"
                value={boolText(student.double_placement)}
              />
              <SummaryRow
                label="Live With Pets"
                value={boolText(student.live_with_pets)}
              />
              <SummaryRow
                label="Early Placement"
                value={boolText(student.early_placement)}
              />
              <SummaryRow label="System Status" value={textOrDash(student.placement_status)} />
            </Panel>
          </div>

          <div className="space-y-5 lg:col-span-8">
            <Panel title="Interests and Lifestyle" icon={Heart}>
              {selectedInterests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedInterests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full border border-[rgba(255,87,0,0.3)] bg-[rgba(255,87,0,0.1)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgba(126,55,14,1)]"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--brand-muted)]">Not provided.</p>
              )}
              {additionalInterests.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {additionalInterests.map((interest, index) => (
                    <div
                      key={`${interest}-${index}`}
                      className="rounded-lg border border-[var(--brand-border-soft)] bg-[rgba(255,255,255,0.78)] p-3 text-sm text-[var(--brand-body)]"
                    >
                      {interest}
                    </div>
                  ))}
                </div>
              ) : null}
            </Panel>

            <Panel title="Academics" icon={BookOpen}>
              <div className="grid gap-2 sm:grid-cols-2">
                <SummaryRow label="GPA" value={textOrDash(student.gpa)} />
                <SummaryRow label="English Score" value={textOrDash(student.english_score)} />
                <SummaryRow
                  label="Current Grade"
                  value={textOrDash(student.current_grade)}
                />
                <SummaryRow
                  label="Applying Grade"
                  value={textOrDash(student.applying_to_grade)}
                />
              </div>
            </Panel>

            <div className="grid gap-5 md:grid-cols-2">
              <Panel title="Health and Diet" icon={Leaf}>
                <SummaryRow
                  label="Allergy Comments"
                  value={
                    hasAllergy ? student.allergy_comments : "No allergy comments provided."
                  }
                />
                <SummaryRow
                  label="Dietary Restrictions"
                  value={
                    hasDietary
                      ? student.dietary_restrictions
                      : "No dietary restrictions provided."
                  }
                />
                {healthNotes.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(255,255,255,0.8)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[var(--brand-muted)]">
                      Health comments
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-[var(--brand-body)]">
                      {healthNotes.map((note) => (
                        <li key={note} className="flex items-start gap-2">
                          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Panel>

              <Panel title="Identity and Program" icon={Globe2}>
                <SummaryRow label="Religion" value={textOrDash(student.religion)} />
                <SummaryRow
                  label="Religious Frequency"
                  value={religiousFrequencyText(student.religious_frequency)}
                />
                <SummaryRow
                  label="Favorite Subjects"
                  value={textOrDash(student.favorite_subjects)}
                />
                <SummaryRow
                  label="Coordinator"
                  value={textOrDash(student.local_coordinator)}
                />
              </Panel>
            </div>

            <Panel title="Messages and Narrative" icon={MessageSquareQuote}>
              {narratives.length > 0 ? (
                <div className="space-y-3">
                  {narratives.map((entry) => (
                    <div
                      key={entry.title}
                      className="rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(255,255,255,0.82)] p-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[var(--brand-muted)]">
                        {entry.title}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--brand-body)]">
                        {entry.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--brand-muted)]">Not provided.</p>
              )}
            </Panel>
          </div>
        </section>
      </main>
    </div>
  );
}

function TopCallout({
  icon: Icon,
  title,
  body,
  detail,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  detail: string;
  className: string;
}) {
  return (
    <article className={`rounded-2xl border p-4 ${className}`}>
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-[var(--brand-body)]">
        <Icon className="h-4 w-4" />
        {title}
      </h2>
      <p className="text-sm font-medium text-[var(--brand-body)]">{body}</p>
      <p className="mt-1 text-xs text-[var(--brand-muted)]">{detail}</p>
    </article>
  );
}

function Panel({
  title,
  icon: Icon,
  sticky = false,
  children,
}: {
  title: string;
  icon: LucideIcon;
  sticky?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={`${sticky ? "lg:sticky lg:top-6" : ""} overflow-hidden rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] shadow-[0_16px_34px_rgba(0,53,84,0.1)]`}
    >
      <div className="border-b border-[var(--brand-border-soft)] bg-[linear-gradient(120deg,rgba(0,94,184,0.08),rgba(60,159,192,0.06))] px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.13em] text-[var(--brand-body)]">
          <Icon className="h-4 w-4 text-[var(--brand-primary)]" />
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </article>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[rgba(114,125,131,0.2)] py-2.5 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
        {label}
      </dt>
      <dd className="text-right text-sm font-medium text-[var(--brand-body)]">
        {value}
      </dd>
    </div>
  );
}
