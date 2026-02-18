"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  EllipsisVertical,
  KeyRound,
  Plus,
  Search,
  Save,
} from "lucide-react";
import Header from "@/components/layout/Header";
import type { HeaderView } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { states } from "@/components/search/states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { useAuthRedirect } from "@/features/student-search/hooks/use-auth-redirect";
import { getCachedValue } from "@/lib/client-cache";
import { ENABLE_ADMIN_PANEL } from "@/lib/feature-flags";

const API_URL = "/api";
const CACHE_TTL_SHORT_MS = 30_000;
const CACHE_TTL_MEDIUM_MS = 5 * 60_000;

const EXCLUDED_STATE_VALUES = new Set(["all", "no_pref", "state_only", "my_states"]);
const ASSIGNABLE_STATE_OPTIONS = states.filter(
  (stateOption) => !EXCLUDED_STATE_VALUES.has(stateOption.value)
);

type RpmPageProps = {
  activeView?: HeaderView;
  onViewChange?: (view: HeaderView) => void;
  embedded?: boolean;
};

type LcAccountStatus = "account_created" | "signup_code_unused";

type LcUserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
  states: string[];
  note: string;
  accountStatus: LcAccountStatus;
  signupCode: string | null;
  signupCodeCreatedAt: string | null;
  temporaryPassword: string | null;
};

type SignupCodeRecord = {
  id: string;
  fullName: string;
  email: string;
  code: string;
  createdAt: string;
};

type RpmSignupApiItem = {
  id: string | number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  states?: unknown;
  notes_text?: string | null;
  account_type?: string | null;
  code_used?: boolean;
  submitter_id?: string | null;
  created_at?: string | null;
  used_at?: string | null;
  auth_code?: string | null;
  is_registered?: boolean;
  manager_id?: string | number | null;
  signup_code?: string | null;
};

type RpmSignupRegisterResponse = RpmSignupApiItem;

function randomCodeChunk(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let next = "";
  for (let i = 0; i < length; i += 1) {
    next += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return next;
}

function buildTemporaryPassword(): string {
  return `Temp-${randomCodeChunk(4)}${Math.floor(100 + Math.random() * 900)}`;
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed;
}

function formatCreatedAt(createdAtIso: unknown): string {
  const normalizedTimestamp = normalizeTimestamp(createdAtIso);
  if (!normalizedTimestamp) {
    return "Unknown time";
  }

  const timestamp = new Date(normalizedTimestamp);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown time";
  }

  return timestamp.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusLabel(status: LcAccountStatus): string {
  return status === "account_created" ? "Account created" : "Signup code not used";
}

function getStatusClassName(status: LcAccountStatus): string {
  if (status === "account_created") {
    return "border-[rgba(0,144,63,0.42)] bg-[rgba(0,144,63,0.12)] text-[var(--brand-success-deep)]";
  }

  return "border-[rgba(255,194,62,0.52)] bg-[rgba(255,194,62,0.24)] text-[var(--brand-primary-deep)]";
}

function hasProvidedEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function toSortableTimestamp(createdAtIso: unknown): number {
  const normalizedTimestamp = normalizeTimestamp(createdAtIso);
  if (!normalizedTimestamp) {
    return 0;
  }

  const timestamp = new Date(normalizedTimestamp).getTime();
  if (Number.isNaN(timestamp)) {
    return 0;
  }
  return timestamp;
}

function getSignupCode(item: RpmSignupApiItem): string | null {
  if (typeof item.signup_code === "string" && item.signup_code.trim()) {
    return item.signup_code.trim();
  }

  if (typeof item.auth_code === "string" && item.auth_code.trim()) {
    return item.auth_code.trim();
  }

  return null;
}

function getAccountStatus(item: RpmSignupApiItem): LcAccountStatus {
  if (typeof item.is_registered === "boolean") {
    return item.is_registered ? "account_created" : "signup_code_unused";
  }

  if (typeof item.code_used === "boolean") {
    return item.code_used ? "account_created" : "signup_code_unused";
  }

  return getSignupCode(item) ? "signup_code_unused" : "account_created";
}

function mapSignupRequestToUserRecord(item: RpmSignupApiItem): LcUserRecord {
  const firstName = typeof item.first_name === "string" ? item.first_name.trim() : "";
  const lastName = typeof item.last_name === "string" ? item.last_name.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim() || "Unknown user";
  const email = typeof item.email === "string" ? item.email : "";
  const accountStatus = getAccountStatus(item);
  const signupCode = getSignupCode(item);
  const fallbackId = `${fullName}:${email}:${signupCode ?? ""}`;
  const id =
    typeof item.id === "string" || typeof item.id === "number"
      ? String(item.id)
      : fallbackId;
  const statesList = Array.isArray(item.states)
    ? item.states.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    id,
    firstName,
    lastName,
    email,
    fullName,
    states: statesList,
    note: typeof item.notes_text === "string" ? item.notes_text : "",
    accountStatus,
    signupCode: accountStatus === "signup_code_unused" ? signupCode : null,
    signupCodeCreatedAt:
      accountStatus === "signup_code_unused" && typeof item.created_at === "string"
        ? item.created_at
        : null,
    temporaryPassword: null,
  };
}

function mapSignupRequestToCodeRecord(item: RpmSignupApiItem): SignupCodeRecord | null {
  const accountStatus = getAccountStatus(item);
  const code = getSignupCode(item);
  if (accountStatus === "account_created" || !code) {
    return null;
  }

  const firstName = typeof item.first_name === "string" ? item.first_name.trim() : "";
  const lastName = typeof item.last_name === "string" ? item.last_name.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim() || "Unknown user";
  const email = typeof item.email === "string" ? item.email : "";
  const fallbackId = `${fullName}:${email}:${code}`;
  const id =
    typeof item.id === "string" || typeof item.id === "number"
      ? String(item.id)
      : fallbackId;

  return {
    id,
    fullName,
    email,
    code,
    createdAt: typeof item.created_at === "string" ? item.created_at : "",
  };
}

export default function RpmPage({
  activeView,
  onViewChange,
  embedded = false,
}: RpmPageProps) {
  const { isAuthenticated, logout, isLoading: authLoading } = useAuth();
  useAuthRedirect({ authLoading, isAuthenticated });

  const [firstName, setFirstName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [hasLoadedAuthUser, setHasLoadedAuthUser] = useState(false);
  const [updateTime, setUpdateTime] = useState("");

  const [lcUsers, setLcUsers] = useState<LcUserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [draftStates, setDraftStates] = useState<string[]>([]);
  const [draftNote, setDraftNote] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [isSavingUserSettings, setIsSavingUserSettings] = useState(false);
  const [isResendingInvitation, setIsResendingInvitation] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lcSearchQuery, setLcSearchQuery] = useState("");

  const [generatedCodes, setGeneratedCodes] = useState<SignupCodeRecord[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardFirstName, setWizardFirstName] = useState("");
  const [wizardLastName, setWizardLastName] = useState("");
  const [wizardEmail, setWizardEmail] = useState("");
  const [wizardStates, setWizardStates] = useState<string[]>([]);
  const [wizardStateQuery, setWizardStateQuery] = useState("");
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [isCreatingSignupCode, setIsCreatingSignupCode] = useState(false);
  const [draftStateQuery, setDraftStateQuery] = useState("");

  const normalizedAccountType = accountType.trim().toLowerCase();
  const isLcUser = normalizedAccountType.includes("lc");
  const isAdminUser = normalizedAccountType.includes("admin");
  const canLoadSignupRequests =
    normalizedAccountType.includes("rpm") || normalizedAccountType.includes("admin");
  const showRpmNav = !normalizedAccountType.includes("lc");

  const selectedUser = useMemo(
    () => lcUsers.find((user) => user.id === selectedUserId) ?? null,
    [lcUsers, selectedUserId]
  );
  const filteredWizardStateOptions = useMemo(() => {
    const query = wizardStateQuery.trim().toLowerCase();
    if (!query) return ASSIGNABLE_STATE_OPTIONS;

    return ASSIGNABLE_STATE_OPTIONS.filter((stateOption) =>
      stateOption.label.toLowerCase().includes(query)
    );
  }, [wizardStateQuery]);
  const filteredDraftStateOptions = useMemo(() => {
    const query = draftStateQuery.trim().toLowerCase();
    if (!query) return ASSIGNABLE_STATE_OPTIONS;

    return ASSIGNABLE_STATE_OPTIONS.filter((stateOption) =>
      stateOption.label.toLowerCase().includes(query)
    );
  }, [draftStateQuery]);
  const filteredLcUsers = useMemo(() => {
    const query = lcSearchQuery.trim().toLowerCase();
    if (!query) return lcUsers;

    return lcUsers.filter(
      (user) =>
        user.fullName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    );
  }, [lcSearchQuery, lcUsers]);

  const latestCode = generatedCodes[0] ?? null;
  const hasWizardEmail = wizardEmail.trim().length > 0;
  const selectedUserHasEmail = hasProvidedEmail(selectedUser?.email ?? "");
  const canResendInvitation =
    selectedUser?.accountStatus === "signup_code_unused" && selectedUserHasEmail;

  useEffect(() => {
    if (!isAuthenticated) return;

    getCachedValue<{ first_name?: string; account_type?: string }>(
      "auth:me",
      async () => {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch auth user: ${response.status}`);
        }

        return (await response.json()) as {
          first_name?: string;
          account_type?: string;
        };
      },
      CACHE_TTL_MEDIUM_MS
    )
      .then((data) => {
        setFirstName(data?.first_name ?? "");
        setAccountType(data?.account_type ?? "");
      })
      .catch(() => {
        setFirstName("");
        setAccountType("");
      })
      .finally(() => {
        setHasLoadedAuthUser(true);
      });

    getCachedValue<unknown[]>(
      "misc:last_update_time",
      async () => {
        const response = await fetch(`${API_URL}/misc/last_update_time`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch last update time: ${response.status}`);
        }

        return (await response.json()) as unknown[];
      },
      CACHE_TTL_SHORT_MS
    )
      .then((data) => {
        if (Array.isArray(data)) {
          setUpdateTime(String(data[0] ?? ""));
        }
      })
      .catch(() => {
        setUpdateTime("");
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedAuthUser || !canLoadSignupRequests) {
      return;
    }

    let isActive = true;

    const loadSignupRequests = async () => {
      setLoadError(null);

      try {
        const response = await fetch(`${API_URL}/rpm/register`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          let message = `Failed to load signup requests (${response.status}).`;
          try {
            const errorBody = (await response.json()) as { detail?: unknown };
            if (typeof errorBody.detail === "string" && errorBody.detail.trim()) {
              message = errorBody.detail;
            }
          } catch {
            // Keep default message when backend body is not JSON.
          }

          throw new Error(message);
        }

        const payload = (await response.json()) as unknown;
        const rows = Array.isArray(payload) ? (payload as RpmSignupApiItem[]) : [];
        const sortedRows = [...rows].sort(
          (left, right) =>
            toSortableTimestamp(right.created_at) - toSortableTimestamp(left.created_at)
        );
        const lcRows = sortedRows.filter((row) => {
          if (typeof row.account_type !== "string") {
            return true;
          }

          return row.account_type.trim().toLowerCase() === "lc";
        });

        const users = lcRows.map((row) => mapSignupRequestToUserRecord(row));
        const signupCodes = lcRows
          .map((row) => mapSignupRequestToCodeRecord(row))
          .filter((row): row is SignupCodeRecord => row !== null)
          .slice(0, 8);

        if (!isActive) return;
        setLcUsers(users);
        setGeneratedCodes(signupCodes);
      } catch (error) {
        if (!isActive) return;

        setLoadError(error instanceof Error ? error.message : "Failed to load signup requests.");
        setLcUsers([]);
        setGeneratedCodes([]);
      }
    };

    void loadSignupRequests();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, hasLoadedAuthUser, canLoadSignupRequests]);

  useEffect(() => {
    if (!selectedUser) {
      setDraftStates([]);
      setDraftNote("");
      setDraftStateQuery("");
      setManageError(null);
      setIsSavingUserSettings(false);
      setIsResendingInvitation(false);
      return;
    }

    setDraftStates(selectedUser.states);
    setDraftNote(selectedUser.note);
    setDraftStateQuery("");
    setManageError(null);
    setIsResendingInvitation(false);
  }, [selectedUser]);

  const openManageDialog = (user: LcUserRecord) => {
    setSelectedUserId(user.id);
    setSaveMessage(null);
    setManageError(null);
  };

  const toggleDraftState = (stateValue: string) => {
    setDraftStates((previous) => {
      if (previous.includes(stateValue)) {
        return previous.filter((item) => item !== stateValue);
      }

      return [...previous, stateValue].sort((left, right) => left.localeCompare(right));
    });
  };

  const toggleWizardState = (stateValue: string) => {
    setWizardStates((previous) => {
      if (previous.includes(stateValue)) {
        return previous.filter((item) => item !== stateValue);
      }

      return [...previous, stateValue].sort((left, right) => left.localeCompare(right));
    });
  };

  const resetWizard = () => {
    setWizardFirstName("");
    setWizardLastName("");
    setWizardEmail("");
    setWizardStates([]);
    setWizardStateQuery("");
    setWizardError(null);
  };

  const openNewLcWizard = () => {
    setSaveMessage(null);
    setWizardError(null);
    setIsWizardOpen(true);
  };

  const saveUserSettings = async () => {
    if (!selectedUser) return;
    const trimmedNote = draftNote.trim();
    setManageError(null);
    setIsSavingUserSettings(true);

    try {
      const response = await fetch(
        `${API_URL}/rpm/register/${encodeURIComponent(selectedUser.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            states: draftStates,
            notes_text: trimmedNote,
          }),
        }
      );

      if (!response.ok) {
        let message = `Failed to update account (${response.status}).`;
        try {
          const errorBody = (await response.json()) as { detail?: unknown };
          if (typeof errorBody.detail === "string" && errorBody.detail.trim()) {
            message = errorBody.detail;
          }
        } catch {
          // Keep default message when backend body is not JSON.
        }

        setManageError(message);
        return;
      }

      setLcUsers((previous) =>
        previous.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                states: draftStates,
                note: trimmedNote,
              }
            : user
        )
      );

      setSaveMessage(`Saved updates for ${selectedUser.fullName}.`);
      setSelectedUserId(null);
    } catch {
      setManageError("Unable to reach the server. Please try again.");
    } finally {
      setIsSavingUserSettings(false);
    }
  };

  const createNewLcSignupCode = async () => {
    const trimmedFirstName = wizardFirstName.trim();
    const trimmedLastName = wizardLastName.trim();
    const trimmedEmail = wizardEmail.trim().toLowerCase();

    if (!trimmedFirstName || !trimmedLastName) {
      setWizardError("First and last name are required.");
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setWizardError("Enter a valid email address.");
      return;
    }

    if (wizardStates.length === 0) {
      setWizardError("Select at least one state.");
      return;
    }

    setWizardError(null);
    setIsCreatingSignupCode(true);

    try {
      const payload = {
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        email: trimmedEmail || "n/a",
        states: wizardStates,
        account_type: "lc" as const,
      };

      const response = await fetch(`${API_URL}/rpm/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = `Failed to create signup code (${response.status}).`;
        try {
          const errorBody = (await response.json()) as { detail?: unknown };
          if (typeof errorBody.detail === "string" && errorBody.detail.trim()) {
            message = errorBody.detail;
          }
        } catch {
          // Keep default message when backend body is not JSON.
        }
        setWizardError(message);
        return;
      }

      const created = (await response.json()) as RpmSignupRegisterResponse;
      const createdItem: RpmSignupApiItem = {
        ...created,
        first_name:
          typeof created.first_name === "string" ? created.first_name : payload.first_name,
        last_name: typeof created.last_name === "string" ? created.last_name : payload.last_name,
        email: typeof created.email === "string" ? created.email : payload.email,
        states: Array.isArray(created.states) ? created.states : wizardStates,
        notes_text: typeof created.notes_text === "string" ? created.notes_text : "",
        account_type:
          typeof created.account_type === "string" ? created.account_type : payload.account_type,
      };
      const newUser = mapSignupRequestToUserRecord(createdItem);
      const newCode = mapSignupRequestToCodeRecord(createdItem);
      const fullName = newUser.fullName;

      setLcUsers((previous) => [newUser, ...previous]);
      setGeneratedCodes((previous) =>
        newCode ? [newCode, ...previous].slice(0, 8) : previous
      );
      setLoadError(null);
      setSaveMessage(`Created signup code for ${fullName}.`);
      setIsWizardOpen(false);
      resetWizard();
    } catch {
      setWizardError("Unable to reach the server. Please try again.");
    } finally {
      setIsCreatingSignupCode(false);
    }
  };

  const resetPasswordToTemporary = () => {
    if (!selectedUser) return;

    const tempPassword = buildTemporaryPassword();

    setLcUsers((previous) =>
      previous.map((user) =>
        user.id === selectedUser.id ? { ...user, temporaryPassword: tempPassword } : user
      )
    );
    setSaveMessage(`Temporary password generated for ${selectedUser.fullName}.`);
  };

  const resendInvitationEmail = async () => {
    if (!selectedUser) return;

    if (!hasProvidedEmail(selectedUser.email)) {
      setManageError("A valid email is required to resend an invitation.");
      return;
    }

    setManageError(null);
    setIsResendingInvitation(true);

    try {
      const response = await fetch(
        `${API_URL}/rpm/register/${encodeURIComponent(selectedUser.id)}/resend-invitation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (!response.ok) {
        let message = `Failed to resend invitation (${response.status}).`;
        try {
          const errorBody = (await response.json()) as { detail?: unknown };
          if (typeof errorBody.detail === "string" && errorBody.detail.trim()) {
            message = errorBody.detail;
          }
        } catch {
          // Keep default message when backend body is not JSON.
        }

        setManageError(message);
        return;
      }

      setSaveMessage(`Resent signup email to ${selectedUser.fullName}.`);
    } catch {
      setManageError("Unable to reach the server. Please try again.");
    } finally {
      setIsResendingInvitation(false);
    }
  };

  if (authLoading || !isAuthenticated || !hasLoadedAuthUser) {
    return (
      <div className="brand-page-gradient min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--brand-primary)]" />
          <p className="mt-4 font-medium text-[var(--brand-body)]">Loading RPM view...</p>
        </div>
      </div>
    );
  }

  if (isLcUser) {
    return (
      <div
        className={`${embedded ? "brand-page-gradient" : "brand-page-gradient min-h-screen"} text-[var(--brand-ink)]`}
      >
        <div className="relative z-10">
          {!embedded && (
            <Header
              firstName={firstName}
              onLogout={logout}
              updateTime={updateTime}
              activeView={activeView}
              onViewChange={onViewChange}
              showRpm={showRpmNav}
              showAdmin={ENABLE_ADMIN_PANEL && isAdminUser}
            />
          )}

          <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
            <section className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.92)] p-6 text-center shadow-[0_12px_28px_rgba(0,53,84,0.12)]">
              <h1 className="text-2xl font-black tracking-tight text-[var(--brand-ink)]">
                RPM View Unavailable
              </h1>
              <p className="mt-2 text-sm text-[var(--brand-body)]">
                This view is restricted to RPM accounts.
              </p>
              <div className="mt-5">
                {embedded && onViewChange ? (
                  <button
                    type="button"
                    onClick={() => onViewChange("search")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Search
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Search
                  </Link>
                )}
              </div>
            </section>
          </main>

          {!embedded && <Footer />}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${embedded ? "brand-page-gradient" : "brand-page-gradient min-h-screen"} relative overflow-hidden text-[var(--brand-ink)]`}
    >
      <div className="relative z-10">
        {!embedded && (
          <Header
            firstName={firstName}
            onLogout={logout}
            updateTime={updateTime}
            activeView={activeView}
            onViewChange={onViewChange}
            showRpm={showRpmNav}
            showAdmin={ENABLE_ADMIN_PANEL && isAdminUser}
          />
        )}

        <main className="mx-auto max-w-[1020px] px-4 py-6 sm:px-6">
          <section className="rpm-command-panel rounded-3xl p-6">
            
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--brand-ink)]">
              Local Coordinator Dashboard
            </h1>
            <p className="mt-1.5 text-sm text-[var(--brand-body)]">
              Manage each LC user&apos;s states and maintain personal notes per user. If you provide an email address, the code will automatically be sent to their inbox. If no email is provided, then you will need to manually share the code with them.
            </p>

            {saveMessage ? (
              <div className="mt-4 rounded-xl border border-[rgba(0,144,63,0.42)] bg-[rgba(0,144,63,0.1)] px-4 py-2 text-sm font-semibold text-[var(--brand-success-deep)]">
                {saveMessage}
              </div>
            ) : null}
            {loadError ? (
              <div className="mt-4 rounded-xl border border-[rgba(201,18,41,0.4)] bg-[rgba(201,18,41,0.1)] px-4 py-2 text-sm font-semibold text-[var(--brand-danger)]">
                {loadError}
              </div>
            ) : null}

            <div className="mt-4">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                  Search LC Users
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-muted)]" />
                  <input
                    type="text"
                    value={lcSearchQuery}
                    onChange={(event) => setLcSearchQuery(event.target.value)}
                    placeholder="Search by name or email address"
                    className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] pl-9 pr-3 text-sm text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
                  />
                </div>
              </label>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.93)] p-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                  LC Users
                </h2>
                <div className="mt-3 divide-y divide-[var(--brand-border-soft)] rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(255,255,255,0.8)]">
                  {filteredLcUsers.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-[var(--brand-muted)]">
                      No LC users match your search.
                    </p>
                  ) : (
                    filteredLcUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--brand-ink)]">
                            {user.fullName}
                          </p>
                          <span
                            className={`inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusClassName(
                              user.accountStatus
                            )}`}
                          >
                            {getStatusLabel(user.accountStatus)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openManageDialog(user)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
                          aria-label={`Manage ${user.fullName}`}
                        >
                          <EllipsisVertical className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.93)] p-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                  Signup Codes
                </h2>
                <button
                  type="button"
                  onClick={openNewLcWizard}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[rgba(0,94,184,0.35)] bg-[rgba(0,94,184,0.12)] px-4 text-sm font-semibold text-[var(--brand-primary-deep)] transition-colors hover:bg-[rgba(0,94,184,0.2)]"
                >
                  <Plus className="h-4 w-4" />
                  Generate New Signup Code
                </button>

                <div className="mt-3 rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.8)] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
                    Latest code
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-[var(--brand-ink)]">
                    {latestCode?.code ?? "No code generated yet"}
                  </p>
                </div>

                <div className="mt-3 space-y-2">
                  {generatedCodes.length === 0 ? (
                    <p className="text-xs text-[var(--brand-muted)]">
                      Generate a code to start the signup queue.
                    </p>
                  ) : (
                    generatedCodes.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-[var(--brand-border-soft)] bg-[rgba(255,255,255,0.84)] px-3 py-2"
                      >
                        <p className="text-[11px] font-semibold text-[var(--brand-body)]">
                          {entry.fullName}
                        </p>
                        <p className="text-[11px] text-[var(--brand-muted)]">
                          {entry.email || "No email provided"}
                        </p>
                        <p className="font-mono text-xs font-semibold text-[var(--brand-primary-deep)]">
                          {entry.code}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--brand-muted)]">
                          {formatCreatedAt(entry.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </section>
        </main>

        {!embedded && <Footer />}
      </div>

      <Dialog
        open={isWizardOpen}
        onOpenChange={(open) => {
          setIsWizardOpen(open);
          if (!open) {
            resetWizard();
          }
        }}
      >
        <DialogContent className="max-w-lg border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.98)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-[var(--brand-ink)]">
              New LC Wizard
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--brand-body)]">
              Enter the local coordinator&apos;s name and optional email, then assign states.
            </DialogDescription>
          </DialogHeader>

          {wizardError ? (
            <div className="rounded-xl border border-[rgba(201,18,41,0.4)] bg-[rgba(201,18,41,0.1)] px-3 py-2 text-sm font-semibold text-[var(--brand-danger)]">
              {wizardError}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                First name
              </span>
              <input
                type="text"
                value={wizardFirstName}
                onChange={(event) => setWizardFirstName(event.target.value)}
                placeholder="First name"
                className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 text-sm text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                Last name
              </span>
              <input
                type="text"
                value={wizardLastName}
                onChange={(event) => setWizardLastName(event.target.value)}
                placeholder="Last name"
                className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 text-sm text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                Email address (optional)
              </span>
              <input
                type="email"
                value={wizardEmail}
                onChange={(event) => setWizardEmail(event.target.value)}
                placeholder="name@example.org"
                className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 text-sm text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
              States
            </p>
            <input
              type="text"
              value={wizardStateQuery}
              onChange={(event) => setWizardStateQuery(event.target.value)}
              placeholder="Search states"
              className="mt-2 h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 text-sm text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
            />
            <div className="mt-2 max-h-[150px] space-y-2 overflow-y-auto rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.58)] p-3">
              {filteredWizardStateOptions.map((stateOption) => {
                const isChecked = wizardStates.includes(stateOption.value);
                return (
                  <label
                    key={`wizard-${stateOption.value}`}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--brand-border-soft)] bg-[rgba(255,255,255,0.88)] px-3 py-2 text-sm font-medium text-[var(--brand-body)]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleWizardState(stateOption.value)}
                      className="h-4 w-4 accent-[var(--brand-primary)]"
                    />
                    {stateOption.label}
                  </label>
                );
              })}
              {filteredWizardStateOptions.length === 0 ? (
                <p className="py-2 text-sm text-[var(--brand-muted)]">No states found.</p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setIsWizardOpen(false);
                resetWizard();
              }}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createNewLcSignupCode}
              disabled={wizardStates.length === 0 || isCreatingSignupCode}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[rgba(0,94,184,0.38)] bg-[rgba(0,94,184,0.12)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary-deep)] transition-colors hover:bg-[rgba(0,94,184,0.2)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[rgba(0,94,184,0.12)]"
            >
              {!hasWizardEmail ? <Plus className="h-3.5 w-3.5" /> : null}
              {isCreatingSignupCode
                ? hasWizardEmail
                  ? "Sending..."
                  : "Creating..."
                : hasWizardEmail
                  ? "Send signup code"
                  : "Create Signup Code"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedUser !== null}
        onOpenChange={(open) => {
          if (open) return;
          setSelectedUserId(null);
        }}
      >
        <DialogContent className="max-w-lg border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.98)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-[var(--brand-ink)]">
              {selectedUser ? selectedUser.fullName : "Manage LC User"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--brand-body)]">
              Update state assignments and keep an optional internal note.
            </DialogDescription>
          </DialogHeader>

          {manageError ? (
            <div className="rounded-xl border border-[rgba(201,18,41,0.4)] bg-[rgba(201,18,41,0.1)] px-3 py-2 text-sm font-semibold text-[var(--brand-danger)]">
              {manageError}
            </div>
          ) : null}

          {selectedUser ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.9)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand-body)]">
                {selectedUser.email || "No email provided"}
              </span>
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusClassName(
                  selectedUser.accountStatus
                )}`}
              >
                {getStatusLabel(selectedUser.accountStatus)}
              </span>
              {selectedUser.accountStatus === "signup_code_unused" && selectedUser.signupCode ? (
                <span className="rounded-full border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.9)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--brand-primary-deep)]">
                  {selectedUser.signupCode}
                </span>
              ) : null}
            </div>
          ) : null}

          {selectedUser?.temporaryPassword ? (
            <div className="rounded-xl border border-[rgba(255,194,62,0.55)] bg-[rgba(255,194,62,0.2)] px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)]">
                Temporary Password
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-[var(--brand-primary-deep)]">
                {selectedUser.temporaryPassword}
              </p>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
              States
            </p>
            <input
              type="text"
              value={draftStateQuery}
              onChange={(event) => setDraftStateQuery(event.target.value)}
              placeholder="Search states"
              className="mt-2 h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 text-sm text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
            />
            <div className="mt-2 max-h-[150px] space-y-2 overflow-y-auto rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.58)] p-3">
              {filteredDraftStateOptions.map((stateOption) => {
                const isChecked = draftStates.includes(stateOption.value);
                return (
                  <label
                    key={stateOption.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--brand-border-soft)] bg-[rgba(255,255,255,0.88)] px-3 py-2 text-sm font-medium text-[var(--brand-body)]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDraftState(stateOption.value)}
                      className="h-4 w-4 accent-[var(--brand-primary)]"
                    />
                    {stateOption.label}
                  </label>
                );
              })}
              {filteredDraftStateOptions.length === 0 ? (
                <p className="py-2 text-sm text-[var(--brand-muted)]">No states found.</p>
              ) : null}
            </div>
          </div>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
              Notes to self
            </span>
            <textarea
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              rows={4}
              placeholder="Add context for this LC user (optional)"
              className="w-full resize-none rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 py-2 text-sm text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
            />
          </label>

          <DialogFooter>
            {canResendInvitation ? (
              <button
                type="button"
                onClick={resendInvitationEmail}
                disabled={isResendingInvitation}
                className="inline-flex h-9 items-center justify-center rounded-full border border-[rgba(0,94,184,0.35)] bg-[rgba(0,94,184,0.12)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary-deep)] transition-colors hover:bg-[rgba(0,94,184,0.2)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[rgba(0,94,184,0.12)] sm:mr-auto"
              >
                {isResendingInvitation ? "Resending..." : "Resend email"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setSelectedUserId(null)}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveUserSettings}
              disabled={!selectedUser || isSavingUserSettings}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[rgba(0,94,184,0.38)] bg-[rgba(0,94,184,0.12)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary-deep)] transition-colors hover:bg-[rgba(0,94,184,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {isSavingUserSettings ? "Saving..." : "Save"}
            </button>
            {selectedUser?.accountStatus === "account_created" ? (
              <button
                type="button"
                onClick={resetPasswordToTemporary}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[rgba(255,194,62,0.55)] bg-[rgba(255,194,62,0.2)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary-deep)] transition-colors hover:bg-[rgba(255,194,62,0.32)]"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Reset Password
              </button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
