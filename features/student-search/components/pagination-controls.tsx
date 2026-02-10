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
        <span className="text-xs md:text-sm font-medium text-[var(--brand-muted)]">
          Results per page
        </span>
        <Select
          value={String(resultsPerPage)}
          onValueChange={(value) => onResultsPerPageChange(Number(value))}
        >
          <SelectTrigger className="h-9 w-[94px] border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm font-semibold text-[var(--brand-ink)]">
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
        className="h-10 bg-transparent px-4 border-[var(--brand-border)] text-[var(--brand-body)] transition-all duration-200 hover:border-[var(--brand-primary)] hover:bg-[rgba(0,94,184,0.08)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--brand-border)] disabled:hover:bg-transparent font-medium"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        Previous
      </Button>

      <div className="flex items-center gap-2 rounded-lg border border-[var(--brand-border-soft)] bg-[var(--brand-surface-elevated)] px-4 py-2 shadow-sm">
        <span className="text-sm font-medium text-[var(--brand-muted)]">Page</span>
        <span className="text-sm font-bold text-[var(--brand-ink)]">{currentPage}</span>
        <span className="text-sm font-medium text-[var(--brand-muted)]">of</span>
        <span className="text-sm font-bold text-[var(--brand-ink)]">{totalPages}</span>
      </div>

      <Button
        onClick={onNextPage}
        disabled={currentPage === totalPages || totalPages <= 1}
        variant="outline"
        className="h-10 bg-transparent px-4 border-[var(--brand-border)] text-[var(--brand-body)] transition-all duration-200 hover:border-[var(--brand-primary)] hover:bg-[rgba(0,94,184,0.08)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--brand-border)] disabled:hover:bg-transparent font-medium"
      >
        Next
        <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
      </div>
    </div>
  );
}
