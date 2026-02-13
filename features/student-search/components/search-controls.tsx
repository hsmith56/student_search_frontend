import {
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type SetStateAction,
} from "react";
import { Camera, ChevronDown, ChevronUp, LayoutGrid, List, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentFiltersPanel } from "@/features/student-search/components/panels/student-filters-panel";
import type { Filters, ViewMode } from "@/features/student-search/types";

type SearchControlsProps = {
  isSearchFiltersExpanded: boolean;
  setIsSearchFiltersExpanded: (value: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  usahsIdQuery: string;
  onUsahsIdQueryChange: (value: string) => void;
  photoQuery: string;
  onPhotoQueryChange: (value: string) => void;
  onSearchInputKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  countries: string[];
  onToggleStatus: (value: string) => void;
  onToggleProgramType: (value: string) => void;
  onToggleScholarship: (value: string) => void;
  statusOptions: { id: string; label: string; value: string }[];
  onApplyFilters: () => void;
  onFindStudents: () => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  totalResults: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

export function SearchControls({
  isSearchFiltersExpanded,
  setIsSearchFiltersExpanded,
  query,
  onQueryChange,
  usahsIdQuery,
  onUsahsIdQueryChange,
  photoQuery,
  onPhotoQueryChange,
  onSearchInputKeyDown,
  isFilterOpen,
  onFilterOpenChange,
  filters,
  setFilters,
  countries,
  onToggleStatus,
  onToggleProgramType,
  onToggleScholarship,
  statusOptions,
  onApplyFilters,
  onFindStudents,
  onClearFilters,
  activeFilterCount,
  totalResults,
  viewMode,
  onViewModeChange,
}: SearchControlsProps) {
  return (
    <div className="sticky top-[60px] z-40 mb-3 overflow-visible rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.92)] backdrop-blur-xl shadow-[0_10px_24px_rgba(0,53,84,0.08)]">
      <button
        onClick={() => setIsSearchFiltersExpanded(!isSearchFiltersExpanded)}
        className="xl:hidden w-full flex items-center justify-between p-4 transition-colors hover:bg-[rgba(0,94,184,0.06)]"
      >
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--brand-ink)]">
          <Search className="w-4 h-4 text-[var(--brand-primary)]" />
          Search & Filters
        </h3>
        {isSearchFiltersExpanded ? (
          <ChevronUp className="w-5 h-5 text-[var(--brand-muted)]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[var(--brand-muted)]" />
        )}
      </button>

      <div
        className={`${isSearchFiltersExpanded ? "block" : "hidden"} xl:block p-4 ${
          isSearchFiltersExpanded
            ? "border-t border-[var(--brand-border-soft)] xl:border-t-0"
            : ""
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-muted)]" />
            <Input
              placeholder="Free Text Search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={onSearchInputKeyDown}
              className="h-10 border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] pl-9 text-[var(--brand-body)] transition-all duration-200 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[rgba(0,94,184,0.2)]"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-muted)]" />
            <Input
              placeholder="usahsId Search"
              value={usahsIdQuery}
              onChange={(e) => onUsahsIdQueryChange(e.target.value)}
              onKeyDown={onSearchInputKeyDown}
              className="h-10 border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] pl-9 text-[var(--brand-body)] transition-all duration-200 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[rgba(0,94,184,0.2)]"
            />
          </div>
          <div className="relative">
            <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-muted)]" />
            <Input
              placeholder="Photo Search"
              value={photoQuery}
              onChange={(e) => onPhotoQueryChange(e.target.value)}
              onKeyDown={onSearchInputKeyDown}
              className="h-10 border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] pl-9 text-[var(--brand-body)] transition-all duration-200 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[rgba(0,94,184,0.2)]"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
          <div className="relative">
            <Button
              onClick={() => onFilterOpenChange(!isFilterOpen)}
              variant="outline"
              className={`h-10 flex-shrink-0 whitespace-nowrap border-[rgba(255,87,0,0.34)] text-[var(--brand-body)] transition-all duration-200 hover:border-[rgba(255,87,0,0.58)] hover:bg-[rgba(255,87,0,0.08)] flex items-center justify-center gap-2 font-medium ${
                isFilterOpen ? "bg-[rgba(255,87,0,0.12)] border-[rgba(255,87,0,0.58)]" : ""
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-[var(--brand-accent)]" />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--brand-accent)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <StudentFiltersPanel
              open={isFilterOpen}
              onOpenChange={onFilterOpenChange}
              filters={filters}
              setFilters={setFilters}
              countries={countries}
              onToggleStatus={onToggleStatus}
              onToggleProgramType={onToggleProgramType}
              onToggleScholarship={onToggleScholarship}
              onApplyFilters={onApplyFilters}
              onClearFilters={onClearFilters}
              statusOptions={statusOptions}
            />
          </div>
          <Button
            onClick={onFindStudents}
            className="h-10 flex-1 whitespace-nowrap bg-gradient-to-r from-[var(--brand-accent)] to-[#ff7b1a] text-white shadow-md shadow-[rgba(255,87,0,0.24)] transition-all duration-200 hover:from-[#ea4f00] hover:to-[var(--brand-accent)] hover:shadow-lg hover:shadow-[rgba(255,87,0,0.3)] font-semibold"
          >
            Find Students
          </Button>
          <Button
            onClick={onClearFilters}
            variant="outline"
            className="h-10 flex-shrink-0 whitespace-nowrap border-[var(--brand-border)] bg-transparent text-[var(--brand-body)] transition-all duration-200 hover:border-[var(--brand-primary-deep)] hover:bg-[rgba(0,53,84,0.06)] flex items-center justify-center gap-2 font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Clear Filters
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-[var(--brand-muted)]">
            <span className="font-bold text-[var(--brand-ink)]">{totalResults}</span>{" "}
            results found
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--brand-muted)]">View:</span>
            <div className="flex items-center gap-1 rounded-lg bg-[rgba(0,53,84,0.06)] p-1">
              <button
                onClick={() => onViewModeChange("card")}
                className={`p-1.5 rounded transition-all duration-200 ${
                  viewMode === "card"
                    ? "bg-[var(--brand-surface-elevated)] text-[var(--brand-primary)] shadow-sm"
                    : "text-[var(--brand-muted)] hover:text-[var(--brand-body)]"
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange("compact")}
                className={`p-1.5 rounded transition-all duration-200 ${
                  viewMode === "compact"
                    ? "bg-[var(--brand-surface-elevated)] text-[var(--brand-primary)] shadow-sm"
                    : "text-[var(--brand-muted)] hover:text-[var(--brand-body)]"
                }`}
                title="Compact View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
