import {
  useEffect,
  useMemo,
  type ComponentType,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import {
  Award,
  Calendar,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { interests } from "@/components/search/interests";
import { states } from "@/components/search/states";
import {
  PROGRAM_TYPE_OPTIONS,
  SCHOLARSHIP_OPTIONS,
} from "@/features/student-search/constants";
import { defaultFilters, type Filters } from "@/features/student-search/types";

type StudentFiltersPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  countries: string[];
  onToggleStatus: (value: string) => void;
  onToggleProgramType: (value: string) => void;
  onToggleScholarship: (value: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  statusOptions: { id: string; label: string; value: string }[];
};

type ActiveFilterPill = {
  key: string;
  group: string;
  value: string;
  onRemove: () => void;
};

const RELIGIOUS_PRACTICE_LABELS: Record<string, string> = {
  often: "Often",
  some: "Some",
  none: "Never",
};

const STATE_LABELS = new Map(
  states.map((stateOption) => [stateOption.value, stateOption.label])
);

const INTEREST_LABELS = new Map(
  interests.map((interestOption) => [interestOption.value, interestOption.label])
);

const PROGRAM_TYPE_LABELS = new Map(
  PROGRAM_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

const SCHOLARSHIP_LABELS = new Map(
  SCHOLARSHIP_OPTIONS.map((option) => [option.value, option.label])
);

const hasDefaultStatusSelection = (statusOptions: string[]) =>
  statusOptions.length === defaultFilters.statusOptions.length &&
  statusOptions.every((status) => defaultFilters.statusOptions.includes(status));

const toTitle = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

type SectionProps = {
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
};

function LedgerSection({ title, subtitle, icon: Icon, children }: SectionProps) {
  return (
    <section className="grid grid-cols-1 border-t border-[rgba(255,87,0,0.22)] py-3 md:grid-cols-[180px_1fr] md:gap-4">
      <div className="mb-2 md:mb-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgba(255,87,0,0.75)]">
          {subtitle}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <Icon className="h-4 w-4 text-[var(--brand-accent)]" />
          <h4 className="text-sm font-semibold text-[var(--brand-body)]">{title}</h4>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}


function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
      {children}
    </label>
  );
}

function ToggleChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        selected
          ? "border-[rgba(255,87,0,0.46)] bg-[rgba(255,87,0,0.12)] font-semibold text-[var(--brand-accent)]"
          : "border-[rgba(255,87,0,0.24)] bg-white text-[var(--brand-body)] hover:border-[rgba(255,87,0,0.42)]"
      }`}
    >
      {children}
    </button>
  );
}

export function StudentFiltersPanel({
  open,
  onOpenChange,
  filters,
  setFilters,
  countries,
  onToggleStatus,
  onToggleProgramType,
  onToggleScholarship,
  onApplyFilters,
  onClearFilters,
  statusOptions,
}: StudentFiltersPanelProps) {
  useEffect(() => {
    if (!open) return;

    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
    };
  }, [open, onOpenChange]);

  const selectTriggerClass =
    "h-9 w-full border-[rgba(255,87,0,0.3)] bg-white text-[var(--brand-body)] hover:border-[rgba(255,87,0,0.55)] focus-visible:ring-[rgba(255,87,0,0.24)]";
  const selectContentClass = "z-[120]";
  const weightedThreeColumnGridClass =
    "grid grid-cols-1 gap-y-2.5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1.2fr)] md:gap-x-2";

  const activeFilterPills = useMemo<ActiveFilterPill[]>(() => {
    const pills: ActiveFilterPill[] = [];

    if (filters.country_of_origin !== defaultFilters.country_of_origin) {
      pills.push({
        key: `country-${filters.country_of_origin}`,
        group: "Country",
        value: filters.country_of_origin,
        onRemove: () =>
          setFilters((prev) => ({ ...prev, country_of_origin: defaultFilters.country_of_origin })),
      });
    }

    if (filters.state !== defaultFilters.state) {
      pills.push({
        key: `state-${filters.state}`,
        group: "State",
        value: STATE_LABELS.get(filters.state) ?? filters.state,
        onRemove: () => setFilters((prev) => ({ ...prev, state: defaultFilters.state })),
      });
    }

    if (filters.interests !== defaultFilters.interests) {
      pills.push({
        key: `interest-${filters.interests}`,
        group: "Interest",
        value: INTEREST_LABELS.get(filters.interests) ?? filters.interests,
        onRemove: () => setFilters((prev) => ({ ...prev, interests: defaultFilters.interests })),
      });
    }

    if (!hasDefaultStatusSelection(filters.statusOptions)) {
      filters.statusOptions.forEach((status) => {
        pills.push({
          key: `status-${status}`,
          group: "Status",
          value: status,
          onRemove: () => onToggleStatus(status),
        });
      });
    }

    if (filters.gender_male) {
      pills.push({
        key: "gender-male",
        group: "Gender",
        value: "Male",
        onRemove: () => setFilters((prev) => ({ ...prev, gender_male: false })),
      });
    }

    if (filters.gender_female) {
      pills.push({
        key: "gender-female",
        group: "Gender",
        value: "Female",
        onRemove: () => setFilters((prev) => ({ ...prev, gender_female: false })),
      });
    }

    if (filters.gpa !== defaultFilters.gpa) {
      pills.push({
        key: `gpa-${filters.gpa}`,
        group: "GPA",
        value: filters.gpa,
        onRemove: () => setFilters((prev) => ({ ...prev, gpa: defaultFilters.gpa })),
      });
    }

    if (filters.adjusted_age !== defaultFilters.adjusted_age) {
      pills.push({
        key: `age-${filters.adjusted_age}`,
        group: "Age",
        value: filters.adjusted_age,
        onRemove: () => setFilters((prev) => ({ ...prev, adjusted_age: defaultFilters.adjusted_age })),
      });
    }

    if (filters.pets_in_home !== defaultFilters.pets_in_home) {
      pills.push({
        key: `pets-${filters.pets_in_home}`,
        group: "Pets",
        value: toTitle(filters.pets_in_home),
        onRemove: () => setFilters((prev) => ({ ...prev, pets_in_home: defaultFilters.pets_in_home })),
      });
    }

    if (filters.early_placement !== defaultFilters.early_placement) {
      pills.push({
        key: `early-${filters.early_placement}`,
        group: "Early",
        value: toTitle(filters.early_placement),
        onRemove: () =>
          setFilters((prev) => ({ ...prev, early_placement: defaultFilters.early_placement })),
      });
    }

    if (filters.double_placement !== defaultFilters.double_placement) {
      pills.push({
        key: `double-${filters.double_placement}`,
        group: "Double",
        value: toTitle(filters.double_placement),
        onRemove: () =>
          setFilters((prev) => ({ ...prev, double_placement: defaultFilters.double_placement })),
      });
    }

    if (filters.single_placement !== defaultFilters.single_placement) {
      pills.push({
        key: `single-${filters.single_placement}`,
        group: "Single",
        value: toTitle(filters.single_placement),
        onRemove: () =>
          setFilters((prev) => ({ ...prev, single_placement: defaultFilters.single_placement })),
      });
    }

    if (filters.religiousPractice !== defaultFilters.religiousPractice) {
      pills.push({
        key: `religion-${filters.religiousPractice}`,
        group: "Religion",
        value:
          RELIGIOUS_PRACTICE_LABELS[filters.religiousPractice] ??
          toTitle(filters.religiousPractice),
        onRemove: () =>
          setFilters((prev) => ({ ...prev, religiousPractice: defaultFilters.religiousPractice })),
      });
    }

    if (filters.hasVideo) {
      pills.push({
        key: "video-yes",
        group: "Video",
        value: "Yes",
        onRemove: () => setFilters((prev) => ({ ...prev, hasVideo: false })),
      });
    }

    filters.program_types.forEach((programType) => {
      pills.push({
        key: `program-${programType}`,
        group: "Program",
        value: PROGRAM_TYPE_LABELS.get(programType) ?? programType,
        onRemove: () => onToggleProgramType(programType),
      });
    });

    filters.grants_options.forEach((grant) => {
      pills.push({
        key: `grant-${grant}`,
        group: "Scholarship",
        value: SCHOLARSHIP_LABELS.get(grant) ?? grant,
        onRemove: () => onToggleScholarship(grant),
      });
    });

    return pills;
  }, [
    filters,
    onToggleProgramType,
    onToggleScholarship,
    onToggleStatus,
    setFilters,
  ]);

  if (!open) return null;

  const sectionProps = {
    location: {
      title: "Location & Demographics",
      subtitle: "Profile Base",
      icon: MapPin,
    },
    status: {
      title: "Placement Status",
      subtitle: "Workflow",
      icon: CheckCircle2,
    },
    academics: {
      title: "Academic Signals",
      subtitle: "School Profile",
      icon: GraduationCap,
    },
    program: {
      title: "Program Details",
      subtitle: "Placement Rules",
      icon: Calendar,
    },
    placement: {
      title: "Scholarship & Placement",
      subtitle: "Matching Flags",
      icon: Award,
    },
    additional: {
      title: "Additional Preferences",
      subtitle: "Fine Tuning",
      icon: Sparkles,
    },
  };

  const locationFields = (
    <div className={weightedThreeColumnGridClass}>
      <div>
        <FieldLabel>Country</FieldLabel>
        <Select
          value={filters.country_of_origin}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, country_of_origin: value }))
          }
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Show All" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="all">Show All</SelectItem>
            {countries.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <FieldLabel>State</FieldLabel>
        <Select
          value={filters.state}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, state: value }))}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Show All" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            {states.map((stateOption) => (
              <SelectItem key={stateOption.value} value={stateOption.value}>
                {stateOption.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <FieldLabel>Gender</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          <ToggleChip
            selected={filters.gender_male}
            onClick={() =>
              setFilters((prev) => ({ ...prev, gender_male: !prev.gender_male }))
            }
          >
            Male
          </ToggleChip>
          <ToggleChip
            selected={filters.gender_female}
            onClick={() =>
              setFilters((prev) => ({ ...prev, gender_female: !prev.gender_female }))
            }
          >
            Female
          </ToggleChip>
        </div>
      </div>
    </div>
  );

  const statusFields = (
    <div>
      <FieldLabel>Status Options</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {statusOptions.map((status) => (
          <ToggleChip
            key={status.id}
            selected={filters.statusOptions.includes(status.value)}
            onClick={() => onToggleStatus(status.value)}
          >
            {status.label}
          </ToggleChip>
        ))}
      </div>
    </div>
  );

  const academicFields = (
    <div className={weightedThreeColumnGridClass}>
      <div>
        <FieldLabel>GPA</FieldLabel>
        <Select
          value={filters.gpa}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, gpa: value }))}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Show All" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="all">Show All</SelectItem>
            <SelectItem value="4.0">4.0</SelectItem>
            <SelectItem value="3.5">3.5+</SelectItem>
            <SelectItem value="3.0">3.0+</SelectItem>
            <SelectItem value="2.5">2.5+</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <FieldLabel>Age</FieldLabel>
        <Select
          value={filters.adjusted_age}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, adjusted_age: value }))
          }
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Show All" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="all">Show All</SelectItem>
            <SelectItem value="14">14</SelectItem>
            <SelectItem value="15">15</SelectItem>
            <SelectItem value="16">16</SelectItem>
            <SelectItem value="17">17</SelectItem>
            <SelectItem value="18">18</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <FieldLabel>Interests</FieldLabel>
        <Select
          value={filters.interests}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, interests: value }))}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Show All" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            {interests.map((interest) => (
              <SelectItem key={interest.value} value={interest.value}>
                {interest.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const programFields = (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
      <div>
        <FieldLabel>Pets In Home</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {["all", "yes", "no"].map((value) => (
            <ToggleChip
              key={value}
              selected={filters.pets_in_home === value}
              onClick={() => setFilters((prev) => ({ ...prev, pets_in_home: value }))}
            >
              {toTitle(value)}
            </ToggleChip>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Early Placement</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {["all", "yes", "no"].map((value) => (
            <ToggleChip
              key={value}
              selected={filters.early_placement === value}
              onClick={() =>
                setFilters((prev) => ({ ...prev, early_placement: value }))
              }
            >
              {toTitle(value)}
            </ToggleChip>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Program Length</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {PROGRAM_TYPE_OPTIONS.map((option) => (
            <ToggleChip
              key={option.id}
              selected={filters.program_types.includes(option.value)}
              onClick={() => onToggleProgramType(option.value)}
            >
              {option.label}
            </ToggleChip>
          ))}
        </div>
      </div>
    </div>
  );

  const placementFields = (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
      <div>
        <FieldLabel>Double Placement</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {["all", "yes", "no"].map((value) => (
            <ToggleChip
              key={value}
              selected={filters.double_placement === value}
              onClick={() =>
                setFilters((prev) => ({ ...prev, double_placement: value }))
              }
            >
              {toTitle(value)}
            </ToggleChip>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Single Placement</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {["all", "yes", "no"].map((value) => (
            <ToggleChip
              key={value}
              selected={filters.single_placement === value}
              onClick={() =>
                setFilters((prev) => ({ ...prev, single_placement: value }))
              }
            >
              {toTitle(value)}
            </ToggleChip>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Scholarship</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {SCHOLARSHIP_OPTIONS.map((option) => (
            <ToggleChip
              key={option.id}
              selected={filters.grants_options.includes(option.value)}
              onClick={() => onToggleScholarship(option.value)}
            >
              {option.label}
            </ToggleChip>
          ))}
        </div>
      </div>
    </div>
  );

  const additionalFields = (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
      <div>
        <FieldLabel>Religious Practice</FieldLabel>
        <Select
          value={filters.religiousPractice}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, religiousPractice: value }))
          }
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Show All" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="all">Show All</SelectItem>
            <SelectItem value="often">Often</SelectItem>
            <SelectItem value="some">Some</SelectItem>
            <SelectItem value="none">Never</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <FieldLabel>Video Available</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          <ToggleChip
            selected={filters.hasVideo}
            onClick={() => setFilters((prev) => ({ ...prev, hasVideo: !prev.hasVideo }))}
          >
            Yes
          </ToggleChip>
        </div>
      </div>
    </div>
  );

  const ledgerLayout = (
    <div className="rounded-2xl border border-[rgba(255,87,0,0.24)] bg-white px-3">
      <LedgerSection {...sectionProps.status}>{statusFields}</LedgerSection>
      <LedgerSection {...sectionProps.location}>{locationFields}</LedgerSection>
      <LedgerSection {...sectionProps.academics}>{academicFields}</LedgerSection>
      <LedgerSection {...sectionProps.program}>{programFields}</LedgerSection>
      <LedgerSection {...sectionProps.placement}>{placementFields}</LedgerSection>
      <LedgerSection {...sectionProps.additional}>{additionalFields}</LedgerSection>
    </div>
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-transparent p-4"
      onMouseDown={() => onOpenChange(false)}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="relative w-[min(96vw,1100px)] overflow-hidden rounded-2xl border border-[rgba(255,87,0,0.3)] bg-white"
      >
        <div className="border-b border-[rgba(255,87,0,0.2)] bg-[rgba(255,87,0,0.07)] px-3 py-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>              
              <h3 className="text-sm font-semibold text-[var(--brand-body)]">
                Student Search Filters
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-[rgba(255,87,0,0.26)] p-1 text-[var(--brand-muted)] transition-colors hover:border-[rgba(255,87,0,0.5)] hover:text-[var(--brand-accent)]"
              aria-label="Close filters panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {activeFilterPills.length > 0 && (
          <div className="border-b border-[rgba(255,87,0,0.2)] px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,87,0,0.76)]">
                Active Filters
              </p>
              <span className="rounded-full border border-[rgba(255,87,0,0.3)] bg-[rgba(255,87,0,0.1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-accent)]">
                {activeFilterPills.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeFilterPills.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={pill.onRemove}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,87,0,0.26)] bg-[rgba(255,87,0,0.06)] px-2.5 py-1 text-[11px] text-[var(--brand-body)] transition-colors hover:border-[rgba(255,87,0,0.48)] hover:bg-[rgba(255,87,0,0.14)]"
                  title={`Remove ${pill.group}: ${pill.value}`}
                >
                  <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[rgba(255,87,0,0.7)]">
                    {pill.group}
                  </span>
                  <span className="h-3 w-px bg-[rgba(255,87,0,0.25)]" />
                  <span>{pill.value}</span>
                  <X className="h-3.5 w-3.5 text-[rgba(255,87,0,0.72)]" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-h-[72vh] overflow-y-auto p-3">
          {ledgerLayout}
        </div>

        <div className="flex gap-2 border-t border-[rgba(255,87,0,0.2)] p-3">
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="h-10 flex-1 border-[rgba(255,87,0,0.34)] text-[var(--brand-body)] hover:border-[rgba(255,87,0,0.54)] hover:bg-[rgba(255,87,0,0.08)]"
          >
            Clear
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 flex-1 border-[rgba(255,87,0,0.34)] text-[var(--brand-body)] hover:border-[rgba(255,87,0,0.54)] hover:bg-[rgba(255,87,0,0.08)]"
          >
            Close
          </Button>
          <Button
            onClick={onApplyFilters}
            className="h-10 flex-1 bg-[var(--brand-accent)] text-white hover:bg-[#e74f00]"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
