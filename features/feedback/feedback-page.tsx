"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquareText,
  Plus,
  RefreshCw,
  CalendarDays,
  UserRound,
  ArrowLeft,
  X,
} from "lucide-react";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import type { HeaderView } from "@/components/layout/Header";
import { FeedbackDialog } from "@/features/student-search/components/dialogs/feedback-dialog";
import { useFeedbackForm } from "@/features/student-search/hooks/use-feedback-form";

const API_URL = "/api";

type FeedbackItem = {
  id: number;
  username: string;
  first_name: string;
  comment: string;
  comment_date: string;
};

const formatCommentDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Unknown date";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

type FeedbackPageProps = {
  activeView?: HeaderView;
  onViewChange?: (view: HeaderView) => void;
  embedded?: boolean;
};

export default function FeedbackPage({
  activeView,
  onViewChange,
  embedded = false,
}: FeedbackPageProps) {
  const { isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [updateTime, setUpdateTime] = useState("");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        if (!response.ok) return;
        const data = await response.json();
        setFirstName(data?.first_name || "");
      } catch (fetchError) {
        console.error("Error loading current user:", fetchError);
      }
    };

    const fetchUpdateTime = async () => {
      try {
        const response = await fetch(`${API_URL}/misc/last_update_time`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        if (!response.ok) return;
        const data = await response.json();
        setUpdateTime(data?.[0] || "");
      } catch (fetchError) {
        console.error("Error loading update time:", fetchError);
      }
    };

    fetchUser();
    fetchUpdateTime();
  }, [isAuthenticated]);

  const fetchFeedback = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoadingFeedback(true);

    try {
      const response = await fetch(`${API_URL}/feedback/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load feedback");
      }

      const data = await response.json();
      setFeedback(Array.isArray(data) ? data : []);
      setError(null);
    } catch (fetchError) {
      console.error("Error loading feedback:", fetchError);
      setError("Unable to load feedback right now.");
      setFeedback([]);
    } finally {
      setIsLoadingFeedback(false);
      setIsRefreshing(false);
    }
  };

  const feedbackForm = useFeedbackForm({
    onSuccess: async () => {
      await fetchFeedback(true);
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchFeedback();
    }
  }, [isAuthenticated]);

  const sortedFeedback = useMemo(() => {
    return [...feedback].sort((a, b) => {
      const aTime = new Date(a.comment_date).getTime();
      const bTime = new Date(b.comment_date).getTime();
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return b.id - a.id;
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;
      return bTime - aTime;
    });
  }, [feedback]);

  const handleDeleteFeedback = async (id: number) => {
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    try {
      const response = await fetch(`${API_URL}/feedback/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete feedback");
      }

      setFeedback((prev) => prev.filter((item) => item.id !== id));
      setError(null);
    } catch (deleteError) {
      console.error("Error deleting feedback:", deleteError);
      setError("Unable to delete this feedback item.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="brand-page-gradient min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--brand-primary)]"></div>
          <p className="mt-4 font-medium text-[var(--brand-body)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${embedded ? "brand-page-gradient" : "brand-page-gradient min-h-screen"} relative overflow-hidden`}
    >
      <div className="relative z-10">
        {!embedded && (
          <Header
            firstName={firstName}
            onLogout={logout}
            updateTime={updateTime}
            activeView={activeView}
            onViewChange={onViewChange}
          />
        )}

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          <section className="mb-6 overflow-hidden rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.9)] shadow-lg shadow-[rgba(0,53,84,0.08)] backdrop-blur-sm">
            <div className="bg-gradient-to-r from-[var(--brand-primary-deep)] via-[var(--brand-primary)] to-[var(--brand-secondary)] p-5 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                    Feedback Board
                  </h1>
                  <p className="mt-1 text-sm text-white/90">
                    Let me know if anything needs fixing or updating and I will do my best to address it.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!embedded && !onViewChange && (
                    <Link href="/">
                      <Button
                        variant="outline"
                        className="h-9 bg-white/10 border-white/25 text-white hover:bg-white/20 hover:text-white"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Search
                      </Button>
                    </Link>
                  )}
                  <Button
                    onClick={feedbackForm.openFeedbackDialog}
                    variant="outline"
                    className="h-9 border-[rgba(255,255,255,0.4)] bg-white text-[var(--brand-primary-deep)] hover:bg-[var(--brand-surface)]"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Feedback
                  </Button>
                  <Button
                    onClick={() => fetchFeedback(true)}
                    disabled={isRefreshing}
                    variant="outline"
                    className="h-9 border-[rgba(255,255,255,0.4)] bg-white text-[var(--brand-primary-deep)] hover:bg-[var(--brand-surface)]"
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--brand-border-soft)] bg-[rgba(0,53,84,0.05)] px-5 py-3">
              <div className="flex items-center gap-2 text-[var(--brand-body)]">
                <MessageSquareText className="h-4 w-4 text-[var(--brand-primary)]" />
                <span className="text-sm font-semibold">
                  {sortedFeedback.length} feedback item
                  {sortedFeedback.length === 1 ? "" : "s"}
                </span>
              </div>
              {error && <p className="text-xs font-semibold text-[var(--brand-danger)]">{error}</p>}
            </div>
          </section>

          {isLoadingFeedback ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] p-4 shadow-md"
                >
                  <div className="mb-3 h-4 w-1/2 rounded bg-[rgba(187,192,195,0.45)]" />
                  <div className="mb-2 h-3 w-full rounded bg-[rgba(187,192,195,0.45)]" />
                  <div className="mb-4 h-3 w-5/6 rounded bg-[rgba(187,192,195,0.45)]" />
                  <div className="h-3 w-1/3 rounded bg-[rgba(187,192,195,0.45)]" />
                </div>
              ))}
            </div>
          ) : sortedFeedback.length === 0 ? (
            <div className="mb-8 rounded-2xl border border-dashed border-[var(--brand-border)] bg-[rgba(253,254,255,0.85)] p-12 text-center shadow-sm">
              <MessageSquareText className="mx-auto mb-3 h-9 w-9 text-[var(--brand-muted)]" />
              <h2 className="text-lg font-bold text-[var(--brand-ink)]">No Feedback Yet</h2>
              <p className="mt-1 text-sm text-[var(--brand-body)]">
                Once feedback is submitted, it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              {sortedFeedback.map((item, index) => (
                <article
                  key={item.id}
                  className="group relative rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_6px_16px_rgba(0,53,84,0.08)] transition-all duration-200 hover:shadow-[0_12px_26px_rgba(0,53,84,0.14)]"
                  style={{ animationDelay: `${index * 35}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => handleDeleteFeedback(item.id)}
                    disabled={deletingIds.has(item.id)}
                    className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] text-[var(--brand-muted)] transition-colors hover:border-[rgba(201,18,41,0.35)] hover:bg-[rgba(201,18,41,0.1)] hover:text-[var(--brand-danger)] disabled:opacity-50"
                    title="Delete feedback"
                    aria-label={`Delete feedback ${item.id}`}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="pr-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white shadow-sm">
                        <UserRound className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[var(--brand-ink)]">
                          {item.first_name || "Unknown User"}
                        </p>
                        <p className="truncate text-xs text-[var(--brand-muted)]">
                          @{item.username || "unknown"}
                        </p>
                      </div>
                    </div>

                    <p className="min-h-16 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--brand-body)]">
                      {item.comment || "(No comment text)"}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-[rgba(187,192,195,0.4)] pt-3 text-xs text-[var(--brand-muted)]">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-[var(--brand-muted)]" />
                        {formatCommentDate(item.comment_date)}
                      </span>
                      {deletingIds.has(item.id) && (
                        <span className="font-semibold text-[var(--brand-danger)]">Deleting...</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>

        <FeedbackDialog
          open={feedbackForm.isFeedbackOpen}
          onOpenChange={feedbackForm.handleFeedbackOpenChange}
          feedbackComment={feedbackForm.feedbackComment}
          onFeedbackCommentChange={feedbackForm.setFeedbackComment}
          feedbackError={feedbackForm.feedbackError}
          feedbackSuccess={feedbackForm.feedbackSuccess}
          isSubmittingFeedback={feedbackForm.isSubmittingFeedback}
          onSubmit={feedbackForm.submitFeedback}
        />

        {!embedded && <Footer />}
      </div>
    </div>
  );
}
