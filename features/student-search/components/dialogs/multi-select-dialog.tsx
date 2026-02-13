import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterCheckbox } from "@/features/student-search/components/filter-checkbox";

type MultiSelectOption = {
  id: string;
  label: string;
  value: string;
};

type MultiSelectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  doneLabel?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  emptyResultsLabel?: string;
};

export function MultiSelectDialog({
  open,
  onOpenChange,
  title,
  options,
  selectedValues,
  onToggle,
  doneLabel = "Done",
  showSearch = false,
  searchPlaceholder = "Search",
  emptyResultsLabel = "No options found.",
}: MultiSelectDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, searchQuery]);

  const selectedCount = selectedValues.length;

  useEffect(() => {
    if (open) return;
    setSearchQuery("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[90] mx-auto w-md rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] backdrop-blur-xl shadow-[0_20px_42px_-28px_rgba(0,53,84,0.8)] sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[var(--brand-ink)]">
            {title}
          </DialogTitle>
        </DialogHeader>
        {showSearch && (
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm text-[var(--brand-body)]"
          />
        )}
        <div className="rounded-lg border border-[var(--brand-border-soft)] bg-white/75 px-2 py-1 text-xs font-medium text-[var(--brand-muted)]">
          {selectedCount} selected
        </div>
        <div className="mt-1 max-h-[52vh] space-y-1 overflow-y-auto pr-1">
          {filteredOptions.map((option) => (
            <div
              key={option.id}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[rgba(0,94,184,0.06)]"
            >
              <FilterCheckbox
                id={option.id}
                checked={selectedValues.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
              <label
                htmlFor={option.id}
                className="flex-1 cursor-pointer text-sm font-medium text-[var(--brand-body)]"
              >
                {option.label}
              </label>
            </div>
          ))}
          {filteredOptions.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--brand-muted)]">
              {emptyResultsLabel}
            </p>
          )}
        </div>
        <div className="flex border-t border-[var(--brand-border-soft)]">
          <Button
            onClick={() => onOpenChange(false)}
            className="h-10 flex-1 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-deep)] font-semibold text-white shadow-lg shadow-[rgba(0,94,184,0.24)] hover:from-[var(--brand-primary-deep)] hover:to-[var(--brand-primary)]"
          >
            {doneLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
