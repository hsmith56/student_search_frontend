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
  STATUS_OPTIONS,
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
}: FiltersDialogProps) {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-100/90 border border-slate-300/90 max-w-[95vw] sm:w-[92vw] sm:max-w-[1200px] mx-auto rounded-2xl shadow-[0_24px_50px_-30px_rgba(15,23,42,0.8)] max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="space-y-3">
            <div className="rounded-xl border border-sky-200/90 bg-gradient-to-br from-sky-50/90 to-white p-4 shadow-[0_5px_14px_-12px_rgba(15,23,42,0.75)]">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-700" />
                Status
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-2">
                    Placement Status
                  </label>
                  <Button
                    variant="outline"
                    onClick={() => setIsStatusOpen(true)}
                    className="w-full h-9 justify-between text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400 hover:bg-white"
                  >
                    <span className="text-slate-700">
                      {filters.statusOptions.length > 0
                        ? filters.statusOptions.join(", ")
                        : "Select status"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-300/90 bg-white/95 p-4 shadow-[0_5px_14px_-12px_rgba(15,23,42,0.75)]">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-700" />
                Location & Demographics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Country of Origin
                  </label>
                  <Select
                    value={filters.country_of_origin}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, country_of_origin: value }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400">
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    State
                  </label>
                  <Select
                    value={filters.state}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, state: value }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400">
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-2">
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
                        className="text-sm text-slate-700 cursor-pointer"
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
                        className="text-sm text-slate-700 cursor-pointer"
                      >
                        Female
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-white p-4 shadow-[0_5px_14px_-12px_rgba(15,23,42,0.75)]">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-amber-700" />
                Academic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    GPA
                  </label>
                  <Select
                    value={filters.gpa}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, gpa: value }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400">
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Age
                  </label>
                  <Select
                    value={filters.adjusted_age}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, adjusted_age: value }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400">
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Interests
                  </label>
                  <Select
                    value={filters.interests}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, interests: value }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400">
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

            <div className="rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-white p-4 shadow-[0_5px_14px_-12px_rgba(15,23,42,0.75)]">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                Program Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-2">
                    Pets in Home
                  </label>
                  <Select
                    value={filters.pets_in_home}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, pets_in_home: value }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400">
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Early Placement
                  </label>
                  <Select
                    value={filters.early_placement}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, early_placement: value }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400">
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-2">
                    Program Length
                  </label>
                  <Button
                    variant="outline"
                    onClick={() => setIsProgramTypeOpen(true)}
                    className="w-full h-9 justify-between text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400 hover:bg-white"
                  >
                    <span className="text-slate-700">
                      {filters.program_types.length > 0
                        ? `${filters.program_types.length} selected`
                        : "Select options"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-rose-200/90 bg-gradient-to-br from-rose-50/90 to-white p-4 shadow-[0_5px_14px_-12px_rgba(15,23,42,0.75)]">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-rose-700" />
                Placement & Scholarship
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Double Placement
                  </label>
                  <Select
                    value={filters.double_placement}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, double_placement: value }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400">
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Single Placement
                  </label>
                  <Select
                    value={filters.single_placement}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, single_placement: value }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400">
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-2">
                    Scholarship Options
                  </label>
                  <Button
                    variant="outline"
                    onClick={() => setIsScholarshipOpen(true)}
                    className="w-full h-9 justify-between text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400 hover:bg-white"
                  >
                    <span className="text-slate-700">
                      {filters.grants_options.length > 0
                        ? `${filters.grants_options.length} selected`
                        : "Select options"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 to-white p-4 shadow-[0_5px_14px_-12px_rgba(15,23,42,0.75)]">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Additional Preferences
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Religious Practice Frequency
                  </label>
                  <Select
                    value={filters.religiousPractice}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, religiousPractice: value }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400">
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-2">
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
                      className="text-sm text-slate-700 cursor-pointer"
                    >
                      Yes
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4 pt-4 border-t border-slate-300/80">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={onApplyFilters}
              className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white shadow-sm font-semibold"
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
        options={STATUS_OPTIONS}
        selectedValues={filters.statusOptions}
        onToggle={onToggleStatus}
      />
    </>
  );
}
