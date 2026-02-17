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
  invalidateClientCacheByPrefix,
} from "@/lib/client-cache";
import { ENABLE_ADMIN_PANEL, ENABLE_RPM } from "@/lib/feature-flags";

const API_URL = "/api";

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
        const [userResponse, updateTimeResponse] = await Promise.all([
          fetch(`${API_URL}/auth/me`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }),
          fetch(`${API_URL}/misc/last_update_time`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }),
        ]);

        if (userResponse.ok) {
          const userData = (await userResponse.json()) as {
            first_name?: string;
            account_type?: string;
          };
          setFirstName(userData?.first_name ?? "");
          setAccountType(userData?.account_type ?? "");
        }

        if (updateTimeResponse.ok) {
          const updateData = (await updateTimeResponse.json()) as unknown[];
          if (Array.isArray(updateData)) {
            setUpdateTime(String(updateData[0] ?? ""));
          }
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
      const response = await fetch(`${API_URL}/students/update_db`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to update DB: ${response.status}`);
      }

      invalidateClientCacheByPrefix("misc:");
      invalidateClientCacheByPrefix("students:status:");
      invalidateClientCacheByPrefix("newsFeed:list");

      const latestUpdateResponse = await fetch(`${API_URL}/misc/last_update_time`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (latestUpdateResponse.ok) {
        const latestUpdateData = (await latestUpdateResponse.json()) as unknown[];
        if (Array.isArray(latestUpdateData)) {
          setUpdateTime(String(latestUpdateData[0] ?? ""));
        }
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
    <StudentSearchPage
      activeView={activeView}
      onViewChange={handleViewChange}
      embedded
    />
  );

  if (activeView === "newsFeed") {
    content = (
      <NewsFeedPage activeView={activeView} onViewChange={handleViewChange} embedded />
    );
  }

  if (activeView === "feedback") {
    content = (
      <FeedbackPage activeView={activeView} onViewChange={handleViewChange} embedded />
    );
  }

  if (activeView === "rpm") {
    content = (
      <RpmPage activeView={activeView} onViewChange={handleViewChange} embedded />
    );
  }

  if (activeView === "admin") {
    content = (
      <AdminPage activeView={activeView} onViewChange={handleViewChange} embedded />
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
