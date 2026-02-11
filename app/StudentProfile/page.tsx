"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  Globe2,
  Heart,
  MapPinned,
  MessageCircleMore,
  Sparkles,
  Video,
} from "lucide-react";
import { Cormorant_Garamond, Public_Sans } from "next/font/google";
import { useAuth } from "@/contexts/auth-context";

interface StudentData {
  first_name: string;
  app_id: number;
  pax_id: number;
  country: string;
  gpa: string;
  english_score: string;
  applying_to_grade: number;
  usahsid: string;
  program_type: string;
  adjusted_age: number;
  selected_interests: string[];
  urban_request: string;
  placement_status: string;
  gender_desc: string;
  id: number;
  current_grade: number;
  status: string;
  states: string[];
  early_placement: boolean;
  single_placement: boolean;
  double_placement: boolean;
  free_text_interests: string[];
  family_description: string;
  favorite_subjects: string;
  photo_comments: string;
  religion: string;
  allergy_comments: string;
  dietary_restrictions: string;
  religious_frequency: number;
  intro_message: string;
  message_to_host_family: string;
  message_from_natural_family: string;
  media_link: string;
  health_comments: string[];
  live_with_pets: boolean;
  local_coordinator: string;
}

const API_URL = "/api";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodyFont = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

function cleanList(
  items: Array<string | null | undefined> | undefined | null,
): string[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item !== "");
}

function boolText(value: boolean): string {
  return value ? "Yes" : "No";
}

function textOrDash(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return "Not provided";
  }
  const text = String(value).trim();
  return text ? text : "Not provided";
}

function statusTone(status: string) {
  const tone = status.toLowerCase();
  if (tone.includes("placed")) {
    return "bg-emerald-100 text-emerald-900 border-emerald-300";
  }
  if (tone.includes("pending")) {
    return "bg-amber-100 text-amber-900 border-amber-300";
  }
  if (tone.includes("allocated")) {
    return "bg-sky-100 text-sky-900 border-sky-300";
  }
  if (tone.includes("unassigned")) {
    return "bg-slate-200 text-slate-800 border-slate-400";
  }
  return "bg-stone-200 text-stone-900 border-stone-400";
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <article className={`rounded-2xl border p-4 ${accent}`}>
      <p className="text-[11px] uppercase tracking-[0.2em]">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-200/80 py-2 last:border-b-0">
      <dt className="text-xs tracking-[0.16em] uppercase text-stone-500">
        {label}
      </dt>
      <dd className="text-sm font-medium text-stone-800 text-right">{value}</dd>
    </div>
  );
}

export default function StudentProfilePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams?.get("id") ?? "";

  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`${API_URL}/students/full/${studentId}`, {
      method: "GET",
      headers: { accept: "application/json" },
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setStudent(null);
            setError(null);
            return;
          }
          throw new Error(`Status ${res.status}`);
        }
        const data = (await res.json()) as StudentData;
        setStudent(data);
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Error fetching student data:", err);
        setError(String(err));
        setStudent(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [studentId]);

  if (!studentId) {
    return (
      <div className="brand-page-gradient min-h-screen text-stone-900 grid place-items-center px-6">
        <div className="max-w-lg rounded-2xl border border-stone-300 bg-white/80 p-8 shadow-xl">
          Include a student ID in the URL. Example: `/StudentProfile?id=12345`
        </div>
      </div>
    );
  }

  if (loading || (authLoading && !student)) {
    return (
      <div className="brand-page-gradient min-h-screen grid place-items-center text-stone-700">
        <div className="animate-pulse text-lg tracking-[0.2em] uppercase">
          Loading profile
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="brand-page-gradient min-h-screen grid place-items-center px-6">
        <div className="max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 text-red-900 shadow-xl">
          {error ?? `Unable to load student data for ID ${studentId}.`}
        </div>
      </div>
    );
  }

  const selectedInterests = cleanList(student.selected_interests);
  const additionalInterests = cleanList(student.free_text_interests);
  const healthNotes = cleanList(student.health_comments);
  const states = cleanList(student.states);
  const topPillClass =
    "inline-flex h-9 w-[12.5rem] items-center justify-center gap-2 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.16em]";

  return (
    <div className={`${bodyFont.className} brand-page-gradient min-h-screen text-stone-900`}>
      <main className="relative mx-auto w-full max-w-[92rem] px-4 pb-12 pt-8 md:px-8">
        <section className="rounded-3xl border border-stone-300/90 bg-[#fffdf9]/90 p-6 shadow-[0_16px_50px_rgba(60,42,26,0.12)] md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1
                className={`${displayFont.className} text-4xl text-stone-900 md:text-6xl`}
              >
                {student.first_name}
              </h1>
              <p className="mt-2 text-sm text-stone-600">
                USAHS ID {textOrDash(student.usahsid)}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2">
              <span
                className={`${topPillClass} ${statusTone(student.placement_status)}`}
              >
                <BadgeCheck className="h-4 w-4" />
                {textOrDash(student.placement_status)}
              </span>
              {student.early_placement && (
                <span
                  className={`${topPillClass} border-orange-500 bg-orange-400 text-stone-100`}
                >
                  Early placement
                </span>
              )}
              {student.media_link && (
                <a
                  href={student.media_link}
                  target="_blank"
                  rel="noreferrer"
                  className={`${topPillClass} border-stone-900 bg-stone-900 text-stone-100 transition hover:border-stone-700 hover:bg-stone-700`}
                >
                  <Video className="h-4 w-4" />
                  Open media
                </a>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile
              label="Program"
              value={textOrDash(student.program_type)}
              accent="border-blue-200 bg-blue-50 text-blue-900"
            />
            <StatTile
              label="GPA"
              value={textOrDash(student.gpa)}
              accent="border-indigo-200 bg-indigo-50 text-indigo-900"
            />
            <StatTile
              label="English"
              value={textOrDash(student.english_score)}
              accent="border-amber-200 bg-amber-50 text-amber-900"
            />
            <StatTile
              label="Age"
              value={textOrDash(student.adjusted_age)}
              accent="border-violet-200 bg-violet-50 text-violet-900"
            />
            <StatTile
              label="Applying Grade"
              value={textOrDash(student.applying_to_grade)}
              accent="border-rose-200 bg-rose-50 text-rose-900"
            />
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-12">
          <article className="rounded-3xl border border-stone-300 bg-white/85 p-6 lg:col-span-4">
            <h2 className="mb-4 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-stone-600">
              <Globe2 className="h-4 w-4" />
              Identity
            </h2>
            <dl>
              <InfoRow label="Gender" value={textOrDash(student.gender_desc)} />
              <InfoRow label="Age" value={textOrDash(student.adjusted_age)} />
              <InfoRow
                label="Program"
                value={textOrDash(student.program_type)}
              />
              
              <InfoRow
                label="Religion"
                value={textOrDash(student.religion)}
              />
              <InfoRow
                label="Religious Frequency"
                value={textOrDash(student.religious_frequency)}
              />
            </dl>
          </article>

          <article className="rounded-3xl border border-stone-300 bg-white/85 p-6 lg:col-span-4">
            <h2 className="mb-4 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-stone-600">
              <BookOpen className="h-4 w-4" />
              Academics
            </h2>
            <dl>
              <InfoRow
                label="Current Grade"
                value={textOrDash(student.current_grade)}
              />
              <InfoRow
                label="Favorite Subjects"
                value={textOrDash(student.favorite_subjects)}
              />
              <InfoRow
                label="Allergies"
                value={textOrDash(student.allergy_comments)}
              />
              <InfoRow
                label="Dietary Notes"
                value={textOrDash(student.dietary_restrictions)}
              />
              {healthNotes.length > 0 && (
                <InfoRow label="Medical Notes" value={healthNotes.join(", ")} />
              )}
            </dl>
          </article>

          <article className="rounded-3xl border border-stone-300 bg-white/85 p-6 lg:col-span-4">
            <h2 className="mb-4 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-stone-600">
              <MapPinned className="h-4 w-4" />
              Placement
            </h2>
            <dl>
              <InfoRow
                label="Single Placement"
                value={boolText(student.single_placement)}
              />
              <InfoRow
                label="Double Placement"
                value={boolText(student.double_placement)}
              />
              <InfoRow
                label="City Preference"
                value={textOrDash(student.urban_request)}
              />
              <InfoRow
                label="Live with pets"
                value={boolText(student.live_with_pets)}
              />
            </dl>
            {states.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                  Preferred states
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {states.map((state) => (
                    <span
                      key={state}
                      className="rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700"
                    >
                      {state}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-stone-300 bg-white/85 p-6 lg:col-span-12">
            <h2 className="mb-4 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-stone-600">
              <Heart className="h-4 w-4" />
              Interests
            </h2>
            <ChipGroup items={selectedInterests} />
            {additionalInterests.length > 0 && (
              <>
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-stone-500">
                  Additional
                </p>
                <TextAreaGroup items={additionalInterests} />
              </>
            )}
          </article>

          <article className="rounded-3xl border border-stone-300 bg-white/85 p-6 lg:col-span-12">
            <h2 className="mb-4 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-stone-600">
              <MessageCircleMore className="h-4 w-4" />
              Personal Notes
            </h2>
            <MessageBlock title="Introduction" text={student.intro_message} />
            <MessageBlock
              title="Message to Host Family"
              text={student.message_to_host_family}
            />
            <MessageBlock
              title="Message from Natural Family"
              text={student.message_from_natural_family}
            />
            <MessageBlock title="Family Description" text={student.family_description} />
            <MessageBlock title="Photo Comments" text={student.photo_comments} />
            {healthNotes.length > 0 && (
              <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-stone-500">
                  Health Comments
                </p>
                <ul className="mt-2 space-y-1 text-sm text-stone-700">
                  {healthNotes.map((note) => (
                    <li key={note} className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-500" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}

function ChipGroup({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-stone-500">Not provided.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-sm text-stone-800"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function MessageBlock({ title, text }: { title: string; text: string }) {
  const cleaned = text?.trim();
  if (!cleaned) {
    return null;
  }

  return (
    <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-stone-500">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-stone-800">{cleaned}</p>
    </div>
  );
}

function TextAreaGroup({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-stone-500">Not provided.</p>;
  }

  return (
    <div className="mt-3 space-y-3">
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4"
        >
          <p className="text-sm leading-relaxed text-stone-800">{item}</p>
        </div>
      ))}
    </div>
  );
}
