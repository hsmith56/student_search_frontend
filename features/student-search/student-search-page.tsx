"use client";

import { CheckCircle2, Heart, UserCheck as UserLock, Users } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/auth-context";
import { SEARCH_TIPS } from "@/features/student-search/constants";
import { FeedbackDialog } from "@/features/student-search/components/dialogs/feedback-dialog";
import { PaginationControls } from "@/features/student-search/components/pagination-controls";
import { QuickStatsSection } from "@/features/student-search/components/quick-stats-section";
import { SearchControls } from "@/features/student-search/components/search-controls";
import { ResultsSection } from "@/features/student-search/components/results/results-section";
import { useAuthRedirect } from "@/features/student-search/hooks/use-auth-redirect";
import { useFeedbackForm } from "@/features/student-search/hooks/use-feedback-form";
import { useIsMobile } from "@/features/student-search/hooks/use-is-mobile";
import { useStudentSearchController } from "@/features/student-search/hooks/use-student-search-controller";
import type { QuickStatsCard } from "@/features/student-search/types";
import type { HeaderView } from "@/components/layout/Header";
import { ENABLE_ADMIN_PANEL, ENABLE_RPM } from "@/lib/feature-flags";

type StudentSearchPageProps = {
  activeView?: HeaderView;
  onViewChange?: (view: HeaderView) => void;
  embedded?: boolean;
};

export default function StudentSearchPage({
  activeView,
  onViewChange,
  embedded = false,
}: StudentSearchPageProps) {
  const { isAuthenticated, logout, isLoading: authLoading } = useAuth();
  useAuthRedirect({ authLoading, isAuthenticated });

  const isMobile = useIsMobile();
  const feedback = useFeedbackForm();
  const controller = useStudentSearchController({ isAuthenticated });

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

  const quickStatsCards: QuickStatsCard[] = [
    {
      label: "Available Now",
      value: controller.availableNow,
      icon: Users,
      iconClass: "text-[var(--brand-primary)]",
      cardClass:
        "border-[rgba(0,94,184,0.32)] bg-[rgba(253,254,255,0.95)] hover:border-[rgba(0,94,184,0.5)]",
      onClick: () => controller.fetchStudentsByStatus(["Allocated"]),
    },
    ...(controller.canShowUnassigned
      ? [
          {
            label: "Unassigned",
            value: controller.unassignedNow,
            icon: UserLock,
            iconClass: "text-[var(--brand-body)]",
            cardClass:
              "border-[rgba(114,125,131,0.4)] bg-[rgba(253,254,255,0.95)] hover:border-[rgba(114,125,131,0.62)]",
            onClick: () => controller.fetchStudentsByStatus(["Unassigned"]),
          } satisfies QuickStatsCard,
        ]
      : []),
    {
      label: "Students Placed",
      value: controller.alreadyPlaced,
      icon: CheckCircle2,
      iconClass: "text-[var(--brand-success-deep)]",
      cardClass:
        "border-[rgba(0,144,63,0.35)] bg-[rgba(253,254,255,0.95)] hover:border-[rgba(0,144,63,0.56)]",
      onClick: () => controller.fetchStudentsByStatus(["Placed", "Pending"]),
    },
    {
      label: "My Favorites",
      value: controller.favoritedStudents.size,
      icon: Heart,
      iconClass: "text-[var(--brand-accent)]",
      cardClass:
        "border-[rgba(255,87,0,0.35)] bg-[rgba(253,254,255,0.95)] hover:border-[rgba(255,87,0,0.56)]",
      onClick: controller.showFavorites,
    },
  ];

  return (
    <div
      className={`${embedded ? "brand-page-gradient" : "brand-page-gradient min-h-screen"} relative overflow-hidden`}
    >
      <div className="relative z-10">
        {!embedded && (
          <Header
            firstName={controller.firstName}
            onLogout={logout}
            updateTime={controller.updateTime}
            onUpdateDatabase={
              controller.canUpdateDatabase
                ? controller.handleUpdateDatabase
                : undefined
            }
            isUpdatingDatabase={controller.isUpdatingDatabase}
            activeView={activeView}
            onViewChange={onViewChange}
            showRpm={ENABLE_RPM && !controller.isLcUser}
            showAdmin={ENABLE_ADMIN_PANEL && controller.isAdminUser}
          />
        )}

        <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-10 py-5">
          <div className="mx-auto w-full max-w-[1900px]">
            <QuickStatsSection
              cards={quickStatsCards}
              searchTips={SEARCH_TIPS}
              onOpenFeedback={feedback.openFeedbackDialog}
            />

            <SearchControls
              isSearchFiltersExpanded={controller.isSearchFiltersExpanded}
              setIsSearchFiltersExpanded={controller.setIsSearchFiltersExpanded}
              query={controller.query}
              onQueryChange={controller.setQuery}
              usahsIdQuery={controller.usahsIdQuery}
              onUsahsIdQueryChange={controller.setUsahsIdQuery}
              photoQuery={controller.photoQuery}
              onPhotoQueryChange={controller.setPhotoQuery}
              onSearchInputKeyDown={controller.handleSearchInputKeyDown}
              isFilterOpen={controller.isFilterOpen}
              onFilterOpenChange={controller.setIsFilterOpen}
              filters={controller.filters}
              setFilters={controller.setFilters}
              countries={controller.countries}
              onToggleStatus={controller.toggleStatus}
              onToggleProgramType={controller.toggleProgramType}
              onToggleScholarship={controller.toggleScholarship}
              statusOptions={controller.statusOptionsForFilter}
              stateOptions={controller.stateOptionsForFilter}
              defaultStateValue={controller.defaultStateFilterValue}
              onApplyFilters={controller.applyFilters}
              onFindStudents={controller.handleFindStudents}
              onClearFilters={controller.clearFilters}
              activeFilterCount={controller.activeFilterCount}
              totalResults={controller.totalResults}
              viewMode={controller.viewMode}
              onViewModeChange={controller.setViewMode}
            />

            <ResultsSection
              students={controller.students}
              viewMode={controller.viewMode}
              isMobile={isMobile}
              shouldAnimateResults={controller.resultsAnimationKey > 0}
              resultsAnimationKey={controller.resultsAnimationKey}
              favoritedStudents={controller.favoritedStudents}
              orderBy={controller.orderBy}
              descending={controller.descending}
              onToggleSort={controller.toggleSort}
              onFavorite={controller.handleFavorite}
              onUnfavorite={controller.handleUnfavorite}
            />

            <PaginationControls
              currentPage={controller.currentPage}
              totalPages={controller.totalPages}
              showFavoritesOnly={controller.showFavoritesOnly}
              resultsPerPage={controller.resultsPerPage}
              onResultsPerPageChange={controller.handleResultsPerPageChange}
              onPreviousPage={controller.goToPreviousPage}
              onNextPage={controller.goToNextPage}
            />
          </div>
        </div>

        {!embedded && <Footer />}
      </div>

      <FeedbackDialog
        open={feedback.isFeedbackOpen}
        onOpenChange={feedback.handleFeedbackOpenChange}
        feedbackComment={feedback.feedbackComment}
        onFeedbackCommentChange={feedback.setFeedbackComment}
        feedbackError={feedback.feedbackError}
        feedbackSuccess={feedback.feedbackSuccess}
        isSubmittingFeedback={feedback.isSubmittingFeedback}
        onSubmit={feedback.submitFeedback}
      />
    </div>
  );
}
