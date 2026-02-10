import { Camera, ChevronDown, ChevronUp, LayoutGrid, List, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ViewMode } from "@/features/student-search/types";

type SearchControlsProps = {
  isSearchFiltersExpanded: boolean;
  setIsSearchFiltersExpanded: (value: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  usahsIdQuery: string;
  onUsahsIdQueryChange: (value: string) => void;
  photoQuery: string;
  onPhotoQueryChange: (value: string) => void;
  onSearchInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onOpenFilters: () => void;
  onFindStudents: () => void;
  onClearFilters: () => void;
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
  onOpenFilters,
  onFindStudents,
  onClearFilters,
  totalResults,
  viewMode,
  onViewModeChange,
}: SearchControlsProps) {
  return (
    <div className="sticky top-[60px] z-40 mb-3 overflow-hidden rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.92)] backdrop-blur-xl shadow-[0_10px_24px_rgba(0,53,84,0.08)]">
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
          <Button
            onClick={onOpenFilters}
            variant="outline"
            className="h-10 flex-shrink-0 whitespace-nowrap border-[var(--brand-border)] text-[var(--brand-body)] transition-all duration-200 hover:border-[var(--brand-primary)] hover:bg-[rgba(0,94,184,0.08)] flex items-center justify-center gap-2 font-medium"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </Button>
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
