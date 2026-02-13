import type { Dispatch, SetStateAction } from "react";
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  MapPin,
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
import type { Filters } from "@/features/student-search/types";

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
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="mx-auto max-h-[85vh] max-w-[95vw] overflow-y-auto rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(246,247,248,0.92)] shadow-[0_24px_50px_-30px_rgba(0,53,84,0.8)] sm:w-[92vw] sm:max-w-[1200px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="space-y-3">
            <div className="rounded-xl border border-[rgba(0,94,184,0.3)] bg-gradient-to-br from-[rgba(0,94,184,0.08)] to-[rgba(253,254,255,0.96)] p-4 shadow-[0_5px_14px_-12px_rgba(0,53,84,0.72)]">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--brand-ink)]">
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
                    className="h-9 w-full justify-between border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm shadow-sm hover:border-[var(--brand-primary)] hover:bg-[var(--brand-surface-elevated)]"
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

            <div className="rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_5px_14px_-12px_rgba(0,53,84,0.72)]">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--brand-ink)]">
                <MapPin className="h-4 w-4 text-[var(--brand-primary-deep)]" />
                Location & Demographics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-[var(--brand-body)]">
                    Country of Origin
                  </label>
                  <Select
                    value={filters.country_of_origin}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, country_of_origin: value }))
                    }
                  >
                    <SelectTrigger className="h-9 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm shadow-sm hover:border-[var(--brand-primary)]">
                      <SelectValue placeholder="Show All" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <label className="mb-1.5 block text-[11px] font-semibold text-[var(--brand-body)]">
                    State
                  </label>
                  <Select
                    value={filters.state}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, state: value }))
                    }
                  >
                    <SelectTrigger className="h-9 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm shadow-sm hover:border-[var(--brand-primary)]">
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

            <div className="rounded-xl border border-[rgba(255,194,62,0.5)] bg-gradient-to-br from-[rgba(255,194,62,0.18)] to-[rgba(253,254,255,0.96)] p-4 shadow-[0_5px_14px_-12px_rgba(0,53,84,0.72)]">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--brand-ink)]">
                <GraduationCap className="h-4 w-4 text-[#9b6b00]" />
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
                    <SelectTrigger className="h-9 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm shadow-sm hover:border-[var(--brand-primary)]">
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
                    <SelectTrigger className="h-9 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm shadow-sm hover:border-[var(--brand-primary)]">
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
                    <SelectTrigger className="h-9 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm shadow-sm hover:border-[var(--brand-primary)]">
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

            <div className="rounded-xl border border-[rgba(0,144,63,0.42)] bg-gradient-to-br from-[rgba(0,144,63,0.14)] to-[rgba(253,254,255,0.96)] p-4 shadow-[0_5px_14px_-12px_rgba(0,53,84,0.72)]">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--brand-ink)]">
                <Calendar className="h-4 w-4 text-[var(--brand-success-deep)]" />
                Program Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <SelectTrigger className="h-9 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm shadow-sm hover:border-[var(--brand-primary)]">
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
                    <SelectTrigger className="h-9 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm shadow-sm hover:border-[var(--brand-primary)]">
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
                    className="h-9 w-full justify-between border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm shadow-sm hover:border-[var(--brand-primary)] hover:bg-[var(--brand-surface-elevated)]"
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

            <div className="rounded-xl border border-[rgba(255,87,0,0.42)] bg-gradient-to-br from-[rgba(255,87,0,0.12)] to-[rgba(253,254,255,0.96)] p-4 shadow-[0_5px_14px_-12px_rgba(0,53,84,0.72)]">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--brand-ink)]">
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
                    <SelectTrigger className="h-9 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm shadow-sm hover:border-[var(--brand-primary)]">
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
                    <SelectTrigger className="h-9 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm shadow-sm hover:border-[var(--brand-primary)]">
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
                    className="h-9 w-full justify-between border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm shadow-sm hover:border-[var(--brand-primary)] hover:bg-[var(--brand-surface-elevated)]"
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

            <div className="rounded-xl border border-[rgba(60,159,192,0.45)] bg-gradient-to-br from-[rgba(60,159,192,0.14)] to-[rgba(253,254,255,0.96)] p-4 shadow-[0_5px_14px_-12px_rgba(0,53,84,0.72)]">
              <h3 className="mb-3 text-sm font-semibold text-[var(--brand-ink)]">
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
                    <SelectTrigger className="h-9 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-sm shadow-sm hover:border-[var(--brand-primary)]">
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

          <div className="mt-4 flex gap-3 border-t border-[var(--brand-border-soft)] pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 flex-1 border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] font-medium text-[var(--brand-body)] hover:bg-[var(--brand-surface)]"
            >
              Cancel
            </Button>
            <Button
              onClick={onApplyFilters}
              className="h-10 flex-1 bg-[var(--brand-primary)] font-semibold text-white shadow-sm hover:bg-[var(--brand-primary-deep)]"
            >
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
