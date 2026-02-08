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
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-slate-200 w-md mx-auto rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900 text-lg font-bold">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 mt-1">
          {options.map((option) => (
            <div
              key={option.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <FilterCheckbox
                id={option.id}
                checked={selectedValues.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
              <label
                htmlFor={option.id}
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
        <div className="flex border-t border-slate-200">
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25 font-semibold"
          >
            {doneLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
