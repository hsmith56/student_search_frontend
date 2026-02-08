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
    <div className="sticky top-[60px] bg-white/90 backdrop-blur-xl z-40 rounded-xl shadow-lg shadow-slate-900/5 border border-black-200/60 mb-3 overflow-hidden">
      <button
        onClick={() => setIsSearchFiltersExpanded(!isSearchFiltersExpanded)}
        className="xl:hidden w-full flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
      >
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-600" />
          Search & Filters
        </h3>
        {isSearchFiltersExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      <div
        className={`${isSearchFiltersExpanded ? "block" : "hidden"} xl:block p-4 ${
          isSearchFiltersExpanded ? "border-t border-slate-200 xl:border-t-0" : ""
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Free Text Search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={onSearchInputKeyDown}
              className="pl-9 h-10 text-slate-700 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="usahsId Search"
              value={usahsIdQuery}
              onChange={(e) => onUsahsIdQueryChange(e.target.value)}
              onKeyDown={onSearchInputKeyDown}
              className="pl-9 h-10 text-slate-700 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
            />
          </div>
          <div className="relative">
            <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Photo Search"
              value={photoQuery}
              onChange={(e) => onPhotoQueryChange(e.target.value)}
              onKeyDown={onSearchInputKeyDown}
              className="pl-9 h-10 text-slate-700 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
          <Button
            onClick={onOpenFilters}
            variant="outline"
            className="h-10 border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 font-medium transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </Button>
          <Button
            onClick={onFindStudents}
            className="flex-1 h-10 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-600/25 hover:shadow-lg hover:shadow-orange-600/30 transition-all duration-200 font-semibold whitespace-nowrap"
          >
            Find Students
          </Button>
          <Button
            onClick={onClearFilters}
            variant="outline"
            className="h-10 border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-medium transition-all duration-200 flex items-center justify-center gap-2 bg-transparent whitespace-nowrap flex-shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            Clear Filters
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-600">
            <span className="font-bold text-slate-900">{totalResults}</span>{" "}
            results found
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">View:</span>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => onViewModeChange("card")}
                className={`p-1.5 rounded transition-all duration-200 ${
                  viewMode === "card"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange("compact")}
                className={`p-1.5 rounded transition-all duration-200 ${
                  viewMode === "compact"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
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
