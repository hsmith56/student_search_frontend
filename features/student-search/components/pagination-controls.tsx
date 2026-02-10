import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  showFavoritesOnly: boolean;
  resultsPerPage: number;
  onResultsPerPageChange: (value: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export function PaginationControls({
  currentPage,
  totalPages,
  showFavoritesOnly,
  resultsPerPage,
  onResultsPerPageChange,
  onPreviousPage,
  onNextPage,
}: PaginationControlsProps) {
  if (showFavoritesOnly) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-8">
      <div className="flex items-center gap-2">
        <span className="text-xs md:text-sm font-medium text-slate-600">
          Results per page
        </span>
        <Select
          value={String(resultsPerPage)}
          onValueChange={(value) => onResultsPerPageChange(Number(value))}
        >
          <SelectTrigger className="h-9 w-[94px] border-slate-300 bg-white text-slate-800 text-sm font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-center gap-4">
      <Button
        onClick={onPreviousPage}
        disabled={currentPage === 1 || totalPages <= 1}
        variant="outline"
        className="h-10 px-4 border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-300 bg-transparent"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        Previous
      </Button>

      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
        <span className="text-sm font-medium text-slate-600">Page</span>
        <span className="text-sm font-bold text-slate-900">{currentPage}</span>
        <span className="text-sm font-medium text-slate-400">of</span>
        <span className="text-sm font-bold text-slate-900">{totalPages}</span>
      </div>

      <Button
        onClick={onNextPage}
        disabled={currentPage === totalPages || totalPages <= 1}
        variant="outline"
        className="h-10 px-4 border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-300 bg-transparent"
      >
        Next
        <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
      </div>
    </div>
  );
}
