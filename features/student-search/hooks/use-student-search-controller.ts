"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { states as ALL_STATE_OPTIONS } from "@/components/search/states";
import {
  RESULTS_PER_PAGE_STORAGE_KEY,
  STATUS_OPTIONS,
} from "@/features/student-search/constants";
import {
  defaultFilters,
  type Filters,
  type StudentRecord,
} from "@/features/student-search/types";
import {
  getFavoriteStudentId,
  sortStudentsLocally,
} from "@/features/student-search/utils";
import { useStudentSearchPreferences } from "@/features/student-search/hooks/use-student-search-preferences";
import {
  getCachedValue,
  invalidateClientCache,
  invalidateClientCacheByPrefix,
} from "@/lib/client-cache";
import { getCurrentUser } from "@/lib/api/auth";
import {
  addFavorite,
  getFavorites,
  getFavoriteStates,
  removeFavorite,
} from "@/lib/api/favorites";
import {
  getAvailableNow,
  getCountries,
  getLastUpdateTime,
  getPlaced,
  getUnassignedNow,
} from "@/lib/api/misc";
import {
  searchStudents as searchStudentsApi,
  updateStudentDatabase,
} from "@/lib/api/students";

type UseStudentSearchControllerArgs = {
  isAuthenticated: boolean;
};

const CACHE_TTL_SHORT_MS = 30_000;
const CACHE_TTL_MEDIUM_MS = 5 * 60_000;
const CACHE_TTL_LONG_MS = 24 * 60 * 60_000;
const LC_ACCOUNT_TYPE = "lc";
const ALL_STATUS = "All";
const UNASSIGNED_STATUS = "Unassigned";
const DEFAULT_STATUS_FOR_LC = ["Allocated"];
const MY_STATES_FILTER_VALUE = "my_states";
const NO_PREFERENCES_FILTER_VALUE = "no_pref";
const MY_STATES_FILTER_LABEL = "My States Only";
const NO_PREFERENCES_FILTER_LABEL = "No Preferences";
const SPECIAL_STATE_FILTER_VALUES = new Set([
  "all",
  NO_PREFERENCES_FILTER_VALUE,
  "state_only",
  MY_STATES_FILTER_VALUE,
]);

type StateFilterOption = {
  value: string;
  label: string;
};

type StudentSearchResponse = {
  results?: StudentRecord[];
  page?: number;
  total_pages?: number;
  total_results?: number;
};

const hasSameValues = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value) => right.includes(value));
};

const getCountryFilterPayload = (countries: string[]) =>
  countries.length > 0 ? countries : ["all"];

const normalizeStateValues = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const deduped = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    deduped.add(trimmed);
  }

  return Array.from(deduped);
};

const parseStateValuesResponse = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return normalizeStateValues(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      return normalizeStateValues(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  if (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { states?: unknown }).states)
  ) {
    return normalizeStateValues((value as { states: unknown[] }).states);
  }

  return [];
};

const toStateFilterPayload = (stateValue: string): string[] => {
  const normalized = stateValue.trim();
  return normalized ? [normalized] : ["all"];
};

const getActiveFilterCount = (
  filters: Filters,
  defaultStateValue = defaultFilters.state
) => {
  let count = 0;

  count += filters.country_of_origin.length;
  if (filters.interests !== defaultFilters.interests) count += 1;
  if (filters.state !== defaultStateValue) count += 1;
  if (filters.gender_male) count += 1;
  if (filters.gender_female) count += 1;
  if (filters.pets_in_home !== defaultFilters.pets_in_home) count += 1;
  if (filters.early_placement !== defaultFilters.early_placement) count += 1;
  if (filters.hasVideo) count += 1;
  if (filters.gpa !== defaultFilters.gpa) count += 1;
  if (filters.adjusted_age !== defaultFilters.adjusted_age) count += 1;
  if (filters.religiousPractice !== defaultFilters.religiousPractice) count += 1;
  if (filters.double_placement !== defaultFilters.double_placement) count += 1;
  if (filters.single_placement !== defaultFilters.single_placement) count += 1;

  count += filters.program_types.length;
  count += filters.grants_options.length;

  if (!hasSameValues(filters.statusOptions, defaultFilters.statusOptions)) {
    count += filters.statusOptions.length;
  }

  return count;
};

export function useStudentSearchController({
  isAuthenticated,
}: UseStudentSearchControllerArgs) {
  const [query, setQuery] = useState("");
  const [updateTime, setUpdateTime] = useState("");
  const [isUpdatingDatabase, setIsUpdatingDatabase] = useState(false);
  const [usahsIdQuery, setUsahsIdQuery] = useState("");
  const [photoQuery, setPhotoQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [hasLoadedAuthUser, setHasLoadedAuthUser] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [resultsPerPage, setResultsPerPage] = useState<number>(() => {
    if (typeof window === "undefined") return 15;
    const stored = Number(localStorage.getItem(RESULTS_PER_PAGE_STORAGE_KEY) ?? "15");
    if ([15, 20, 25, 50].includes(stored)) return stored;
    return 15;
  });

  const [favoritedStudents, setFavoritedStudents] = useState<Set<string>>(
    new Set()
  );
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const { viewMode, setViewMode, orderBy, setOrderBy, descending, setDescending } =
    useStudentSearchPreferences();

  const [isSearchFiltersExpanded, setIsSearchFiltersExpanded] = useState(true);
  const [resultsAnimationKey, setResultsAnimationKey] = useState(0);

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [unassignedNow, setUnassignedNow] = useState(0);
  const [availableNow, setAvailableNow] = useState(0);
  const [alreadyPlaced, setAlreadyPlaced] = useState(0);
  const [localCoordinatorStates, setLocalCoordinatorStates] = useState<string[]>(
    []
  );
  const isLcUser = accountType.toLowerCase() === LC_ACCOUNT_TYPE;
  const isRpmUser = accountType.toLowerCase().includes("rpm");
  const isAdminUser = accountType.toLowerCase().includes("admin");
  const defaultStateFilterValue = isLcUser
    ? NO_PREFERENCES_FILTER_VALUE
    : defaultFilters.state;
  const activeFilterCount = useMemo(
    () => getActiveFilterCount(filters, defaultStateFilterValue),
    [defaultStateFilterValue, filters]
  );
  const canShowUnassigned = hasLoadedAuthUser && !isLcUser;
  const canUpdateDatabase = hasLoadedAuthUser && !isLcUser;
  const statusOptionsForFilter = canShowUnassigned
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.filter(
        (status) =>
          status.value !== UNASSIGNED_STATUS && status.value !== ALL_STATUS
      );
  const localCoordinatorStateSet = useMemo(
    () => new Set(localCoordinatorStates),
    [localCoordinatorStates]
  );
  const allowedLcStateFilterValues = useMemo(
    () =>
      new Set([
        MY_STATES_FILTER_VALUE,
        NO_PREFERENCES_FILTER_VALUE,
        ...localCoordinatorStates,
      ]),
    [localCoordinatorStates]
  );
  const stateOptionsForFilter = useMemo<StateFilterOption[]>(() => {
    if (!isLcUser) {
      return ALL_STATE_OPTIONS;
    }

    const coordinatorStateOptions = ALL_STATE_OPTIONS.filter(
      (option) =>
        !SPECIAL_STATE_FILTER_VALUES.has(option.value) &&
        localCoordinatorStateSet.has(option.value)
    );
    const includedStateValues = new Set(
      coordinatorStateOptions.map((option) => option.value)
    );
    const fallbackCoordinatorStateOptions = localCoordinatorStates
      .filter(
        (stateName) =>
          !SPECIAL_STATE_FILTER_VALUES.has(stateName) &&
          !includedStateValues.has(stateName)
      )
      .sort((left, right) => left.localeCompare(right))
      .map((stateName) => ({ value: stateName, label: stateName }));

    return [
      { value: MY_STATES_FILTER_VALUE, label: MY_STATES_FILTER_LABEL },
      { value: NO_PREFERENCES_FILTER_VALUE, label: NO_PREFERENCES_FILTER_LABEL },
      ...coordinatorStateOptions,
      ...fallbackCoordinatorStateOptions,
    ];
  }, [isLcUser, localCoordinatorStateSet, localCoordinatorStates]);
  const sanitizeStateFilterValue = useCallback(
    (stateValue: string) => {
      const normalizedStateValue = stateValue.trim();

      if (!isLcUser) {
        return normalizedStateValue || defaultFilters.state;
      }

      if (allowedLcStateFilterValues.has(normalizedStateValue)) {
        return normalizedStateValue;
      }

      return defaultStateFilterValue;
    },
    [allowedLcStateFilterValues, defaultStateFilterValue, isLcUser]
  );

  const sanitizeStatusOptions = useCallback(
    (statusOptions: string[]) => {
      if (!isLcUser) {
        return statusOptions;
      }

      const filteredStatusOptions = statusOptions.filter(
        (status) => status !== UNASSIGNED_STATUS && status !== ALL_STATUS
      );

      if (filteredStatusOptions.length === 0) {
        return DEFAULT_STATUS_FOR_LC;
      }

      return filteredStatusOptions;
    },
    [isLcUser]
  );

  const animateResultsRefresh = () => {
    setResultsAnimationKey((prev) => prev + 1);
  };

  const fetchLastUpdateTime = async () => {
    try {
      const data = await getCachedValue<unknown[]>(
        "misc:last_update_time",
        () => getLastUpdateTime(),
        CACHE_TTL_SHORT_MS
      );
      setUpdateTime(Array.isArray(data) ? (data?.[0] as string) ?? "" : "");
    } catch {
      setUpdateTime("");
    }
  };

  const fetchFavoriteStatesForFilter = useCallback(async () => {
    const data = await getCachedValue<unknown>(
      "user:states",
      () => getFavoriteStates<unknown>(),
      CACHE_TTL_SHORT_MS
    );

    const parsedStateValues = parseStateValuesResponse(data);
    setLocalCoordinatorStates(parsedStateValues);
    return parsedStateValues;
  }, []);

  const resolveStateFilterValue = async (stateValue: string): Promise<string[]> => {
    const sanitizedStateValue = sanitizeStateFilterValue(stateValue);

    if (sanitizedStateValue !== MY_STATES_FILTER_VALUE) {
      return toStateFilterPayload(sanitizedStateValue);
    }

    try {
      return await fetchFavoriteStatesForFilter();
    } catch (error) {
      console.error("Error resolving favorite states filter:", error);
      return [];
    }
  };

  const fetchStudents = async (
    page = 1,
    orderByParam?: string,
    descendingParam?: boolean,
    resultsPerPageParam?: number
  ) => {
    const sortBy = orderByParam ?? orderBy;
    const sortDesc =
      typeof descendingParam === "boolean" ? descendingParam : descending;
    const pageSize = resultsPerPageParam ?? resultsPerPage;
    try {
      const effectiveStatusOptions = sanitizeStatusOptions(filters.statusOptions);
      const statusValue = effectiveStatusOptions.includes(ALL_STATUS)
        ? "allocated"
        : effectiveStatusOptions.map((status) => status.toLowerCase()).join(",");
      const resolvedStateValue = await resolveStateFilterValue(filters.state);

      const data = await searchStudentsApi<StudentSearchResponse>({
        page,
        pageSize,
        orderBy: sortBy,
        descending: sortDesc,
        filters: {
          ...filters,
          state: resolvedStateValue,
          country_of_origin: getCountryFilterPayload(filters.country_of_origin),
          status: statusValue,
          free_text: query,
          usahsId: usahsIdQuery,
          photo_search: photoQuery,
        },
      });
      setCurrentPage(data.page || 1);
      setTotalPages(data.total_pages || 1);
      setStudents(data.results || []);
      setTotalResults(data.total_results || data.results?.length || 0);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchStudentsWithDefaults = async (
    defaultStateValue = defaultStateFilterValue
  ) => {
    try {
      const sanitizedDefaultStateValue = sanitizeStateFilterValue(defaultStateValue);
      const resolvedStateValue = await resolveStateFilterValue(
        sanitizedDefaultStateValue
      );
      const data = await searchStudentsApi<StudentSearchResponse>({
        page: 1,
        pageSize: resultsPerPage,
        orderBy,
        descending,
        filters: {
          ...defaultFilters,
          state: resolvedStateValue,
          country_of_origin: getCountryFilterPayload(defaultFilters.country_of_origin),
          status: "Allocated",
          free_text: "",
          usahsId: "",
          photo_search: "",
          order_by: orderBy,
          descending,
        },
      });
      setCurrentPage(data.page || 1);
      setTotalPages(data.total_pages || 1);
      setStudents(data.results || []);
      setTotalResults(data.total_results || data.results?.length || 0);
    } catch (error) {
      console.error("Error:", error);
      setStudents([]);
    }
  };

  const fetchStudentsByStatus = async (status: string[]) => {
    const sanitizedStatus = sanitizeStatusOptions(status);
    setCurrentPage(1);
    setShowFavoritesOnly(false);
    setFilters((prev) => ({
      ...prev,
      statusOptions: sanitizedStatus,
    }));

    try {
      const statusKey = sanitizedStatus
        .map((value) => value.toLowerCase())
        .join(",");
      const resolvedStateValue = await resolveStateFilterValue(filters.state);
      const resolvedStateToken = resolvedStateValue
        .map((value) => value.toLowerCase())
        .sort()
        .join(",");
      const cacheKey = `students:status:${statusKey}:state:${resolvedStateToken}:order:${orderBy}:descending:${descending}:pageSize:${resultsPerPage}:filters:${JSON.stringify(
        filters
      )}`;
      const data = await getCachedValue<StudentSearchResponse>(
        cacheKey,
        () =>
          searchStudentsApi<StudentSearchResponse>({
            page: 1,
            pageSize: resultsPerPage,
            orderBy,
            descending,
            filters: {
              ...filters,
              state: resolvedStateValue,
              country_of_origin: getCountryFilterPayload(filters.country_of_origin),
              statusOptions: sanitizedStatus,
            },
          }),
        CACHE_TTL_SHORT_MS
      );
      setStudents(data.results || []);
      setCurrentPage(data.page || 1);
      setTotalPages(data.total_pages || 1);
      setTotalResults(data.total_results || data.results?.length || 0);
      animateResultsRefresh();
    } catch (error) {
      console.error("Error:", error);
      setStudents([]);
    }
  };

  const handleResultsPerPageChange = (value: number) => {
    setResultsPerPage(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(RESULTS_PER_PAGE_STORAGE_KEY, String(value));
    }

    setCurrentPage(1);
    setShowFavoritesOnly(false);
    fetchStudents(1, undefined, undefined, value);
  };

  const fetchLoggedInUser = async () => {
    try {
      const data = await getCachedValue<{ first_name?: string; account_type?: string }>(
        "auth:me",
        () => getCurrentUser({ redirectOnUnauthorized: false }),
        CACHE_TTL_MEDIUM_MS
      );
      setFirstName(data.first_name ?? "");
      setAccountType(data.account_type ?? "");
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setHasLoadedAuthUser(true);
    }
  };

  const clearFilters = () => {
    const sanitizedDefaultStateValue = sanitizeStateFilterValue(
      defaultStateFilterValue
    );
    setFilters({
      ...defaultFilters,
      state: sanitizedDefaultStateValue,
    });
    setQuery("");
    setUsahsIdQuery("");
    setPhotoQuery("");
    setCurrentPage(1);
    setShowFavoritesOnly(false);
    fetchStudentsWithDefaults(sanitizedDefaultStateValue);
  };

  const toggleProgramType = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      program_types: prev.program_types.includes(value)
        ? prev.program_types.filter((item) => item !== value)
        : [...prev.program_types, value],
    }));
  };

  const toggleScholarship = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      grants_options: prev.grants_options.includes(value)
        ? prev.grants_options.filter((item) => item !== value)
        : [...prev.grants_options, value],
    }));
  };

  const toggleStatus = (value: string) => {
    if (isLcUser && (value === UNASSIGNED_STATUS || value === ALL_STATUS)) {
      return;
    }

    setFilters((prev) => {
      if (value === ALL_STATUS) {
        return { ...prev, statusOptions: [ALL_STATUS] };
      }

      let newStatusOptions = prev.statusOptions.filter((item) => item !== ALL_STATUS);

      if (newStatusOptions.includes(value)) {
        newStatusOptions = newStatusOptions.filter((item) => item !== value);
      } else {
        newStatusOptions = [...newStatusOptions, value];
      }

      if (newStatusOptions.length === 0) {
        newStatusOptions = isLcUser ? DEFAULT_STATUS_FOR_LC : [ALL_STATUS];
      }

      return { ...prev, statusOptions: newStatusOptions };
    });
  };

  const handleFindStudents = () => {
    setShowFavoritesOnly(false);
    setCurrentPage(1);
    fetchStudents(1);
  };

  const applyFilters = () => {
    setShowFavoritesOnly(false);
    setCurrentPage(1);
    fetchStudents(1);
    setIsFilterOpen(false);
  };

  const handleSearchInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleFindStudents();
  };

  const toggleSort = (field: string) => {
    let newDescending = true;
    if (orderBy === field) {
      newDescending = !descending;
      setDescending(newDescending);
      setOrderBy(field);
    } else {
      setOrderBy(field);
      setDescending(true);
      newDescending = true;
    }

    setCurrentPage(1);
    if (showFavoritesOnly) {
      setStudents((prev) => sortStudentsLocally(prev, field, newDescending));
      return;
    }

    fetchStudents(1, field, newDescending);
  };

  const goToNextPage = () => {
    if (currentPage >= totalPages) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchStudents(nextPage);
  };

  const goToPreviousPage = () => {
    if (currentPage <= 1) return;
    const previousPage = currentPage - 1;
    setCurrentPage(previousPage);
    fetchStudents(previousPage);
  };

  const handleFavorite = async (appId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    try {
      await addFavorite(appId);
      setFavoritedStudents((prev) => new Set(prev).add(appId.toString()));
      invalidateClientCache("user:favorites");
    } catch (error) {
      console.error("Error favoriting student:", error);
    }
  };

  const handleUnfavorite = async (
    appId: string,
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();
    try {
      await removeFavorite(appId);
      setFavoritedStudents((prev) => {
        const next = new Set(prev);
        next.delete(appId.toString());
        return next;
      });
      invalidateClientCache("user:favorites");
    } catch (error) {
      console.error("Error unfavoriting student:", error);
    }
  };

  const showFavorites = () => {
    (async () => {
      try {
        const data = await getCachedValue<StudentRecord[]>(
          "user:favorites",
          () => getFavorites<StudentRecord[]>(),
          CACHE_TTL_SHORT_MS
        );

        setStudents(sortStudentsLocally(data || [], orderBy, descending));
        const favoritedIds = new Set<string>(
          (data || [])
            .map((student: StudentRecord) => getFavoriteStudentId(student))
            .filter((id) => id.length > 0)
        );
        setFavoritedStudents(favoritedIds);
        setShowFavoritesOnly(true);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalResults(data?.length || 0);
        animateResultsRefresh();
      } catch (error) {
        console.error("Error fetching favorites:", error);
      }
    })();
  };

  const handleUpdateDatabase = async () => {
    if (isUpdatingDatabase) return;
    setIsUpdatingDatabase(true);

    try {
      await updateStudentDatabase();

      invalidateClientCacheByPrefix("misc:");
      invalidateClientCacheByPrefix("students:status:");
      invalidateClientCacheByPrefix("newsFeed:list");

      await fetchLastUpdateTime();
    } catch (error) {
      console.error("Error updating student DB:", error);
    } finally {
      setIsUpdatingDatabase(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!usahsIdQuery.trim()) return;
      setCurrentPage(1);
      fetchStudents(1);
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usahsIdQuery]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedAuthUser) return;

    fetchStudentsByStatus(["Allocated"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, hasLoadedAuthUser]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLoggedInUser();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedAuthUser || !isLcUser) {
      if (!isLcUser) {
        setLocalCoordinatorStates([]);
      }
      return;
    }

    void fetchFavoriteStatesForFilter().catch(() => setLocalCoordinatorStates([]));
  }, [fetchFavoriteStatesForFilter, hasLoadedAuthUser, isAuthenticated, isLcUser]);

  useEffect(() => {
    if (!isLcUser) return;

    setFilters((prev) => {
      const nextStatusOptions = sanitizeStatusOptions(prev.statusOptions);
      const nextStateValue = sanitizeStateFilterValue(prev.state);

      if (
        nextStatusOptions.length === prev.statusOptions.length &&
        nextStatusOptions.every((status, index) => status === prev.statusOptions[index]) &&
        nextStateValue === prev.state
      ) {
        return prev;
      }

      return {
        ...prev,
        statusOptions: nextStatusOptions,
        state: nextStateValue,
      };
    });
  }, [isLcUser, sanitizeStateFilterValue, sanitizeStatusOptions]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchFavorites = async () => {
      try {
        const data = await getCachedValue<StudentRecord[]>(
          "user:favorites",
          () => getFavorites<StudentRecord[]>(),
          CACHE_TTL_SHORT_MS
        );
        const favoritedIds = new Set<string>(
          data
            .map((student: StudentRecord) => getFavoriteStudentId(student))
            .filter((id) => id.length > 0)
        );
        setFavoritedStudents(favoritedIds);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      }
    };

    fetchFavorites();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    getCachedValue<unknown>(
      "misc:countries",
      () => getCountries(),
      CACHE_TTL_LONG_MS
    )
      .then((data) => {
        if (Array.isArray(data)) {
          setCountries(data as string[]);
        } else if (
          typeof data === "object" &&
          data !== null &&
          Array.isArray((data as { countries?: unknown[] }).countries)
        ) {
          setCountries((data as { countries: string[] }).countries);
        } else {
          setCountries([]);
        }
      })
      .catch(() => setCountries([]));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    getCachedValue<unknown[]>(
      "misc:available_now",
      () => getAvailableNow(),
      CACHE_TTL_SHORT_MS
    )
      .then((data) => {
        setAvailableNow(Number(data?.[0] ?? 0));
      })
      .catch(() => setAvailableNow(0));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    getCachedValue<unknown[]>(
      "misc:unassigned_now",
      () => getUnassignedNow(),
      CACHE_TTL_SHORT_MS
    )
      .then((data) => {
        setUnassignedNow(Number(data?.[0] ?? 0));
      })
      .catch(() => setUnassignedNow(0));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    getCachedValue<unknown>(
      "misc:placed",
      () => getPlaced(),
      CACHE_TTL_SHORT_MS
    )
      .then((data) => {
        setAlreadyPlaced(Number(data ?? 0));
      })
      .catch(() => setAlreadyPlaced(0));
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLastUpdateTime();
    }
  }, [isAuthenticated]);

  return {
    firstName,
    updateTime,
    isUpdatingDatabase,
    handleUpdateDatabase,
    query,
    setQuery,
    usahsIdQuery,
    setUsahsIdQuery,
    photoQuery,
    setPhotoQuery,
    isFilterOpen,
    setIsFilterOpen,
    filters,
    setFilters,
    countries,
    toggleStatus,
    toggleProgramType,
    toggleScholarship,
    applyFilters,
    handleSearchInputKeyDown,
    handleFindStudents,
    clearFilters,
    activeFilterCount,
    totalResults,
    viewMode,
    setViewMode,
    students,
    resultsAnimationKey,
    favoritedStudents,
    orderBy,
    descending,
    toggleSort,
    handleFavorite,
    handleUnfavorite,
    currentPage,
    totalPages,
    showFavoritesOnly,
    resultsPerPage,
    handleResultsPerPageChange,
    goToPreviousPage,
    goToNextPage,
    isSearchFiltersExpanded,
    setIsSearchFiltersExpanded,
    availableNow,
    unassignedNow,
    alreadyPlaced,
    canUpdateDatabase,
    canShowUnassigned,
    isLcUser,
    isRpmUser,
    isAdminUser,
    statusOptionsForFilter,
    stateOptionsForFilter,
    defaultStateFilterValue,
    showFavorites,
    fetchStudentsByStatus,
  };
}
