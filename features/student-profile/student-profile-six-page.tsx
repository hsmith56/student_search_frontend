"use client";

import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import posthog from "posthog-js";
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  Copy,
  Flag,
  Globe2,
  Heart,
  Leaf,
  Lock,
  MapPinned,
  MessageSquareQuote,
  ShieldAlert,
  Video,
  type LucideIcon,
} from "lucide-react";
import { DM_Sans, Merriweather } from "next/font/google";
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

const bodyFont = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

function hasContent(value: string | null | undefined) {
  return Boolean(value && value.trim());
}

function makeStatusPillClass(status: ReturnType<typeof statusTone>) {
  return {
    placed:
      "border-[rgba(0,160,70,0.22)] bg-[rgba(0,160,70,0.1)] text-[#00703c]",
    pending:
      "border-[rgba(255,87,0,0.24)] bg-[rgba(255,87,0,0.1)] text-[rgba(140,60,14,0.92)]",
    allocated:
      "border-[rgba(0,94,184,0.22)] bg-[rgba(0,94,184,0.1)] text-[var(--brand-primary)]",
    other:
      "border-[rgba(100,120,140,0.18)] bg-[rgba(100,120,140,0.09)] text-[var(--brand-muted)]",
  }[status];
}

function makePanelTone(tone: PanelTone) {
  return {
    blue: {
      panel:
        "border-[rgba(0,53,84,0.12)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]",
      header:
        "border-[rgba(0,53,84,0.12)] bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_100%)]",
      icon: "text-[var(--brand-primary)]",
    },
    slate: {
      panel:
        "border-[rgba(0,53,84,0.14)] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8fb_100%)]",
      header:
        "border-[rgba(0,53,84,0.12)] bg-[linear-gradient(180deg,#edf2f7_0%,#f7fafe_100%)]",
      icon: "text-[var(--brand-primary-deep)]",
    },
    orange: {
      panel:
        "border-[rgba(255,87,0,0.16)] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf6_100%)]",
      header:
        "border-[rgba(255,87,0,0.14)] bg-[linear-gradient(180deg,#fff2e8_0%,#fff8f2_100%)]",
      icon: "text-[var(--brand-accent)]",
    },
    teal: {
      panel:
        "border-[rgba(60,159,192,0.2)] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbfd_100%)]",
      header:
        "border-[rgba(60,159,192,0.18)] bg-[linear-gradient(180deg,#eaf8fc_0%,#f5fcfe_100%)]",
      icon: "text-[var(--brand-secondary)]",
    },
    red: {
      panel:
        "border-[rgba(201,18,41,0.16)] bg-[linear-gradient(180deg,#ffffff_0%,#fff8f8_100%)]",
      header:
        "border-[rgba(201,18,41,0.14)] bg-[linear-gradient(180deg,#fff0f1_0%,#fff7f7_100%)]",
      icon: "text-[var(--brand-danger)]",
    },
  }[tone];
}

export default function StudentProfileSixPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams?.get("id") ?? "";
  const { student, loading, error, authLoading, isAuthenticated } =
    useStudentProfile(studentId);
  const [copiedUsahsId, setCopiedUsahsId] = useState(false);

  if (!studentId) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f0f5fa] px-6">
        <div className="max-w-xl rounded-[1.5rem] border border-[rgba(0,53,84,0.16)] bg-white p-8 text-[var(--brand-body)] shadow-[0_20px_48px_rgba(0,53,84,0.14)]">
          Include a student ID in the URL. Example: `/StudentProfile?id=12345`
        </div>
      </div>
    );
  }

  if (authLoading || (!isAuthenticated && !student) || (loading && !student)) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f0f5fa]">
        <div className="flex flex-col items-center gap-4 text-[var(--brand-body)]">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-[rgba(0,53,84,0.16)] border-t-[var(--brand-primary)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.22em]">
            Loading profile
          </p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f0f5fa] px-6">
        <div className="max-w-xl rounded-[1.5rem] border border-[rgba(201,18,41,0.3)] bg-[rgba(201,18,41,0.08)] p-8 text-[var(--brand-danger)] shadow-[0_16px_36px_rgba(130,20,32,0.16)]">
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
  const statusClass = makeStatusPillClass(status);
  const studentEventProperties = {
    app_id: student.app_id,
    pax_id: student.pax_id,
    usahs_id: student.usahsid,
    first_name: student.first_name,
    country: student.country,
    placement_status: student.placement_status,
    program_type: student.program_type,
  };
  const stateSummary =
    states.length > 0 ? states.join(", ") : "No specific state requests";
  const interestSummary =
    selectedInterests.length > 0
      ? selectedInterests.slice(0, 5).join(", ")
      : "No interests listed";
  const allergySummary = hasAllergy
    ? student.allergy_comments
    : "No allergy comments noted";

  return (
    <div
      className={`${bodyFont.className} min-h-screen bg-[#f0f5fa] pb-12 text-[var(--brand-ink)] antialiased`}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,94,184,0.09) 0%, transparent 70%)",
      }}
    >
      <main className="mx-auto w-full max-w-[1400px] px-4 pt-7 md:px-6">
        <section className="overflow-hidden rounded-[1.5rem] border border-[rgba(0,53,84,0.22)] bg-white shadow-[0_20px_48px_rgba(0,53,84,0.14),0_2px_8px_rgba(0,53,84,0.06)]">
          <div className="relative grid gap-5 overflow-hidden bg-[var(--brand-primary-deep)] px-6 py-8 lg:grid-cols-[1fr_auto] lg:items-end lg:px-9">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,94,184,0.9) 0%, rgba(0,53,84,1) 55%, rgba(0,40,65,1) 100%)",
              }}
            />
            <div className="pointer-events-none absolute right-[-60px] top-[-60px] h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(60,159,192,0.22)_0%,transparent_70%)]" />
            <div className="pointer-events-none absolute bottom-[-40px] left-[30%] h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,rgba(0,94,184,0.18)_0%,transparent_70%)]" />
            <div className="relative z-10">
              <h1
                className={`${headingFont.className} mt-1 text-4xl text-white md:text-6xl`}
              >
                {student.first_name}
              </h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <HeroBadge icon={Lock}>USAHS ID {textOrDash(student.usahsid)}</HeroBadge>
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.1)] px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.92)] transition hover:bg-[rgba(255,255,255,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
                  title="Copy USAHS ID"
                  aria-label="Copy USAHS ID"
                >
                  <Copy className="h-[11px] w-[11px]" />
                  {copiedUsahsId ? "Copied" : "Copy to Clipboard"}
                </button>
              </div>
            </div>

            <div className="relative z-10 flex flex-wrap gap-2 lg:self-end">
              <HeroLink
                href={`https://beacon.ciee.org/participant/${student.app_id}`}
                onClick={() => {
                  posthog.capture("student_profile_beacon_redirect_clicked", {
                    ...studentEventProperties,
                    destination_type: "participant",
                    source_page: "student_profile",
                    target_url: `https://beacon.ciee.org/participant/${student.app_id}`,
                  });
                }}
              >
                Open Beacon
              </HeroLink>
              <HeroLink
                href={`https://beacon.ciee.org/participant/print/${student.app_id}/redacted`}
                onClick={() => {
                  posthog.capture("student_profile_beacon_redirect_clicked", {
                    ...studentEventProperties,
                    destination_type: "print_view",
                    source_page: "student_profile",
                    target_url: `https://beacon.ciee.org/participant/print/${student.app_id}/redacted`,
                  });
                }}
              >
                Print View
              </HeroLink>
              {student.media_link ? (
                <a
                  href={student.media_link}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    posthog.capture("student_profile_media_redirect_clicked", {
                      ...studentEventProperties,
                      source_page: "student_profile",
                      target_url: student.media_link,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,194,62,0.65)] bg-[rgba(255,194,62,0.16)] px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[rgba(255,194,62,0.24)]"
                >
                  <Video className="h-3 w-3" />
                  Media
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid border-t border-[rgba(0,53,84,0.12)] bg-white md:grid-cols-3">
            <HeroStat
              icon={MapPinned}
              title="State Request"
              value={stateSummary}
              detail={`City preference: ${textOrDash(student.urban_request)}`}
              accent="border-l-[3px] border-l-[var(--brand-primary)]"
            />
            <HeroStat
              icon={Heart}
              title="Interests"
              value={interestSummary}
              detail={
                selectedInterests.length > 0
                  ? "Interest set captured"
                  : "No lifestyle interests captured"
              }
              accent="border-l-[3px] border-l-[var(--brand-accent)]"
            />
            <HeroStat
              icon={ShieldAlert}
              title="Health Alerts"
              value={allergySummary}
              detail={
                hasDietary
                  ? `Dietary: ${student.dietary_restrictions}`
                  : "Dietary: no restrictions noted"
              }
              accent="border-l-[3px] border-l-[var(--brand-danger)]"
              borderClass="md:border-r-0"
            />
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[340px_1fr]">
          <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
            <Panel title="Core Summary" icon={ClipboardList}>
              <DetailRow label="Program" value={textOrDash(student.program_type)} />
              <DetailRow label="Country" value={textOrDash(student.country)} />
              <DetailRow label="Gender" value={textOrDash(student.gender_desc)} />
              <DetailRow label="Age" value={textOrDash(student.adjusted_age)} />
              <DetailRow label="GPA" value={textOrDash(student.gpa)} />
              <DetailRow
                label="English Score"
                value={textOrDash(student.english_score)}
              />
              <DetailRow
                label="Applying Grade"
                value={textOrDash(student.applying_to_grade)}
              />
              <DetailRow
                label="Current Grade"
                value={textOrDash(student.current_grade)}
              />
            </Panel>

            <Panel title="Placement Flags" icon={Flag} tone="slate">
              <DetailRow
                label="SP (1-person family)"
                value={<BooleanPill value={student.single_placement} />}
              />
              <DetailRow
                label="DP (Family hosts 2)"
                value={<BooleanPill value={student.double_placement} />}
              />
              <DetailRow
                label="Tuition Placement"
                value={<BooleanPill value={student.tuition_placement} />}
              />
              <DetailRow
                label="Live With Pets"
                value={<BooleanPill value={student.live_with_pets} />}
              />
              <DetailRow
                label="Early Placement"
                value={<BooleanPill value={student.early_placement} />}
              />
              <DetailRow
                label="System Status"
                value={
                  <span
                    className={`inline-flex rounded-full border px-[0.65rem] py-[0.15rem] text-[0.7rem] font-bold tracking-[0.06em] ${statusClass}`}
                  >
                    {textOrDash(student.placement_status)}
                  </span>
                }
              />
            </Panel>
          </aside>

          <div className="flex flex-col gap-5">
            <Panel title="Interests and Lifestyle" icon={Heart} tone="orange">
              {selectedInterests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedInterests.map((interest, index) => (
                    <span
                      key={`${interest}-${index}`}
                      className="rounded-full border border-[rgba(255,87,0,0.28)] bg-[rgba(255,87,0,0.08)] px-3.5 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[rgba(140,60,14,0.9)]"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--brand-muted)]">Not provided.</p>
              )}

              {additionalInterests.length > 0 ? (
                <div className="mt-3.5 flex flex-col gap-2">
                  {additionalInterests.map((interest, index) => (
                    <TextBlock key={`${interest}-${index}`}>{interest}</TextBlock>
                  ))}
                </div>
              ) : null}
            </Panel>

            <Panel title="Academics" icon={BookOpen} tone="slate">
              <div className="grid gap-x-6 sm:grid-cols-2">
                <DetailRow label="GPA" value={textOrDash(student.gpa)} />
                <DetailRow
                  label="English Score"
                  value={textOrDash(student.english_score)}
                />
                <DetailRow
                  label="Current Grade"
                  value={textOrDash(student.current_grade)}
                />
                <DetailRow
                  label="Applying Grade"
                  value={textOrDash(student.applying_to_grade)}
                />
              </div>
            </Panel>

            <div className="grid gap-5 md:grid-cols-2">
              <Panel title="Health and Diet" icon={Leaf} tone="red">
                {hasAllergy ? (
                  <AlertNotesCard
                    title="Allergy comments on file"
                    notes={[student.allergy_comments]}
                  />
                ) : (
                  <DetailRow
                    label="Allergy Comments"
                    value="No allergy comments provided."
                    noBorder
                  />
                )}

                <div className="mt-3 border-t border-[rgba(100,120,140,0.1)] pt-3">
                  <DetailRow
                    label="Dietary Restrictions"
                    value={
                      hasDietary
                        ? student.dietary_restrictions
                        : "No dietary restrictions provided."
                    }
                    noBorder
                  />
                </div>

                {healthNotes.length > 0 ? (
                  <AlertNotesCard
                    className="mt-3"
                    title="Health comments on file"
                    notes={healthNotes}
                  />
                ) : null}
              </Panel>

              <Panel title="Identity and Program" icon={Globe2} tone="teal">
                <DetailRow label="Religion" value={textOrDash(student.religion)} />
                <DetailRow
                  label="Religious Frequency"
                  value={religiousFrequencyText(student.religious_frequency)}
                />
                <DetailRow
                  label="Favorite Subjects"
                  value={textOrDash(student.favorite_subjects)}
                  noBorder
                />
              </Panel>
            </div>

            <Panel title="Messages" icon={MessageSquareQuote} tone="blue">
              {narratives.length > 0 ? (
                <div className="flex flex-col gap-3.5">
                  {narratives.map((entry) => (
                    <div
                      key={entry.title}
                      className="rounded-[0.85rem] border border-[rgba(0,53,84,0.12)] bg-[#f8fbff] px-[1.1rem] py-4"
                    >
                      <div className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-[var(--brand-muted)]">
                        {entry.title}
                      </div>
                      <p className="mt-2 text-[0.83rem] leading-[1.7] whitespace-pre-line text-[var(--brand-body)]">
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
        </div>
      </main>
    </div>
  );
}

function HeroBadge({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.1)] px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.92)]">
      <Icon className="h-[11px] w-[11px]" />
      {children}
    </span>
  );
}

function HeroLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.32)] bg-[rgba(255,255,255,0.1)] px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[rgba(255,255,255,0.2)]"
    >
      {children}
      <ChevronRight className="h-3 w-3" />
    </a>
  );
}

function HeroStat({
  icon: Icon,
  title,
  value,
  detail,
  accent,
  borderClass = "",
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  detail: string;
  accent: string;
  borderClass?: string;
}) {
  return (
    <article
      className={`relative border-r border-[rgba(0,53,84,0.12)] px-6 py-4 ${accent} ${borderClass}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--brand-muted)]" />
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
          {title}
        </span>
      </div>
      <div className="text-sm font-semibold text-[var(--brand-body)]">{value}</div>
      <div className="mt-1 text-[0.72rem] text-[var(--brand-muted)]">{detail}</div>
    </article>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  tone = "blue",
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  tone?: PanelTone;
}) {
  const styles = makePanelTone(tone);

  return (
    <article
      className={`overflow-hidden rounded-[1.25rem] border shadow-[0_4px_16px_rgba(0,53,84,0.07),0_1px_4px_rgba(0,53,84,0.04)] ${styles.panel}`}
    >
      <div className={`flex items-center gap-2.5 border-b px-5 py-4 ${styles.header}`}>
        <Icon className={`h-3.5 w-3.5 shrink-0 ${styles.icon}`} />
        <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.13em] text-[var(--brand-body)]">
          {title}
        </h2>
      </div>
      <div className="px-5 py-[1.1rem]">{children}</div>
    </article>
  );
}

type PanelTone = "blue" | "slate" | "orange" | "teal" | "red";

function DetailRow({
  label,
  value,
  noBorder = false,
}: {
  label: string;
  value: ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 py-2.5 ${
        noBorder ? "" : "border-b border-[rgba(100,120,140,0.1)]"
      }`}
    >
      <dt className="shrink-0 text-[0.67rem] font-bold uppercase tracking-[0.13em] text-[var(--brand-muted)]">
        {label}
      </dt>
      <dd className="text-right text-[0.83rem] font-semibold text-[var(--brand-body)]">
        {value}
      </dd>
    </div>
  );
}

function BooleanPill({ value }: { value: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-[0.65rem] py-[0.15rem] text-[0.7rem] font-bold tracking-[0.06em] ${
        value
          ? "border-[rgba(0,160,70,0.22)] bg-[rgba(0,160,70,0.1)] text-[#00703c]"
          : "border-[rgba(100,120,140,0.18)] bg-[rgba(100,120,140,0.09)] text-[var(--brand-muted)]"
      }`}
    >
      {boolText(value)}
    </span>
  );
}

function TextBlock({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[0.75rem] border border-[rgba(0,53,84,0.12)] bg-[#f8fbff] px-4 py-3 text-[0.83rem] leading-[1.65] text-[var(--brand-body)]">
      {children}
    </div>
  );
}

function AlertNotesCard({
  title,
  notes,
  className = "",
}: {
  title: string;
  notes: string[];
  className?: string;
}) {
  return (
    <div
      className={`${className} relative overflow-hidden rounded-[0.85rem] border border-[rgba(201,18,41,0.2)] bg-[#fff9f9] shadow-[0_2px_10px_rgba(130,20,32,0.07)]`}
    >
      <div className="absolute inset-y-0 left-0 w-[3px] bg-[rgba(201,18,41,0.8)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(130,20,32,1) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative px-4 py-3 pl-5">
        <div className="flex items-center gap-2">
          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-[rgba(201,18,41,0.1)]">
            <ShieldAlert className="h-[13px] w-[13px] text-[rgba(180,16,36,1)]" />
          </div>
          <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.15em] text-[rgba(130,20,32,0.9)]">
            {title}
          </span>
          <div className="h-px flex-1 bg-[rgba(201,18,41,0.12)]" />
          <span className="rounded-full bg-[rgba(201,18,41,0.1)] px-2 py-0.5 text-[0.65rem] font-bold text-[rgba(180,16,36,0.9)]">
            {notes.length}
          </span>
        </div>

        <ul className="mt-3 flex flex-col gap-1.5">
          {notes.map((note, index) => (
            <li
              key={`${note}-${index}`}
              className="flex items-start gap-2.5 rounded-[0.55rem] border border-transparent bg-white px-3 py-2 shadow-[0_1px_3px_rgba(130,20,32,0.06)] transition hover:border-[rgba(201,18,41,0.15)] hover:bg-[rgba(255,248,248,1)]"
            >
              <span className="mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[rgba(201,18,41,0.08)] text-[0.6rem] font-extrabold text-[rgba(180,16,36,0.8)]">
                {index + 1}
              </span>
              <span className="text-[0.8rem] leading-[1.5] text-[rgba(60,20,16,0.85)]">
                {note}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
