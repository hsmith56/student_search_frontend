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
  ShieldPlus,
  Trash2,
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

const API_URL = "/api";
const CACHE_TTL_SHORT_MS = 30_000;
const CACHE_TTL_MEDIUM_MS = 5 * 60_000;

const EXCLUDED_STATE_VALUES = new Set(["all", "no_pref", "state_only", "my_states"]);
const ASSIGNABLE_STATE_OPTIONS = states.filter(
  (stateOption) => !EXCLUDED_STATE_VALUES.has(stateOption.value)
);

const ACCOUNT_TYPE_OPTIONS = ["lc", "rpm", "admin"] as const;
type ManagedAccountType = (typeof ACCOUNT_TYPE_OPTIONS)[number];

type AdminPageProps = {
  activeView?: HeaderView;
  onViewChange?: (view: HeaderView) => void;
  embedded?: boolean;
};

type AccountStatus = "account_created" | "signup_code_unused";

type ManagedUserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
  states: string[];
  note: string;
  accountType: ManagedAccountType;
  accountStatus: AccountStatus;
  signupCode: string | null;
  signupCodeCreatedAt: string | null;
  temporaryPassword: string | null;
};

type SignupCodeRecord = {
  id: string;
  fullName: string;
  email: string;
  accountType: ManagedAccountType;
  code: string;
  createdAt: string;
};

type AdminUsersApiItem = {
  id: string | number;
  first_name: string;
  last_name: string;
  email: string | null;
  states: string[];
  account_type: string;
  code_used: boolean;
  submitter_id: string;
  created_at: string;
  used_at: string | null;
  auth_code: string;
  notes_text: string | null;
};

type AdminSignupRegisterResponse = {
  id: number | string;
  first_name: string;
  last_name: string;
  email: string | null;
  states: string[];
  account_type: string;
  code_used: boolean;
  submitter_id: string;
  created_at: string;
  used_at: string | null;
  auth_code: string;
  notes_text: string | null;
};

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

function formatCreatedAt(createdAtIso: string): string {
  const normalizedTimestamp = createdAtIso.includes(" ")
    ? createdAtIso.replace(" ", "T")
    : createdAtIso;
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

function getStatusLabel(status: AccountStatus): string {
  return status === "account_created" ? "Account created" : "Signup code not used";
}

function getStatusClassName(status: AccountStatus): string {
  if (status === "account_created") {
    return "border-[rgba(0,144,63,0.42)] bg-[rgba(0,144,63,0.12)] text-[var(--brand-success-deep)]";
  }

  return "border-[rgba(255,194,62,0.52)] bg-[rgba(255,194,62,0.24)] text-[var(--brand-primary-deep)]";
}

function getAccountTypeLabel(accountType: ManagedAccountType): string {
  if (accountType === "admin") return "Admin";
  if (accountType === "rpm") return "RPM";
  return "LC";
}

function getAccountTypeClassName(accountType: ManagedAccountType): string {
  if (accountType === "admin") {
    return "border-[rgba(201,18,41,0.38)] bg-[rgba(201,18,41,0.1)] text-[var(--brand-danger)]";
  }

  if (accountType === "rpm") {
    return "border-[rgba(0,94,184,0.35)] bg-[rgba(0,94,184,0.1)] text-[var(--brand-primary-deep)]";
  }

  return "border-[rgba(114,125,131,0.4)] bg-[rgba(114,125,131,0.15)] text-[var(--brand-body)]";
}

function normalizeManagedAccountType(
  accountType: unknown,
  fallback: ManagedAccountType
): ManagedAccountType {
  if (accountType === "lc" || accountType === "rpm" || accountType === "admin") {
    return accountType;
  }

  return fallback;
}

export default function AdminPage({
  activeView,
  onViewChange,
  embedded = false,
}: AdminPageProps) {
  const { isAuthenticated, logout, isLoading: authLoading } = useAuth();
  useAuthRedirect({ authLoading, isAuthenticated });

  const [firstName, setFirstName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [hasLoadedAuthUser, setHasLoadedAuthUser] = useState(false);
  const [updateTime, setUpdateTime] = useState("");

  const [managedUsers, setManagedUsers] = useState<ManagedUserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [draftStates, setDraftStates] = useState<string[]>([]);
  const [draftNote, setDraftNote] = useState("");
  const [draftAccountType, setDraftAccountType] = useState<ManagedAccountType>("rpm");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const [generatedCodes, setGeneratedCodes] = useState<SignupCodeRecord[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardFirstName, setWizardFirstName] = useState("");
  const [wizardLastName, setWizardLastName] = useState("");
  const [wizardEmail, setWizardEmail] = useState("");
  const [wizardAccountType, setWizardAccountType] = useState<ManagedAccountType>("rpm");
  const [wizardStates, setWizardStates] = useState<string[]>([]);
  const [wizardStateQuery, setWizardStateQuery] = useState("");
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [draftStateQuery, setDraftStateQuery] = useState("");
  const [pendingDeleteUser, setPendingDeleteUser] = useState<ManagedUserRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const normalizedAccountType = accountType.trim().toLowerCase();
  const isAdminUser = normalizedAccountType.includes("admin");
  const showRpmNav = !normalizedAccountType.includes("lc");

  const selectedUser = useMemo(
    () => managedUsers.find((user) => user.id === selectedUserId) ?? null,
    [managedUsers, selectedUserId]
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
  const filteredUsers = useMemo(() => {
    const query = userSearchQuery.trim().toLowerCase();
    if (!query) return managedUsers;

    return managedUsers.filter(
      (user) =>
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        getAccountTypeLabel(user.accountType).toLowerCase().includes(query)
    );
  }, [userSearchQuery, managedUsers]);

  const latestCode = generatedCodes[0] ?? null;

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
    if (!isAuthenticated || !hasLoadedAuthUser || !isAdminUser) {
      return;
    }

    let isActive = true;

    getCachedValue<AdminUsersApiItem[]>(
      "admin:rpm_admin_get",
      async () => {
        const response = await fetch(`${API_URL}/rpm/admin_get`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to load users: ${response.status}`);
        }

        const payload = (await response.json()) as unknown;
        return Array.isArray(payload) ? (payload as AdminUsersApiItem[]) : [];
      },
      CACHE_TTL_SHORT_MS
    )
      .then((rows) => {
        if (!isActive) return;

        const sortedRows = [...rows].sort((left, right) => {
          const leftTs = new Date(
            left.created_at.includes(" ")
              ? left.created_at.replace(" ", "T")
              : left.created_at
          ).getTime();
          const rightTs = new Date(
            right.created_at.includes(" ")
              ? right.created_at.replace(" ", "T")
              : right.created_at
          ).getTime();
          return rightTs - leftTs;
        });

        const mappedUsers = sortedRows.map((item) => {
          const normalizedFirstName = item.first_name.trim();
          const normalizedLastName = item.last_name.trim();
          const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim();
          const normalizedAccountType = normalizeManagedAccountType(
            item.account_type,
            "lc"
          );
          const email = typeof item.email === "string" ? item.email : "";

          return {
            id: String(item.id),
            firstName: normalizedFirstName,
            lastName: normalizedLastName,
            email,
            fullName: fullName || normalizedFirstName || normalizedLastName || "Unknown user",
            states: Array.isArray(item.states) ? item.states : [],
            note: typeof item.notes_text === "string" ? item.notes_text : "",
            accountType: normalizedAccountType,
            accountStatus: (item.code_used
              ? "account_created"
              : "signup_code_unused") as AccountStatus,
            signupCode: item.code_used ? null : item.auth_code,
            signupCodeCreatedAt: item.code_used ? null : item.created_at,
            temporaryPassword: null,
          };
        });

        const mappedCodes = sortedRows
          .filter((item) => !item.code_used)
          .map((item) => ({
            id: String(item.id),
            fullName: `${item.first_name.trim()} ${item.last_name.trim()}`.trim(),
            email: typeof item.email === "string" ? item.email : "",
            accountType: normalizeManagedAccountType(item.account_type, "lc"),
            code: item.auth_code,
            createdAt: item.created_at,
          }))
          .slice(0, 8);

        setLoadError(null);
        setManagedUsers(mappedUsers);
        setGeneratedCodes(mappedCodes);
      })
      .catch((error) => {
        if (!isActive) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load users.");
        setManagedUsers([]);
      });

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, hasLoadedAuthUser, isAdminUser]);

  useEffect(() => {
    if (!selectedUser) {
      setDraftStates([]);
      setDraftNote("");
      setDraftStateQuery("");
      setDraftAccountType("rpm");
      return;
    }

    setDraftStates(selectedUser.states);
    setDraftNote(selectedUser.note);
    setDraftAccountType(selectedUser.accountType);
    setDraftStateQuery("");
  }, [selectedUser]);

  const openManageDialog = (user: ManagedUserRecord) => {
    setSelectedUserId(user.id);
    setSaveMessage(null);
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
    setWizardAccountType("rpm");
    setWizardStates([]);
    setWizardStateQuery("");
    setWizardError(null);
  };

  const openNewAccountWizard = () => {
    setSaveMessage(null);
    setWizardError(null);
    setIsWizardOpen(true);
  };

  const saveUserSettings = () => {
    if (!selectedUser) return;

    setManagedUsers((previous) =>
      previous.map((user) =>
        user.id === selectedUser.id
          ? {
              ...user,
              accountType: draftAccountType,
              states: draftStates,
              note: draftNote.trim(),
            }
          : user
      )
    );

    setSaveMessage(`Saved updates for ${selectedUser.fullName}.`);
    setSelectedUserId(null);
  };

  const createNewAccountSignupCode = async () => {
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

    const selectedAccountType = wizardAccountType;
    const payload = {
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
      email: trimmedEmail || "n/a",
      states: wizardStates,
      account_type: selectedAccountType,
    };

    setWizardError(null);
    setIsCreatingAccount(true);

    try {
      const response = await fetch(`${API_URL}/rpm/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = `Failed to create account (${response.status}).`;
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

      const created = (await response.json()) as AdminSignupRegisterResponse;
      const createdAccountType = normalizeManagedAccountType(
        created.account_type,
        selectedAccountType
      );
      const fullName = `${created.first_name} ${created.last_name}`.trim();
      const createdEmail =
        typeof created.email === "string" ? created.email : payload.email;

      const newUser: ManagedUserRecord = {
        id: String(created.id),
        firstName: created.first_name,
        lastName: created.last_name,
        email: createdEmail,
        fullName,
        states: Array.isArray(created.states) ? created.states : wizardStates,
        note: typeof created.notes_text === "string" ? created.notes_text : "",
        accountType: createdAccountType,
        accountStatus: created.code_used ? "account_created" : "signup_code_unused",
        signupCode: created.code_used ? null : created.auth_code,
        signupCodeCreatedAt: created.code_used ? null : created.created_at,
        temporaryPassword: null,
      };

      const newCode: SignupCodeRecord | null = created.code_used
        ? null
        : {
            id: String(created.id),
            fullName,
            email: createdEmail,
            accountType: createdAccountType,
            code: created.auth_code,
            createdAt: created.created_at,
          };

      setManagedUsers((previous) => [newUser, ...previous]);
      setGeneratedCodes((previous) =>
        newCode ? [newCode, ...previous].slice(0, 8) : previous
      );
      setSaveMessage(
        `Created ${getAccountTypeLabel(createdAccountType)} account for ${fullName}.`
      );
      setIsWizardOpen(false);
      resetWizard();
    } catch {
      setWizardError("Unable to reach the server. Please try again.");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const markAccountCreated = () => {
    if (!selectedUser) return;

    setManagedUsers((previous) =>
      previous.map((user) =>
        user.id === selectedUser.id
          ? {
              ...user,
              accountStatus: "account_created",
              signupCode: null,
              signupCodeCreatedAt: null,
            }
          : user
      )
    );

    setSaveMessage(`Marked ${selectedUser.fullName} as account created.`);
    setSelectedUserId(null);
  };

  const resetPasswordToTemporary = () => {
    if (!selectedUser) return;

    const tempPassword = buildTemporaryPassword();

    setManagedUsers((previous) =>
      previous.map((user) =>
        user.id === selectedUser.id ? { ...user, temporaryPassword: tempPassword } : user
      )
    );
    setSaveMessage(`Temporary password generated for ${selectedUser.fullName}.`);
  };

  const openDeleteDialog = () => {
    if (!selectedUser) return;
    setDeleteError(null);
    setPendingDeleteUser(selectedUser);
  };

  const deleteAccount = async () => {
    if (!pendingDeleteUser) return;
    const deletedUser = pendingDeleteUser;
    setDeleteError(null);
    setIsDeletingAccount(true);

    try {
      const response = await fetch(
        `${API_URL}/rpm/admin_delete/${encodeURIComponent(String(deletedUser.id))}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (!response.ok) {
        let message = `Failed to delete account (${response.status}).`;
        try {
          const errorBody = (await response.json()) as { detail?: unknown };
          if (typeof errorBody.detail === "string" && errorBody.detail.trim()) {
            message = errorBody.detail;
          }
        } catch {
          // Keep default message when backend body is not JSON.
        }
        setDeleteError(message);
        return;
      }

      setManagedUsers((previous) => previous.filter((user) => user.id !== deletedUser.id));
      setGeneratedCodes((previous) => previous.filter((code) => code.id !== deletedUser.id));
      setSaveMessage(`Deleted account for ${deletedUser.fullName}.`);
      setPendingDeleteUser(null);
      setSelectedUserId(null);
    } catch {
      setDeleteError("Unable to reach the server. Please try again.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (authLoading || !isAuthenticated || !hasLoadedAuthUser) {
    return (
      <div className="brand-page-gradient min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--brand-primary)]" />
          <p className="mt-4 font-medium text-[var(--brand-body)]">Loading admin view...</p>
        </div>
      </div>
    );
  }

  if (!isAdminUser) {
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
            />
          )}

          <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
            <section className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.92)] p-6 text-center shadow-[0_12px_28px_rgba(0,53,84,0.12)]">
              <h1 className="text-2xl font-black tracking-tight text-[var(--brand-ink)]">
                Admin View Unavailable
              </h1>
              <p className="mt-2 text-sm text-[var(--brand-body)]">
                This view is restricted to admin accounts.
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
            showAdmin
          />
        )}

        <main className="mx-auto max-w-[1020px] px-4 py-6 sm:px-6">
          <section className="rpm-command-panel rounded-3xl p-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-[rgba(201,18,41,0.35)] bg-[rgba(201,18,41,0.1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-danger)]">
              <ShieldPlus className="h-3.5 w-3.5" />
              Admin Controls
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--brand-ink)]">
              Admin Panel
            </h1>
            <p className="mt-1.5 text-sm text-[var(--brand-body)]">
              Create accounts and manage account lifecycle actions across all user types.
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
                  Search Accounts
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-muted)]" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(event) => setUserSearchQuery(event.target.value)}
                    placeholder="Search by name, email, or account type"
                    className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] pl-9 pr-3 text-sm text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
                  />
                </div>
              </label>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.93)] p-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                  User Accounts
                </h2>
                <div className="mt-3 divide-y divide-[var(--brand-border-soft)] rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(255,255,255,0.8)]">
                  {filteredUsers.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-[var(--brand-muted)]">
                      No accounts match your search.
                    </p>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--brand-ink)]">
                            {user.fullName}
                          </p>
                          <span
                            className={`inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getAccountTypeClassName(
                              user.accountType
                            )}`}
                          >
                            {getAccountTypeLabel(user.accountType)}
                          </span>
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
                  onClick={openNewAccountWizard}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[rgba(0,94,184,0.35)] bg-[rgba(0,94,184,0.12)] px-4 text-sm font-semibold text-[var(--brand-primary-deep)] transition-colors hover:bg-[rgba(0,94,184,0.2)]"
                >
                  <Plus className="h-4 w-4" />
                  Create Account
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
                      Create an account to start the signup queue.
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
              New Account
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--brand-body)]">
              Enter user details (email optional), choose account type, and assign states.
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

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
                Account type
              </span>
              <select
                value={wizardAccountType}
                onChange={(event) =>
                  setWizardAccountType(event.target.value as ManagedAccountType)
                }
                className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 text-sm text-[var(--brand-ink)] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
              >
                {ACCOUNT_TYPE_OPTIONS.map((typeOption) => (
                  <option key={`wizard-type-${typeOption}`} value={typeOption}>
                    {getAccountTypeLabel(typeOption)}
                  </option>
                ))}
              </select>
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
              onClick={createNewAccountSignupCode}
              disabled={isCreatingAccount || wizardStates.length === 0}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[rgba(0,94,184,0.38)] bg-[rgba(0,94,184,0.12)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary-deep)] transition-colors hover:bg-[rgba(0,94,184,0.2)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[rgba(0,94,184,0.12)]"
            >
              <Plus className="h-3.5 w-3.5" />
              {isCreatingAccount ? "Creating..." : "Create Account"}
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
              {selectedUser ? selectedUser.fullName : "Manage Account"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--brand-body)]">
              Update account type, state assignments, notes, and lifecycle actions.
            </DialogDescription>
          </DialogHeader>

          {selectedUser ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.9)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand-body)]">
                {selectedUser.email || "No email provided"}
              </span>
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getAccountTypeClassName(
                  selectedUser.accountType
                )}`}
              >
                {getAccountTypeLabel(selectedUser.accountType)}
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

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-body)]">
              Account Type
            </span>
            <select
              value={draftAccountType}
              onChange={(event) => {
                setDraftAccountType(event.target.value as ManagedAccountType);
              }}
              className="h-10 w-full rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 text-sm text-[var(--brand-ink)] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
            >
              {ACCOUNT_TYPE_OPTIONS.map((typeOption) => (
                <option key={typeOption} value={typeOption}>
                  {getAccountTypeLabel(typeOption)}
                </option>
              ))}
            </select>
          </label>

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
              placeholder="Add context for this account (optional)"
              className="w-full resize-none rounded-xl border border-[var(--brand-border)] bg-[rgba(255,255,255,0.92)] px-3 py-2 text-sm text-[var(--brand-ink)] outline-none transition-shadow placeholder:text-[var(--brand-muted)] focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
            />
          </label>

          <DialogFooter>
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
              disabled={!selectedUser}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[rgba(0,94,184,0.38)] bg-[rgba(0,94,184,0.12)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary-deep)] transition-colors hover:bg-[rgba(0,94,184,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
            {selectedUser?.accountStatus === "signup_code_unused" ? (
              <button
                type="button"
                onClick={markAccountCreated}
                className="inline-flex h-9 items-center justify-center rounded-full border border-[rgba(0,144,63,0.38)] bg-[rgba(0,144,63,0.12)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-success-deep)] transition-colors hover:bg-[rgba(0,144,63,0.2)]"
              >
                Mark Account Created
              </button>
            ) : null}
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
            <button
              type="button"
              onClick={openDeleteDialog}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[rgba(201,18,41,0.4)] bg-[rgba(201,18,41,0.1)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-danger)] transition-colors hover:bg-[rgba(201,18,41,0.2)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Account
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDeleteUser !== null}
        onOpenChange={(open) => {
          if (open) return;
          setPendingDeleteUser(null);
          setDeleteError(null);
          setIsDeletingAccount(false);
        }}
      >
        <DialogContent className="max-w-md border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.98)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-[var(--brand-ink)]">
              Delete User Account
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--brand-body)]">
              This action removes the selected account from the admin list.
            </DialogDescription>
          </DialogHeader>

          {pendingDeleteUser ? (
            <p className="rounded-xl border border-[rgba(201,18,41,0.35)] bg-[rgba(201,18,41,0.08)] px-3 py-2 text-sm text-[var(--brand-body)]">
              Delete <span className="font-semibold">{pendingDeleteUser.fullName}</span>?
            </p>
          ) : null}
          {deleteError ? (
            <p className="rounded-xl border border-[rgba(201,18,41,0.4)] bg-[rgba(201,18,41,0.1)] px-3 py-2 text-sm font-semibold text-[var(--brand-danger)]">
              {deleteError}
            </p>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setPendingDeleteUser(null);
                setDeleteError(null);
                setIsDeletingAccount(false);
              }}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-body)] transition-colors hover:bg-[var(--brand-surface)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={isDeletingAccount}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[rgba(201,18,41,0.4)] bg-[rgba(201,18,41,0.12)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-danger)] transition-colors hover:bg-[rgba(201,18,41,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isDeletingAccount ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
