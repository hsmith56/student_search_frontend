"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HeaderView } from "@/components/layout/Header";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/auth-context";
import FeedbackPage from "@/features/feedback/feedback-page";
import NewsFeedPage from "@/features/news-feed/news-feed-page";
import RpmPage from "@/features/rpm/rpm-page";
import AdminPage from "@/features/admin/admin-page";
import StudentSearchPage from "@/features/student-search/student-search-page";
import {
  getCachedValue,
  invalidateClientCacheByPrefix,
} from "@/lib/client-cache";
import { ENABLE_ADMIN_PANEL, ENABLE_RPM } from "@/lib/feature-flags";
import { getCurrentUser } from "@/lib/api/auth";
import { getLastUpdateTime } from "@/lib/api/misc";
import { updateStudentDatabase } from "@/lib/api/students";
import { logPerf } from "@/lib/perf-logger";
import PerfTrace from "@/components/dev/perf-trace";

const AUTH_USER_CACHE_TTL_MS = 5 * 60_000;
const LAST_UPDATE_CACHE_TTL_MS = 30_000;

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [activeView, setActiveView] = useState<HeaderView>("search");
  const [firstName, setFirstName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [hasLoadedAuthUser, setHasLoadedAuthUser] = useState(false);
  const [updateTime, setUpdateTime] = useState("");
  const [isUpdatingDatabase, setIsUpdatingDatabase] = useState(false);
  const normalizedAccountType = accountType.toLowerCase();
  const isLcUser = normalizedAccountType === "lc";
  const isAdminUser = normalizedAccountType.includes("admin");
  const canShowRpm = ENABLE_RPM && !isLcUser;
  const canShowAdmin = ENABLE_ADMIN_PANEL && isAdminUser;

  const handleViewChange = (view: HeaderView) => {
    logPerf("home.viewChange", {
      from: activeView,
      to: view,
      can_show_rpm: canShowRpm,
      can_show_admin: canShowAdmin,
    });

    if (view === "rpm" && !canShowRpm) {
      setActiveView("search");
      return;
    }
    if (view === "admin" && !canShowAdmin) {
      setActiveView("search");
      return;
    }
    setActiveView(view);
  };

  const canUpdateDatabase = hasLoadedAuthUser && accountType.toLowerCase() !== "lc";

  useEffect(() => {
    if (!canShowRpm && activeView === "rpm") {
      setActiveView("search");
    }
    if (!canShowAdmin && activeView === "admin") {
      setActiveView("search");
    }
  }, [activeView, canShowAdmin, canShowRpm]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchHeaderData = async () => {
      try {
        const [userData, updateData] = await Promise.all([
          getCachedValue(
            "auth:me",
            () => getCurrentUser({ redirectOnUnauthorized: false }),
            AUTH_USER_CACHE_TTL_MS
          ),
          getCachedValue("misc:last_update_time", () => getLastUpdateTime(), LAST_UPDATE_CACHE_TTL_MS),
        ]);

        setFirstName(userData?.first_name ?? "");
        setAccountType(userData?.account_type ?? "");
        if (Array.isArray(updateData)) {
          setUpdateTime(String(updateData[0] ?? ""));
        }
      } catch (error) {
        console.error("Error loading header data:", error);
      } finally {
        setHasLoadedAuthUser(true);
      }
    };

    void fetchHeaderData();
  }, [isAuthenticated]);

  const handleUpdateDatabase = useCallback(async () => {
    if (isUpdatingDatabase) return;
    setIsUpdatingDatabase(true);

    try {
      await updateStudentDatabase();

      invalidateClientCacheByPrefix("misc:");
      invalidateClientCacheByPrefix("students:status:");
      invalidateClientCacheByPrefix("newsFeed:list");

      const latestUpdateData = await getLastUpdateTime();
      if (Array.isArray(latestUpdateData)) {
        setUpdateTime(String(latestUpdateData[0] ?? ""));
      }
    } catch (error) {
      console.error("Error updating student DB:", error);
    } finally {
      setIsUpdatingDatabase(false);
    }
  }, [isUpdatingDatabase]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="brand-page-gradient min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--brand-primary)]" />
          <p className="mt-4 font-medium text-[var(--brand-body)]">Loading...</p>
        </div>
      </div>
    );
  }

  let content = (
    <PerfTrace id="view.search" metadata={{ active_view: activeView }}>
      <StudentSearchPage
        activeView={activeView}
        onViewChange={handleViewChange}
        embedded
        accountTypeOverride={accountType}
        hasLoadedAuthUserOverride={hasLoadedAuthUser}
      />
    </PerfTrace>
  );

  if (activeView === "newsFeed") {
    content = (
      <PerfTrace id="view.newsFeed" metadata={{ active_view: activeView }}>
        <NewsFeedPage activeView={activeView} onViewChange={handleViewChange} embedded />
      </PerfTrace>
    );
  }

  if (activeView === "feedback") {
    content = (
      <PerfTrace id="view.feedback" metadata={{ active_view: activeView }}>
        <FeedbackPage activeView={activeView} onViewChange={handleViewChange} embedded />
      </PerfTrace>
    );
  }

  if (activeView === "rpm") {
    content = (
      <PerfTrace id="view.rpm" metadata={{ active_view: activeView }}>
        <RpmPage activeView={activeView} onViewChange={handleViewChange} embedded />
      </PerfTrace>
    );
  }

  if (activeView === "admin") {
    content = (
      <PerfTrace id="view.admin" metadata={{ active_view: activeView }}>
        <AdminPage activeView={activeView} onViewChange={handleViewChange} embedded />
      </PerfTrace>
    );
  }

  return (
    <div className="brand-page-gradient min-h-screen">
      <Header
        firstName={firstName}
        onLogout={logout}
        updateTime={updateTime}
        onUpdateDatabase={canUpdateDatabase ? handleUpdateDatabase : undefined}
        isUpdatingDatabase={isUpdatingDatabase}
        activeView={activeView}
        onViewChange={handleViewChange}
        showRpm={canShowRpm}
        showAdmin={canShowAdmin}
      />
      {content}
      <Footer />
    </div>
  );
}
