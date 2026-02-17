"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, Eye, EyeOff, LockKeyhole, Settings, X } from "lucide-react";

import { states } from "@/components/search/states";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavoriteStates } from "@/lib/favorite-states";

const API_URL = "/api";
const EXCLUDED_STATE_VALUES = new Set(["all", "no_pref", "state_only", "my_states"]);
const MIN_PASSWORD_LENGTH = 6;

type HeaderSettingsDialogProps = {
  desktopTriggerClassName?: string;
  mobileTriggerClassName?: string;
};
type SettingsSection = "states" | "account" | null;

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
    accountType,
  } = useFavoriteStates();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [showNextPassword, setShowNextPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState("");
  const [passwordResetSuccess, setPasswordResetSuccess] = useState("");
  const [expandedSection, setExpandedSection] = useState<SettingsSection>(null);

  const normalizedAccountType = accountType.trim().toLowerCase();
  const isLcUser = normalizedAccountType === "lc";

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

  const resetPasswordFields = useCallback(() => {
    setNextPassword("");
    setVerifyPassword("");
    setShowNextPassword(false);
    setShowVerifyPassword(false);
  }, []);

  const handleResetPassword = useCallback(async () => {
    setPasswordResetError("");
    setPasswordResetSuccess("");

    if (nextPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordResetError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (nextPassword !== verifyPassword) {
      setPasswordResetError("New password and verify password do not match.");
      return;
    }

    setIsResettingPassword(true);
    try {
      const response = await fetch(`${API_URL}/auth/change_password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          new_password: nextPassword,
          password: nextPassword,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Unable to reset password right now.";
        try {
          const errorPayload = (await response.json()) as { detail?: unknown };
          if (typeof errorPayload.detail === "string" && errorPayload.detail.trim()) {
            errorMessage = errorPayload.detail;
          }
        } catch {
          // Keep default message when response body is not JSON.
        }
        throw new Error(errorMessage);
      }

      resetPasswordFields();
      setPasswordResetSuccess("Password updated successfully.");
    } catch (error) {
      const fallbackError = "Unable to reset password right now.";
      const message =
        error instanceof Error && error.message.trim() ? error.message : fallbackError;
      setPasswordResetError(message);
    } finally {
      setIsResettingPassword(false);
    }
  }, [nextPassword, resetPasswordFields, verifyPassword]);

  const handleClose = useCallback(() => {
    discardFavoriteStateChanges();
    setSearchQuery("");
    setPasswordResetError("");
    setPasswordResetSuccess("");
    resetPasswordFields();
    setExpandedSection(null);
    setOpen(false);
  }, [discardFavoriteStateChanges, resetPasswordFields]);

  const toggleSection = useCallback((section: Exclude<SettingsSection, null>) => {
    setExpandedSection((current) => (current === section ? null : section));
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setPasswordResetError("");
          setPasswordResetSuccess("");
          setExpandedSection(null);
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

      <DialogContent className="z-[90] mx-auto w-[92vw] max-w-[720px] max-h-[84vh] rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.96)] p-0 backdrop-blur-xl shadow-[0_20px_42px_-28px_rgba(0,53,84,0.8)]">
        <div className="p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-[var(--brand-ink)]">
              Settings
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 max-h-[62vh] space-y-4 overflow-y-auto pr-1">
            <section className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(255,255,255,0.78)] p-4">
              <button
                type="button"
                onClick={() => toggleSection("states")}
                aria-expanded={expandedSection === "states"}
                aria-controls="settings-favorite-states"
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div>
                  <h3 className="text-sm font-bold text-[var(--brand-ink)]">
                    Favorite States
                  </h3>
                  <p className="mt-1 text-xs font-medium text-[var(--brand-muted)]">
                    {isLcUser
                      ? "LC accounts cannot update placement states in Settings."
                      : "Set your preferred placement states."}
                  </p>
                </div>
                <div className="flex items-center gap-2">

                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-[var(--brand-muted)] transition-transform",
                      expandedSection === "states" ? "rotate-180" : "",
                    )}
                    aria-hidden
                  />
                </div>
              </button>

              {expandedSection === "states" ? (
                <div id="settings-favorite-states">
                  {!isLcUser ? (
                    <>
                    
                      

                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search states"
                        className="mt-2 h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 text-sm text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
                      />

                      <div className="mt-2 max-h-[150px] space-y-2 overflow-y-auto rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.58)] p-3">
                        <div className="space-y-2">
                          {filteredOptions.map((option) => (
                            <label
                              key={option.id}
                              htmlFor={option.id}
                              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--brand-border-soft)] bg-[rgba(255,255,255,0.88)] px-3 py-2 text-sm font-medium text-[var(--brand-body)]"
                            >
                              <input
                                type="checkbox"
                                id={option.id}
                                checked={favoriteStates.includes(option.value)}
                                disabled={isLoadingFavoriteStates || isApplyingFavoriteStates}
                                onChange={() => toggleFavoriteState(option.value)}
                                className="h-4 w-4 accent-[var(--brand-primary)]"
                              />
                              <span className="flex-1">
                                {option.label}
                              </span>
                            </label>
                          ))}
                          {filteredOptions.length === 0 ? (
                            <p className="py-2 text-center text-sm text-[var(--brand-muted)]">
                              No states found.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 rounded-xl border border-[rgba(255,194,62,0.55)] bg-[rgba(255,194,62,0.2)] px-3 py-2 text-sm font-medium text-[var(--brand-body)]">
                      State assignments are managed by RPM/Admin for LC accounts.
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(255,255,255,0.78)] p-4">
              <button
                type="button"
                onClick={() => toggleSection("account")}
                aria-expanded={expandedSection === "account"}
                aria-controls="settings-account"
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div>
                  <h3 className="inline-flex items-center gap-2 text-sm font-bold text-[var(--brand-ink)]">
                    <LockKeyhole className="h-4 w-4 text-[var(--brand-primary)]" />
                    Account Settings
                  </h3>
                  <p className="mt-1 text-xs font-medium text-[var(--brand-muted)]">
                    Reset your account password.
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-[var(--brand-muted)] transition-transform",
                    expandedSection === "account" ? "rotate-180" : "",
                  )}
                  aria-hidden
                />
              </button>

              {expandedSection === "account" ? (
                <div id="settings-account" className="mt-3 space-y-3">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                      New Password
                    </span>
                    <div className="relative">
                      <input
                        type={showNextPassword ? "text" : "password"}
                        value={nextPassword}
                        onChange={(event) => setNextPassword(event.target.value)}
                        autoComplete="new-password"
                        placeholder="New password"
                        className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 pr-10 text-sm text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
                      />
                      <button
                        type="button"
                        aria-label={showNextPassword ? "Hide new password" : "Show new password"}
                        aria-pressed={showNextPassword}
                        onClick={() => setShowNextPassword((current) => !current)}
                        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--brand-muted)] transition-colors hover:bg-[rgba(0,94,184,0.1)] hover:text-[var(--brand-primary-deep)]"
                      >
                        {showNextPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                      </button>
                    </div>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                      Verify New Password
                    </span>
                    <div className="relative">
                      <input
                        type={showVerifyPassword ? "text" : "password"}
                        value={verifyPassword}
                        onChange={(event) => setVerifyPassword(event.target.value)}
                        autoComplete="new-password"
                        placeholder="Verify new password"
                        className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 pr-10 text-sm text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
                      />
                      <button
                        type="button"
                        aria-label={showVerifyPassword ? "Hide verify password" : "Show verify password"}
                        aria-pressed={showVerifyPassword}
                        onClick={() => setShowVerifyPassword((current) => !current)}
                        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--brand-muted)] transition-colors hover:bg-[rgba(0,94,184,0.1)] hover:text-[var(--brand-primary-deep)] pb-2"
                      >
                        {showVerifyPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                      </button>
                    </div>
                  </label>

                  {passwordResetError ? (
                    <p className="rounded-lg border border-[rgba(201,18,41,0.42)] bg-[rgba(201,18,41,0.08)] px-3 py-2 text-xs font-semibold text-[var(--brand-danger)]">
                      {passwordResetError}
                    </p>
                  ) : null}
                  {passwordResetSuccess ? (
                    <p className="rounded-lg border border-[rgba(0,144,63,0.42)] bg-[rgba(0,144,63,0.1)] px-3 py-2 text-xs font-semibold text-[var(--brand-success-deep)]">
                      {passwordResetSuccess}
                    </p>
                  ) : null}

                  <Button
                    type="button"
                    onClick={() => void handleResetPassword()}
                    disabled={isResettingPassword}
                    className="mt-1 h-10 bg-[var(--brand-primary)] font-semibold text-white hover:bg-[var(--brand-primary-deep)] disabled:opacity-70"
                  >
                    {isResettingPassword ? "Resetting..." : "Reset Password"}
                  </Button>
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col gap-2 border-t border-[var(--brand-border-soft)] p-4 sm:flex-row sm:items-center",
            isLcUser ? "sm:justify-end" : "sm:justify-between",
          )}
        >
          {!isLcUser ? (
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
          ) : null}
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
