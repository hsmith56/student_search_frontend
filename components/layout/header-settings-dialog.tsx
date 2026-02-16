"use client";

import { useCallback, useMemo, useState } from "react";
import { Settings, X } from "lucide-react";

import { states } from "@/components/search/states";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterCheckbox } from "@/features/student-search/components/filter-checkbox";
import { cn } from "@/lib/utils";
import { useFavoriteStates } from "@/lib/favorite-states";

const EXCLUDED_STATE_VALUES = new Set(["all", "no_pref", "state_only", "my_states"]);

type HeaderSettingsDialogProps = {
  desktopTriggerClassName?: string;
  mobileTriggerClassName?: string;
};

export function HeaderSettingsDialog({
  desktopTriggerClassName,
  mobileTriggerClassName,
}: HeaderSettingsDialogProps) {
  const {
    favoriteStates,
    toggleFavoriteState,
    clearFavoriteStates,
    discardFavoriteStateChanges,
    applyFavoriteStates,
    reloadFavoriteStates,
    hasPendingFavoriteStateChanges,
    isLoadingFavoriteStates,
    isApplyingFavoriteStates,
  } = useFavoriteStates();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const stateOptions = useMemo(() => {
    return states
      .filter((option) => !EXCLUDED_STATE_VALUES.has(option.value))
      .map((option) => ({
        id: `favorite-state-${option.value}`,
        label: option.label,
        value: option.value,
      }));
  }, []);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return stateOptions;
    return stateOptions.filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  }, [searchQuery, stateOptions]);

  const handleApply = useCallback(async () => {
    await applyFavoriteStates();
  }, [applyFavoriteStates]);

  const handleClose = useCallback(() => {
    discardFavoriteStateChanges();
    setSearchQuery("");
    setOpen(false);
  }, [discardFavoriteStateChanges]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true);
          void reloadFavoriteStates();
          return;
        }
        handleClose();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "hidden md:flex items-center gap-1.5 transition-colors duration-200 hover:text-[var(--brand-primary-deep)]",
            desktopTriggerClassName,
          )}
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </button>
      </DialogTrigger>

      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Open settings"
          className={cn(
            "inline-flex md:hidden items-center justify-center rounded-lg border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.9)] p-2 text-[var(--brand-body)] shadow-sm transition-colors hover:bg-[rgba(0,94,184,0.08)] hover:text-[var(--brand-ink)]",
            mobileTriggerClassName,
          )}
        >
          <Settings className="h-4 w-4" />
        </button>
      </DialogTrigger>

      <DialogContent className="z-[90] mx-auto w-[92vw] max-w-[720px] rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.96)] p-0 backdrop-blur-xl shadow-[0_20px_42px_-28px_rgba(0,53,84,0.8)]">
        <div className="p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-[var(--brand-ink)]">
              Settings
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--brand-ink)]">
                  Favorite States
                </h3>
                <p className="mt-1 text-xs font-medium text-[var(--brand-muted)]">
                  Used to quickly scope work to your preferred placement states.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-lg border border-[var(--brand-border-soft)] bg-white/70 px-2 py-1 text-[11px] font-semibold text-[var(--brand-muted)]">
                  {favoriteStates.length} selected
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFavoriteStates}
                  disabled={isLoadingFavoriteStates || isApplyingFavoriteStates}
                  className="h-8 border-[var(--brand-border)] bg-transparent px-3 text-xs font-semibold text-[var(--brand-body)] hover:border-[var(--brand-primary-deep)] hover:bg-[rgba(0,53,84,0.06)]"
                >
                  Clear
                </Button>
              </div>
            </div>

            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search states"
              className="mt-3 h-10 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm text-[var(--brand-body)]"
            />

            <div className="mt-3 max-h-[46vh] overflow-y-auto rounded-xl border border-[var(--brand-border-soft)] bg-white/70 p-2">
              <div className="space-y-1">
                {filteredOptions.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[rgba(0,94,184,0.06)]"
                  >
                    <FilterCheckbox
                      id={option.id}
                      checked={favoriteStates.includes(option.value)}
                      disabled={isLoadingFavoriteStates || isApplyingFavoriteStates}
                      onCheckedChange={() => toggleFavoriteState(option.value)}
                    />
                    <label
                      htmlFor={option.id}
                      className="flex-1 cursor-pointer text-sm font-medium text-[var(--brand-body)]"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
                {filteredOptions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--brand-muted)]">
                    No states found.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--brand-border-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            onClick={handleApply}
            disabled={
              isLoadingFavoriteStates ||
              isApplyingFavoriteStates ||
              !hasPendingFavoriteStateChanges
            }
            className="h-10 bg-[var(--brand-primary)] font-semibold text-white hover:bg-[var(--brand-primary-deep)]"
          >
            {isApplyingFavoriteStates ? "Applying..." : "Apply"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="h-10 border-[var(--brand-border)] bg-transparent font-semibold text-[var(--brand-body)] hover:border-[var(--brand-primary-deep)] hover:bg-[rgba(0,53,84,0.06)]"
          >
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
