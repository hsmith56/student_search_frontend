"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquareText,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${embedded ? "bg-slate-100" : "min-h-screen bg-slate-100"} relative overflow-hidden`}
    >
      <div className="absolute -top-24 -left-20 h-72 w-72 bg-cyan-300/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-16 -right-20 h-80 w-80 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 h-80 w-80 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none" />

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
          <section className="mb-6 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg shadow-slate-900/5 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-5 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] font-semibold text-blue-100">
                    Internal Review Stream
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                    Feedback Board
                  </h1>
                  <p className="text-sm text-blue-50/90 mt-1">
                    All submitted comments in one place.
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
                    onClick={() => fetchFeedback(true)}
                    disabled={isRefreshing}
                    variant="outline"
                    className="h-9 bg-white text-blue-700 border-blue-100 hover:bg-blue-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700">
                <MessageSquareText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold">
                  {sortedFeedback.length} feedback item
                  {sortedFeedback.length === 1 ? "" : "s"}
                </span>
              </div>
              {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
            </div>
          </section>

          {isLoadingFeedback ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-md animate-pulse"
                >
                  <div className="h-4 w-1/2 bg-slate-200 rounded mb-3" />
                  <div className="h-3 w-full bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-5/6 bg-slate-200 rounded mb-4" />
                  <div className="h-3 w-1/3 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : sortedFeedback.length === 0 ? (
            <div className="mb-8 rounded-2xl border border-dashed border-slate-300 bg-white/85 p-12 text-center shadow-sm">
              <MessageSquareText className="w-9 h-9 mx-auto text-slate-400 mb-3" />
              <h2 className="text-lg font-bold text-slate-800">No Feedback Yet</h2>
              <p className="text-sm text-slate-600 mt-1">
                Once feedback is submitted, it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              {sortedFeedback.map((item, index) => (
                <article
                  key={item.id}
                  className="group relative border border-slate-200 rounded-2xl bg-white/95 p-4 shadow-[0_6px_16px_rgba(15,23,42,0.08)] hover:shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all duration-200"
                  style={{ animationDelay: `${index * 35}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => handleDeleteFeedback(item.id)}
                    disabled={deletingIds.has(item.id)}
                    className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    title="Delete feedback"
                    aria-label={`Delete feedback ${item.id}`}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="pr-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center shadow-sm">
                        <UserRound className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {item.first_name || "Unknown User"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          @{item.username || "unknown"}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap break-words min-h-16">
                      {item.comment || "(No comment text)"}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                        {formatCommentDate(item.comment_date)}
                      </span>
                      {deletingIds.has(item.id) && (
                        <span className="font-semibold text-red-600">Deleting...</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>

        {!embedded && <Footer />}
      </div>
    </div>
  );
}
