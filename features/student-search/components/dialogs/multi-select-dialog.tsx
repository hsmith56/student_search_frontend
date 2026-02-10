import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
};

export function MultiSelectDialog({
  open,
  onOpenChange,
  title,
  options,
  selectedValues,
  onToggle,
  doneLabel = "Done",
}: MultiSelectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-auto w-md rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] backdrop-blur-xl shadow-[0_20px_42px_-28px_rgba(0,53,84,0.8)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[var(--brand-ink)]">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 mt-1">
          {options.map((option) => (
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
