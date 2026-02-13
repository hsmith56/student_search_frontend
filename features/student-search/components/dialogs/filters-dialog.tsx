import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  MapPin,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { interests } from "@/components/search/interests";
import { states } from "@/components/search/states";
import { FilterCheckbox } from "@/features/student-search/components/filter-checkbox";
import { MultiSelectDialog } from "@/features/student-search/components/dialogs/multi-select-dialog";
import {
  PROGRAM_TYPE_OPTIONS,
  SCHOLARSHIP_OPTIONS,
} from "@/features/student-search/constants";
import { defaultFilters, type Filters } from "@/features/student-search/types";

type FiltersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  countries: string[];
  isStatusOpen: boolean;
  setIsStatusOpen: (open: boolean) => void;
  isProgramTypeOpen: boolean;
  setIsProgramTypeOpen: (open: boolean) => void;
  isScholarshipOpen: boolean;
  setIsScholarshipOpen: (open: boolean) => void;
  onToggleStatus: (value: string) => void;
  onToggleProgramType: (value: string) => void;
  onToggleScholarship: (value: string) => void;
  onApplyFilters: () => void;
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

const INTEREST_LABELS = new Map(interests.map((interest) => [interest.value, interest.label]));
const STATE_LABELS = new Map(states.map((stateOption) => [stateOption.value, stateOption.label]));
const PROGRAM_TYPE_LABELS = new Map(
  PROGRAM_TYPE_OPTIONS.map((programTypeOption) => [programTypeOption.value, programTypeOption.label])
);
const SCHOLARSHIP_LABELS = new Map(
  SCHOLARSHIP_OPTIONS.map((scholarshipOption) => [scholarshipOption.value, scholarshipOption.label])
);

const hasDefaultStatusSelection = (statusOptions: string[]) =>
  statusOptions.length === defaultFilters.statusOptions.length &&
  statusOptions.every((status) => defaultFilters.statusOptions.includes(status));

export function FiltersDialog({
  open,
  onOpenChange,
  filters,
  setFilters,
  countries,
  isStatusOpen,
  setIsStatusOpen,
  isProgramTypeOpen,
  setIsProgramTypeOpen,
  isScholarshipOpen,
  setIsScholarshipOpen,
  onToggleStatus,
  onToggleProgramType,
  onToggleScholarship,
  onApplyFilters,
  statusOptions,
}: FiltersDialogProps) {
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const sectionClass =
    "rounded-xl border border-[rgba(0,53,84,0.12)] bg-[rgba(253,254,255,0.98)] p-3";
  const sectionTitleClass =
    "mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]";
  const fieldControlClass =
    "h-9 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm hover:border-[var(--brand-primary)]";
  const multiSelectButtonClass =
    "h-9 w-full justify-between border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm hover:border-[var(--brand-primary)] hover:bg-[var(--brand-surface-elevated)]";

  const countryOptions = useMemo(
    () =>
      [...new Set(countries)]
        .sort((left, right) => left.localeCompare(right))
        .map((country, index) => ({
          id: `country-${index}`,
          label: country,
          value: country,
        })),
    [countries]
  );

  const toggleCountry = (country: string) => {
    setFilters((prev) => ({
      ...prev,
      country_of_origin: prev.country_of_origin.includes(country)
        ? prev.country_of_origin.filter((item) => item !== country)
        : [...prev.country_of_origin, country],
    }));
  };

  const activeFilterPills = useMemo<ActiveFilterPill[]>(() => {
    const pills: ActiveFilterPill[] = [];
    const toTitle = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

    filters.country_of_origin.forEach((country) => {
      pills.push({
        key: `country-${country}`,
        group: "Country",
        value: country,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            country_of_origin: prev.country_of_origin.filter(
              (item) => item !== country
            ),
          })),
      });
    });

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
        group: "Early Placement",
        value: toTitle(filters.early_placement),
        onRemove: () =>
          setFilters((prev) => ({ ...prev, early_placement: defaultFilters.early_placement })),
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

    filters.grants_options.forEach((grant) => {
      pills.push({
        key: `grant-${grant}`,
        group: "Scholarship",
        value: SCHOLARSHIP_LABELS.get(grant) ?? grant.toUpperCase(),
        onRemove: () => onToggleScholarship(grant),
      });
    });

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

    return pills;
  }, [
    filters,
    onToggleProgramType,
    onToggleScholarship,
    onToggleStatus,
    setFilters,
  ]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="mx-auto max-h-[85vh] max-w-[92vw] overflow-y-auto rounded-2xl border border-[rgba(0,53,84,0.16)] bg-[rgba(253,254,255,0.98)] p-0 sm:w-[88vw] sm:max-w-[920px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="border-b border-[var(--brand-border-soft)] bg-[rgba(236,242,246,0.72)] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
              Refine Results
            </p>
            <p className="text-sm font-semibold text-[var(--brand-primary-deep)]">
              Student Filters
            </p>
          </div>

          {activeFilterPills.length > 0 && (
            <div className="border-b border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.74)] px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
                  Active Filters
                </p>
                <span className="inline-flex items-center rounded-full border border-[rgba(0,94,184,0.34)] bg-[rgba(0,94,184,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary-deep)]">
                  {activeFilterPills.length} selected
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {activeFilterPills.map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={pill.onRemove}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,53,84,0.16)] bg-[var(--brand-surface-elevated)] px-2.5 py-1 text-[11px] text-[var(--brand-body)] transition-colors hover:border-[var(--brand-primary)] hover:bg-[rgba(0,94,184,0.06)]"
                    title={`Remove ${pill.group}: ${pill.value}`}
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                      {pill.group}
                    </span>
                    <span className="h-3 w-px bg-[var(--brand-border-soft)]" />
                    <span className="font-medium">{pill.value}</span>
                    <X className="h-3.5 w-3.5 text-[var(--brand-muted)]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2.5 p-3">
            <div className={`${sectionClass} border-l-4 border-l-[var(--brand-primary)]`}>
              <h3 className={sectionTitleClass}>
                <CheckCircle2 className="h-4 w-4 text-[var(--brand-primary)]" />
                Status
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Placement Status
                  </label>
                  <Button
                    variant="outline"
                    onClick={() => setIsStatusOpen(true)}
                    className={multiSelectButtonClass}
                  >
                    <span className="text-[var(--brand-body)]">
                      {filters.statusOptions.length > 0
                        ? filters.statusOptions.join(", ")
                        : "Select status"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--brand-muted)]" />
                  </Button>
                </div>
              </div>
            </div>

            <div className={`${sectionClass} border-l-4 border-l-[var(--brand-primary-deep)]`}>
              <h3 className={sectionTitleClass}>
                <MapPin className="h-4 w-4 text-[var(--brand-primary-deep)]" />
                Location & Demographics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Country of Origin
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCountryOpen(true)}
                    className={multiSelectButtonClass}
                  >
                    <span className="text-[var(--brand-body)]">
                      {filters.country_of_origin.length > 0
                        ? `${filters.country_of_origin.length} selected`
                        : "Show All"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--brand-muted)]" />
                  </Button>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-[var(--brand-body)]">
                    State
                  </label>
                  <Select
                    value={filters.state}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, state: value }))
                    }
                  >
                    <SelectTrigger className={fieldControlClass}>
                      <SelectValue placeholder="Show All" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((stateOption) => (
                        <SelectItem key={stateOption.value} value={stateOption.value}>
                          {stateOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Gender
                  </label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <FilterCheckbox
                        id="male"
                        checked={filters.gender_male}
                        onCheckedChange={(checked) =>
                          setFilters((prev) => ({ ...prev, gender_male: !!checked }))
                        }
                      />
                      <label
                        htmlFor="male"
                        className="cursor-pointer text-sm text-[var(--brand-body)]"
                      >
                        Male
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <FilterCheckbox
                        id="female"
                        checked={filters.gender_female}
                        onCheckedChange={(checked) =>
                          setFilters((prev) => ({ ...prev, gender_female: !!checked }))
                        }
                      />
                      <label
                        htmlFor="female"
                        className="cursor-pointer text-sm text-[var(--brand-body)]"
                      >
                        Female
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${sectionClass} border-l-4 border-l-[var(--brand-highlight)]`}>
              <h3 className={sectionTitleClass}>
                <GraduationCap className="h-4 w-4 text-[var(--brand-body)]" />
                Academic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-[var(--brand-body)]">
                    GPA
                  </label>
                  <Select
                    value={filters.gpa}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, gpa: value }))
                    }
                  >
                    <SelectTrigger className={fieldControlClass}>
                      <SelectValue placeholder="Show All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Show All</SelectItem>
                      <SelectItem value="4.0">4.0</SelectItem>
                      <SelectItem value="3.5">3.5+</SelectItem>
                      <SelectItem value="3.0">3.0+</SelectItem>
                      <SelectItem value="2.5">2.5+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Age
                  </label>
                  <Select
                    value={filters.adjusted_age}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, adjusted_age: value }))
                    }
                  >
                    <SelectTrigger className={fieldControlClass}>
                      <SelectValue placeholder="Show All" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <label className="mb-1.5 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Interests
                  </label>
                  <Select
                    value={filters.interests}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, interests: value }))
                    }
                  >
                    <SelectTrigger className={fieldControlClass}>
                      <SelectValue placeholder="Show All" />
                    </SelectTrigger>
                    <SelectContent>
                      {interests.map((interest) => (
                        <SelectItem key={interest.value} value={interest.value}>
                          {interest.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className={`${sectionClass} border-l-4 border-l-[var(--brand-success)]`}>
              <h3 className={sectionTitleClass}>
                <Calendar className="h-4 w-4 text-[var(--brand-success-deep)]" />
                Program Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Pets in Home
                  </label>
                  <Select
                    value={filters.pets_in_home}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, pets_in_home: value }))
                    }
                  >
                    <SelectTrigger className={fieldControlClass}>
                      <SelectValue placeholder="Show All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Show All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Early Placement
                  </label>
                  <Select
                    value={filters.early_placement}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, early_placement: value }))
                    }
                  >
                    <SelectTrigger className={fieldControlClass}>
                      <SelectValue placeholder="Show All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Show All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Program Length
                  </label>
                  <Button
                    variant="outline"
                    onClick={() => setIsProgramTypeOpen(true)}
                    className={multiSelectButtonClass}
                  >
                    <span className="text-[var(--brand-body)]">
                      {filters.program_types.length > 0
                        ? `${filters.program_types.length} selected`
                        : "Select options"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--brand-muted)]" />
                  </Button>
                </div>
              </div>
            </div>

            <div className={`${sectionClass} border-l-4 border-l-[var(--brand-accent)]`}>
              <h3 className={sectionTitleClass}>
                <Award className="h-4 w-4 text-[var(--brand-accent)]" />
                Placement & Scholarship
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Double Placement
                  </label>
                  <Select
                    value={filters.double_placement}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, double_placement: value }))
                    }
                  >
                    <SelectTrigger className={fieldControlClass}>
                      <SelectValue placeholder="Show All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Show All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Single Placement
                  </label>
                  <Select
                    value={filters.single_placement}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, single_placement: value }))
                    }
                  >
                    <SelectTrigger className={fieldControlClass}>
                      <SelectValue placeholder="Show All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Show All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Scholarship Options
                  </label>
                  <Button
                    variant="outline"
                    onClick={() => setIsScholarshipOpen(true)}
                    className={multiSelectButtonClass}
                  >
                    <span className="text-[var(--brand-body)]">
                      {filters.grants_options.length > 0
                        ? `${filters.grants_options.length} selected`
                        : "Select options"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--brand-muted)]" />
                  </Button>
                </div>
              </div>
            </div>

            <div className={`${sectionClass} border-l-4 border-l-[var(--brand-secondary)]`}>
              <h3 className={sectionTitleClass}>
                Additional Preferences
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Religious Practice Frequency
                  </label>
                  <Select
                    value={filters.religiousPractice}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, religiousPractice: value }))
                    }
                  >
                    <SelectTrigger className={fieldControlClass}>
                      <SelectValue placeholder="all" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Show All</SelectItem>
                      <SelectItem value="often">Often</SelectItem>
                      <SelectItem value="some">Some</SelectItem>
                      <SelectItem value="none">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Video Available
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <FilterCheckbox
                      id="has-video"
                      checked={filters.hasVideo}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({ ...prev, hasVideo: !!checked }))
                      }
                    />
                    <label
                      htmlFor="has-video"
                      className="cursor-pointer text-sm text-[var(--brand-body)]"
                    >
                      Yes
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-1 flex gap-3 border-t border-[var(--brand-border-soft)] px-3 pb-3 pt-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 flex-1 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] font-medium text-[var(--brand-body)] hover:bg-[var(--brand-surface)]"
            >
              Cancel
            </Button>
            <Button
              onClick={onApplyFilters}
              className="h-10 flex-1 bg-[var(--brand-primary)] font-semibold text-white hover:bg-[var(--brand-primary-deep)]"
            >
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MultiSelectDialog
        open={isCountryOpen}
        onOpenChange={setIsCountryOpen}
        title="Select Countries"
        options={countryOptions}
        selectedValues={filters.country_of_origin}
        onToggle={toggleCountry}
        showSearch
        searchPlaceholder="Search countries"
        emptyResultsLabel="No countries found."
      />

      <MultiSelectDialog
        open={isProgramTypeOpen}
        onOpenChange={setIsProgramTypeOpen}
        title="Select Program Length"
        options={PROGRAM_TYPE_OPTIONS}
        selectedValues={filters.program_types}
        onToggle={onToggleProgramType}
      />

      <MultiSelectDialog
        open={isScholarshipOpen}
        onOpenChange={setIsScholarshipOpen}
        title="Select Scholarship Options"
        options={SCHOLARSHIP_OPTIONS}
        selectedValues={filters.grants_options}
        onToggle={onToggleScholarship}
      />

      <MultiSelectDialog
        open={isStatusOpen}
        onOpenChange={setIsStatusOpen}
        title="Select Placement Status"
        options={statusOptions}
        selectedValues={filters.statusOptions}
        onToggle={onToggleStatus}
      />
    </>
  );
}
