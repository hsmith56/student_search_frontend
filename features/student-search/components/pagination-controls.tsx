import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  showFavoritesOnly: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export function PaginationControls({
  currentPage,
  totalPages,
  showFavoritesOnly,
  onPreviousPage,
  onNextPage,
}: PaginationControlsProps) {
  if (totalPages <= 1 || showFavoritesOnly) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      <Button
        onClick={onPreviousPage}
        disabled={currentPage === 1}
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
        disabled={currentPage === totalPages}
        variant="outline"
        className="h-10 px-4 border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-300 bg-transparent"
      >
        Next
        <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </div>
  );
}
