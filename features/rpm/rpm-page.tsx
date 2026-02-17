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

const MOCK_LC_USERS: LcUserRecord[] = [
  {
    id: "lc-user-1",
    firstName: "Ariana",
    lastName: "Torres",
    email: "ariana.torres@example.org",
    fullName: "Ariana Torres",
    states: ["California", "Arizona", "Texas"],
    note: "Prefers larger metro markets this quarter.",
    accountStatus: "account_created",
    signupCode: null,
    signupCodeCreatedAt: null,
    temporaryPassword: null,
  },
  {
    id: "lc-user-2",
    firstName: "Jordan",
    lastName: "Bennett",
    email: "jordan.bennett@example.org",
    fullName: "Jordan Bennett",
    states: ["Pennsylvania", "Ohio"],
    note: "",
    accountStatus: "signup_code_unused",
    signupCode: "LC-Q8M2-A7KD",
    signupCodeCreatedAt: "2026-02-17T15:22:00.000Z",
    temporaryPassword: null,
  },
];

const INITIAL_SIGNUP_CODES: SignupCodeRecord[] = MOCK_LC_USERS.filter(
  (user): user is LcUserRecord & { signupCode: string; signupCodeCreatedAt: string } =>
    user.accountStatus === "signup_code_unused" &&
    typeof user.signupCode === "string" &&
    typeof user.signupCodeCreatedAt === "string"
).map((user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  code: user.signupCode,
  createdAt: user.signupCodeCreatedAt,
}));

function randomCodeChunk(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let next = "";
  for (let i = 0; i < length; i += 1) {
    next += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return next;
}

function buildSignupCode(): string {
  return `LC-${randomCodeChunk(4)}-${randomCodeChunk(4)}`;
}

function buildTemporaryPassword(): string {
  return `Temp-${randomCodeChunk(4)}${Math.floor(100 + Math.random() * 900)}`;
}

function formatCreatedAt(createdAtIso: string): string {
  const timestamp = new Date(createdAtIso);
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

  const [lcUsers, setLcUsers] = useState<LcUserRecord[]>(MOCK_LC_USERS);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [draftStates, setDraftStates] = useState<string[]>([]);
  const [draftNote, setDraftNote] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [lcSearchQuery, setLcSearchQuery] = useState("");

  const [generatedCodes, setGeneratedCodes] =
    useState<SignupCodeRecord[]>(INITIAL_SIGNUP_CODES);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardFirstName, setWizardFirstName] = useState("");
  const [wizardLastName, setWizardLastName] = useState("");
  const [wizardEmail, setWizardEmail] = useState("");
  const [wizardStates, setWizardStates] = useState<string[]>([]);
  const [wizardStateQuery, setWizardStateQuery] = useState("");
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [draftStateQuery, setDraftStateQuery] = useState("");

  const normalizedAccountType = accountType.trim().toLowerCase();
  const isLcUser = normalizedAccountType.includes("lc");

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
    if (!selectedUser) {
      setDraftStates([]);
      setDraftNote("");
      setDraftStateQuery("");
      return;
    }

    setDraftStates(selectedUser.states);
    setDraftNote(selectedUser.note);
    setDraftStateQuery("");
  }, [selectedUser]);

  const openManageDialog = (user: LcUserRecord) => {
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
    setWizardStates([]);
    setWizardStateQuery("");
    setWizardError(null);
  };

  const openNewLcWizard = () => {
    setSaveMessage(null);
    setWizardError(null);
    setIsWizardOpen(true);
  };

  const saveUserSettings = () => {
    if (!selectedUser) return;

    setLcUsers((previous) =>
      previous.map((user) =>
        user.id === selectedUser.id
          ? {
              ...user,
              states: draftStates,
              note: draftNote.trim(),
            }
          : user
      )
    );

    setSaveMessage(`Saved updates for ${selectedUser.fullName}.`);
    setSelectedUserId(null);
  };

  const createNewLcSignupCode = () => {
    const trimmedFirstName = wizardFirstName.trim();
    const trimmedLastName = wizardLastName.trim();
    const trimmedEmail = wizardEmail.trim().toLowerCase();

    if (!trimmedFirstName || !trimmedLastName) {
      setWizardError("First and last name are required.");
      return;
    }

    if (!trimmedEmail) {
      setWizardError("Email address is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setWizardError("Enter a valid email address.");
      return;
    }

    if (wizardStates.length === 0) {
      setWizardError("Select at least one state.");
      return;
    }

    const fullName = `${trimmedFirstName} ${trimmedLastName}`;
    const createdAt = new Date().toISOString();
    const code = buildSignupCode();
    const id = `lc-user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newUser: LcUserRecord = {
      id,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: trimmedEmail,
      fullName,
      states: wizardStates,
      note: "",
      accountStatus: "signup_code_unused",
      signupCode: code,
      signupCodeCreatedAt: createdAt,
      temporaryPassword: null,
    };

    const newCode: SignupCodeRecord = {
      id,
      fullName,
      email: trimmedEmail,
      code,
      createdAt,
    };

    setLcUsers((previous) => [newUser, ...previous]);
    setGeneratedCodes((previous) => [newCode, ...previous].slice(0, 8));
    setSaveMessage(`Created signup code for ${fullName}.`);
    setIsWizardOpen(false);
    resetWizard();
  };

  const markAccountCreated = () => {
    if (!selectedUser) return;

    setLcUsers((previous) =>
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

    setLcUsers((previous) =>
      previous.map((user) =>
        user.id === selectedUser.id ? { ...user, temporaryPassword: tempPassword } : user
      )
    );
    setSaveMessage(`Temporary password generated for ${selectedUser.fullName}.`);
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
              showRpm
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
            showRpm
          />
        )}

        <main className="mx-auto max-w-[1020px] px-4 py-6 sm:px-6">
          <section className="rpm-command-panel rounded-3xl p-6">
            
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--brand-ink)]">
              Local Coordinator Dashboard
            </h1>
            <p className="mt-1.5 text-sm text-[var(--brand-body)]">
              Manage each LC user&apos;s states and maintain personal notes per user.
            </p>

            {saveMessage ? (
              <div className="mt-4 rounded-xl border border-[rgba(0,144,63,0.42)] bg-[rgba(0,144,63,0.1)] px-4 py-2 text-sm font-semibold text-[var(--brand-success-deep)]">
                {saveMessage}
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
                        <p className="text-[11px] text-[var(--brand-muted)]">{entry.email}</p>
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
              Enter the local coordinator&apos;s name and email, then assign states.
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
                Email address
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
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[rgba(0,94,184,0.38)] bg-[rgba(0,94,184,0.12)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary-deep)] transition-colors hover:bg-[rgba(0,94,184,0.2)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Signup Code
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

          {selectedUser ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.9)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand-body)]">
                {selectedUser.email}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
