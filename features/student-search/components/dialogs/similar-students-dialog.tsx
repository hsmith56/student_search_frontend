"use client";

import { useEffect, useId, useState } from "react";
import { ArrowUpRight, Heart, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { StudentRecord } from "@/features/student-search/types";
import { createRecommendations } from "@/lib/api";
import {
  getFavoriteStudentId,
  getStatusBadgeClass,
  textOrNotProvided,
} from "@/features/student-search/utils";

type SimilarStudentsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentRecord | null;
  students: StudentRecord[];
  favoritedStudents: Set<string>;
  onFavorite: (appId: string) => void;
  onUnfavorite: (appId: string) => void;
};

type RecommendationReasons = {
  shared_interests?: string[];
  priority_interests?: string[];
  extra_interests?: string;
  extra_interests_match?: boolean;
  shared_states?: string[];
  used_user_preferred_states?: boolean;
  state_match?: boolean;
  same_country?: boolean;
  same_program?: boolean;
  same_gender?: boolean;
  same_applying_grade?: boolean;
  similar_applying_grade?: boolean;
  same_age?: boolean;
  similar_age?: boolean;
  similar_gpa?: boolean;
  similar_english_score?: boolean;
  same_urban_request?: boolean;
  single_placement_match?: boolean;
  double_placement_match?: boolean;
  pets_preference_match?: boolean;
};

type RecommendedStudent = {
  app_id: number;
  usahsid: string;
  first_name: string;
  placement_status: string;
  score: number;
  interest_overlap: number;
  state_overlap: number;
  reasons: RecommendationReasons;
};

const normalizeToken = (value: string) => value.trim().toLowerCase();

const toInterestList = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  const uniqueInterests = new Map<string, string>();

  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const normalized = normalizeToken(trimmed);
    if (!uniqueInterests.has(normalized)) {
      uniqueInterests.set(normalized, trimmed);
    }
  }

  return Array.from(uniqueInterests.values());
};

const toExtraInterestList = (value: string | undefined) =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];

const toReasonBadges = (recommendation: RecommendedStudent) => {
  const badges: string[] = [];
  const reasons = recommendation.reasons ?? {};

  if (reasons.same_gender) badges.push("Same gender");
  if (reasons.same_age) badges.push("Same age");
  else if (reasons.similar_age) badges.push("Similar age");

  return badges;
};

export function SimilarStudentsDialog({
  open,
  onOpenChange,
  student,
  favoritedStudents,
  onFavorite,
  onUnfavorite,
}: SimilarStudentsDialogProps) {
  const checkboxGroupId = useId();
  const [prioritizedInterests, setPrioritizedInterests] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasRequestedRecommendations, setHasRequestedRecommendations] =
    useState(false);

  useEffect(() => {
    if (!open) {
      setPrioritizedInterests([]);
      setRecommendations([]);
      setIsLoading(false);
      setErrorMessage("");
      setHasRequestedRecommendations(false);
      return;
    }

    setPrioritizedInterests([]);
    setRecommendations([]);
    setErrorMessage("");
    setHasRequestedRecommendations(false);
  }, [open, student?.app_id, student?.pax_id]);

  const studentInterests = toInterestList(student?.selected_interests).filter(
    (interest) => normalizeToken(interest) !== "other"
  );

  const togglePriorityInterest = (interest: string) => {
    setPrioritizedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  };

  const loadRecommendations = async () => {
    if (!student) {
      return;
    }

    const usahsid = String(student.usahsid ?? "").trim();
    if (!usahsid) {
      setRecommendations([]);
      setErrorMessage("This student does not have a USAHS ID available.");
      setHasRequestedRecommendations(true);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setHasRequestedRecommendations(true);

    try {
      const data = await createRecommendations<RecommendedStudent[]>({
        usahsid,
        limit: 5,
        compare: "allocated",
        priority_interests: prioritizedInterests,
      });

      setRecommendations(Array.isArray(data) ? data : []);
    } catch (error) {
      setRecommendations([]);
      setErrorMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Unable to load recommendations right now."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-auto max-h-[88vh] w-[95vw] max-w-5xl overflow-y-auto rounded-[2rem] border border-[rgba(0,53,84,0.14)] bg-[linear-gradient(180deg,rgba(252,254,255,0.99),rgba(244,249,253,0.98))] p-0 shadow-[0_30px_90px_-44px_rgba(0,53,84,0.9)] backdrop-blur-xl">
        <div className="space-y-6 px-6 py-6 sm:px-8">
          <section className="space-y-3 rounded-[1.6rem] border border-[rgba(0,53,84,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(244,249,253,0.78))] px-5 py-4 shadow-[0_18px_40px_-34px_rgba(0,53,84,0.55)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[12px] font-black uppercase tracking-[0.18em] text-[var(--brand-ink)]">
                  Prioritize Interests
                </h3>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">
                  Optional. Select interests to weight the results.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={loadRecommendations}
                  disabled={isLoading || !student}
                  className="h-9 rounded-full bg-[linear-gradient(135deg,var(--brand-primary),var(--brand-primary-deep))] px-4 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[0_14px_28px_-18px_rgba(0,94,184,0.8)] hover:opacity-95"
                >
                  Show me recommendations
                </Button>
              </div>
            </div>

            {studentInterests.length > 0 ? (
              <div
                aria-labelledby={checkboxGroupId}
                className="flex flex-wrap items-center gap-2.5"
              >
                <div id={checkboxGroupId} className="sr-only">
                  Student interests
                </div>
                {studentInterests.map((interest) => {
                  const inputId = `${checkboxGroupId}-${normalizeToken(interest).replace(/\s+/g, "-")}`;
                  const isChecked = prioritizedInterests.includes(interest);

                  return (
                    <button
                      key={interest}
                      id={inputId}
                      type="button"
                      aria-pressed={isChecked}
                      onClick={() => togglePriorityInterest(interest)}
                      className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        isChecked
                          ? "border-[rgba(0,94,184,0.36)] bg-[linear-gradient(180deg,rgba(0,94,184,0.12),rgba(0,94,184,0.06))] text-[var(--brand-primary-deep)] shadow-[0_12px_24px_-18px_rgba(0,94,184,0.7)]"
                          : "border-[rgba(0,53,84,0.08)] bg-white/82 text-[var(--brand-body)] hover:border-[rgba(0,94,184,0.16)] hover:bg-[rgba(0,94,184,0.04)]"
                      }`}
                    >
                      <span>{interest}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--brand-border)] bg-[rgba(246,247,248,0.72)] px-4 py-4 text-sm text-[var(--brand-muted)]">
                This student does not have interests available to prioritize.
              </div>
            )}
          </section>

          <section className="space-y-4">
            {isLoading ? (
              <div className="rounded-[1.8rem] border border-[rgba(0,53,84,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,252,0.92))] px-5 py-10 text-center shadow-[0_22px_42px_-34px_rgba(0,53,84,0.55)]">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[rgba(0,94,184,0.18)] border-t-[var(--brand-primary)]" />
                <p className="mt-3 text-sm font-semibold text-[var(--brand-body)]">
                  Loading recommendations...
                </p>
              </div>
            ) : errorMessage ? (
              <div className="rounded-[1.8rem] border border-[rgba(196,53,53,0.2)] bg-[rgba(196,53,53,0.06)] px-5 py-10 text-center">
                <p className="text-sm font-semibold text-[var(--brand-body)]">
                  Could not load recommendations.
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
                  {errorMessage}
                </p>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((recommendation) => {
                  const candidateAppId = recommendation.app_id?.toString() ?? "";
                  const hasAppId = candidateAppId.trim().length > 0;
                  const profileHref = hasAppId
                    ? `/StudentProfile?id=${encodeURIComponent(candidateAppId)}`
                    : "";
                  const favoriteId = getFavoriteStudentId({
                    pax_id: recommendation.app_id,
                    app_id: recommendation.app_id,
                  });
                  const isFavorited = favoriteId
                    ? favoritedStudents.has(favoriteId)
                    : false;
                  const prioritizedMatches =
                    recommendation.reasons?.priority_interests ?? [];
                  const sharedInterests =
                    recommendation.reasons?.shared_interests ?? [];
                  const extraInterests = toExtraInterestList(
                    recommendation.reasons?.extra_interests
                  );
                  const reasonBadges = toReasonBadges(recommendation);

                  return (
                    <article
                      key={`${recommendation.app_id}-${recommendation.usahsid}`}
                      className="rounded-[1.8rem] border border-[rgba(0,53,84,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,249,253,0.92))] p-5 shadow-[0_22px_44px_-34px_rgba(0,53,84,0.58)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h4 className="text-[1.65rem] font-black tracking-[-0.03em] text-[var(--brand-ink)]">
                              {hasAppId ? (
                                <a
                                  href={profileHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 underline decoration-[rgba(0,94,184,0.28)] underline-offset-4 transition hover:text-[var(--brand-primary)]"
                                >
                                  {textOrNotProvided(recommendation.first_name)}
                                  <ArrowUpRight className="h-4 w-4" />
                                </a>
                              ) : (
                                textOrNotProvided(recommendation.first_name)
                              )}
                            </h4>
                            <span
                              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${getStatusBadgeClass(
                                recommendation.placement_status
                              )}`}
                            >
                              {textOrNotProvided(recommendation.placement_status)}
                            </span>
                          </div>
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                            USAHS ID {textOrNotProvided(recommendation.usahsid)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!favoriteId) return;
                            if (isFavorited) {
                              onUnfavorite(favoriteId);
                            } else {
                              onFavorite(favoriteId);
                            }
                          }}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,53,84,0.1)] bg-white/88 text-[var(--brand-muted)] shadow-[0_12px_24px_-20px_rgba(0,53,84,0.7)] transition hover:border-[rgba(255,87,0,0.22)] hover:bg-[rgba(255,87,0,0.06)]"
                          aria-label={isFavorited ? "Remove favorite" : "Add favorite"}
                          title={isFavorited ? "Remove favorite" : "Add favorite"}
                        >
                          <Heart
                            className={`h-4 w-4 transition-colors ${
                              isFavorited
                                ? "fill-[var(--brand-danger)] text-[var(--brand-danger)]"
                                : "text-[var(--brand-muted)]"
                            }`}
                          />
                        </button>
                      </div>

                      {prioritizedMatches.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {prioritizedMatches.map((interest) => (
                            <span
                              key={`${recommendation.app_id}-${interest}-priority`}
                              className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,87,0,0.2)] bg-[rgba(255,87,0,0.1)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--brand-accent)]"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {interest}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {extraInterests.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {extraInterests.map((interest) => (
                            <span
                              key={`${recommendation.app_id}-${interest}-extra`}
                              className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,87,0,0.2)] bg-[rgba(255,87,0,0.1)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--brand-accent)]"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {interest}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-4 rounded-[1.4rem] border border-[rgba(0,53,84,0.08)] bg-white/82 p-4">
                        <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--brand-body)]">
                          <Star className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                          Shared interests
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {sharedInterests.map((interest) => (
                            <span
                              key={`${recommendation.app_id}-${interest}`}
                              className="rounded-full border border-[var(--brand-border-soft)] bg-[rgba(0,94,184,0.05)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-body)]"
                            >
                              {interest}
                            </span>
                          ))}
                          {sharedInterests.length === 0 &&
                          extraInterests.length === 0 ? (
                            <span className="text-sm text-[var(--brand-muted)]">
                              No interest matches returned.
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2.5">
                          {reasonBadges.map((badge) => (
                            <span
                              key={`${recommendation.app_id}-${badge}`}
                              className="rounded-full border border-[var(--brand-border-soft)] bg-[rgba(0,53,84,0.05)] px-3 py-1.5 text-[11px] font-semibold text-[var(--brand-body)]"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : !hasRequestedRecommendations ? (
              <div className="rounded-[1.8rem] border border-dashed border-[rgba(0,53,84,0.14)] bg-[linear-gradient(180deg,rgba(246,250,253,0.9),rgba(255,255,255,0.95))] px-5 py-10 text-center">
                <p className="text-base font-semibold text-[var(--brand-body)]">
                  Ready when you are.
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
                  Pick any priority interests you want to emphasize, then use
                  the button above to generate recommendations.
                </p>
              </div>
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-[var(--brand-border)] bg-[linear-gradient(180deg,rgba(246,247,248,0.82),rgba(255,255,255,0.94))] px-5 py-10 text-center">
                <p className="text-sm font-semibold text-[var(--brand-body)]">
                  No recommendations were returned.
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
                  Try clearing prioritized interests or checking that this student
                  has enough profile data for comparison.
                </p>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
