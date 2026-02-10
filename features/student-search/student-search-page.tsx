"use client";

import { CheckCircle2, Heart, UserCheck as UserLock, Users } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/auth-context";
import { SEARCH_TIPS } from "@/features/student-search/constants";
import { FeedbackDialog } from "@/features/student-search/components/dialogs/feedback-dialog";
import { FiltersDialog } from "@/features/student-search/components/dialogs/filters-dialog";
import { StudentDetailsDialog } from "@/features/student-search/components/dialogs/student-details-dialog";
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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="mt-4 text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const quickStatsCards: QuickStatsCard[] = [
    {
      label: "Available Now",
      value: controller.availableNow,
      icon: Users,
      iconClass: "text-sky-700",
      cardClass: "border-sky-200/80 bg-white/95 hover:border-sky-300/90",
      onClick: () => controller.fetchStudentsByStatus(["Allocated"]),
    },
    {
      label: "Unassigned",
      value: controller.unassignedNow,
      icon: UserLock,
      iconClass: "text-slate-600",
      cardClass: "border-slate-300/80 bg-white/95 hover:border-slate-400/90",
      onClick: () => controller.fetchStudentsByStatus(["Unassigned"]),
    },
    {
      label: "Students Placed",
      value: controller.alreadyPlaced,
      icon: CheckCircle2,
      iconClass: "text-emerald-700",
      cardClass: "border-emerald-200/80 bg-white/95 hover:border-emerald-300/90",
      onClick: () => controller.fetchStudentsByStatus(["Placed", "Pending"]),
    },
    {
      label: "My Favorites",
      value: controller.favoritedStudents.size,
      icon: Heart,
      iconClass: "text-rose-700",
      cardClass: "border-rose-200/80 bg-white/95 hover:border-rose-300/90",
      onClick: controller.showFavorites,
    },
  ];

  return (
    <div
      className={`${embedded ? "bg-gray-200" : "min-h-screen bg-gray-200"} relative overflow-hidden`}
    >
      <div className="relative z-10">
        {!embedded && (
          <Header
            firstName={controller.firstName}
            onLogout={logout}
            updateTime={controller.updateTime}
            onUpdateDatabase={controller.handleUpdateDatabase}
            isUpdatingDatabase={controller.isUpdatingDatabase}
            activeView={activeView}
            onViewChange={onViewChange}
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
              onOpenFilters={() => controller.setIsFilterOpen(true)}
              onFindStudents={controller.handleFindStudents}
              onClearFilters={controller.clearFilters}
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
              onSelectStudent={controller.setSelectedStudent}
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

      <FiltersDialog
        open={controller.isFilterOpen}
        onOpenChange={controller.setIsFilterOpen}
        filters={controller.filters}
        setFilters={controller.setFilters}
        countries={controller.countries}
        isStatusOpen={controller.isStatusOpen}
        setIsStatusOpen={controller.setIsStatusOpen}
        isProgramTypeOpen={controller.isProgramTypeOpen}
        setIsProgramTypeOpen={controller.setIsProgramTypeOpen}
        isScholarshipOpen={controller.isScholarshipOpen}
        setIsScholarshipOpen={controller.setIsScholarshipOpen}
        onToggleStatus={controller.toggleStatus}
        onToggleProgramType={controller.toggleProgramType}
        onToggleScholarship={controller.toggleScholarship}
        onApplyFilters={controller.applyFilters}
      />

      <StudentDetailsDialog
        selectedStudent={controller.selectedStudent}
        selectedStudentMediaLink={controller.selectedStudentMediaLink}
        favoritedStudents={controller.favoritedStudents}
        onFavorite={(paxId) => {
          void controller.handleFavorite(paxId);
        }}
        onUnfavorite={(paxId) => {
          void controller.handleUnfavorite(paxId);
        }}
        onClose={() => controller.setSelectedStudent(null)}
      />
    </div>
  );
}
