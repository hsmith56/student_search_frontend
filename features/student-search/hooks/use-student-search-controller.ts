"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import posthog from "posthog-js";
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
import { elapsedMs, logPerf, now } from "@/lib/perf-logger";

type UseStudentSearchControllerArgs = {
  isAuthenticated: boolean;
  accountTypeOverride?: string;
  hasLoadedAuthUserOverride?: boolean;
  suppressHeaderMetadataFetch?: boolean;
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
const NO_PREFERENCES_FILTER_LABEL = "No Preference + My States";
const DEFAULT_STATE_FILTER_VALUES = [
  NO_PREFERENCES_FILTER_VALUE,
  "all",
  "state_only",
  MY_STATES_FILTER_VALUE,
] as const;
const SPECIAL_STATE_FILTER_VALUES = new Set([
  ...DEFAULT_STATE_FILTER_VALUES,
  NO_PREFERENCES_FILTER_VALUE,
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

const toInterestsFilterPayload = (interests: string[]) =>
  interests.length > 0 ? interests : ["all"];

const toSearchFiltersPayload = (filters: Filters) => {
  const { urbanOnly, interests, onlyFavorites, ...remainingFilters } = filters;
  return {
    ...remainingFilters,
    interests: toInterestsFilterPayload(interests),
    urban_request: urbanOnly,
    only_favorites: onlyFavorites,
  };
};

const getActiveFilterCount = (
  filters: Filters,
  defaultStateValue = defaultFilters.state
) => {
  let count = 0;

  count += filters.country_of_origin.length;
  if (!hasSameValues(filters.interests, defaultFilters.interests)) count += 1;
  if (filters.state !== defaultStateValue) count += 1;
  if (filters.gender_male) count += 1;
  if (filters.gender_female) count += 1;
  if (filters.urbanOnly !== defaultFilters.urbanOnly) count += 1;
  if (filters.pets_in_home !== defaultFilters.pets_in_home) count += 1;
  if (filters.early_placement !== defaultFilters.early_placement) count += 1;
  if (filters.hasVideo) count += 1;
  if (filters.gpa !== defaultFilters.gpa) count += 1;
  if (filters.adjusted_age !== defaultFilters.adjusted_age) count += 1;
  if (filters.religiousPractice !== defaultFilters.religiousPractice) count += 1;
  if (filters.double_placement !== defaultFilters.double_placement) count += 1;
  if (filters.single_placement !== defaultFilters.single_placement) count += 1;
  if (filters.onlyFavorites !== defaultFilters.onlyFavorites) count += 1;

  count += filters.program_types.length;
  count += filters.grants_options.length;

  if (!hasSameValues(filters.statusOptions, defaultFilters.statusOptions)) {
    count += filters.statusOptions.length;
  }

  return count;
};

const buildFilterAnalyticsPayload = (
  filters: Filters,
  activeFilterCount: number
) => {
  return {
    active_filter_count: activeFilterCount,
    country_of_origin: filters.country_of_origin,
    interests: filters.interests,
    state: filters.state,
    gender_male: filters.gender_male,
    gender_female: filters.gender_female,
    urban_only: filters.urbanOnly,
    urban_request: filters.urbanOnly,
    pets_in_home: filters.pets_in_home,
    program_types: filters.program_types,
    early_placement: filters.early_placement,
    grants_options: filters.grants_options,
    has_video: filters.hasVideo,
    gpa: filters.gpa,
    adjusted_age: filters.adjusted_age,
    religious_practice: filters.religiousPractice,
    double_placement: filters.double_placement,
    single_placement: filters.single_placement,
    status_options: filters.statusOptions,
    only_favorites: filters.onlyFavorites,
  };
};

export function useStudentSearchController({
  isAuthenticated,
  accountTypeOverride,
  hasLoadedAuthUserOverride,
  suppressHeaderMetadataFetch = false,
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
  const hasBootstrappedInitialResults = useRef(false);
  const isLcUser = accountType.toLowerCase() === LC_ACCOUNT_TYPE;
  const isRpmUser = accountType.toLowerCase().includes("rpm");
  const isAdminUser = accountType.toLowerCase().includes("admin");
  const isRpmOrAdminUser = isRpmUser || isAdminUser;
  const defaultStateFilterValue = isLcUser
    ? NO_PREFERENCES_FILTER_VALUE
    : defaultFilters.state;
  const activeFilterCount = useMemo(
    () => getActiveFilterCount(filters, defaultStateFilterValue),
    [defaultStateFilterValue, filters]
  );
  const canShowUnassigned = hasLoadedAuthUser && !isLcUser;
  const canUpdateDatabase = hasLoadedAuthUser && !isLcUser;
  const statusOptionsForFilter = useMemo(
    () =>
      canShowUnassigned
        ? STATUS_OPTIONS
        : STATUS_OPTIONS.filter(
            (status) =>
              status.value !== UNASSIGNED_STATUS && status.value !== ALL_STATUS
          ),
    [canShowUnassigned]
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
  const allowedRpmAdminStateFilterValues = useMemo(
    () => new Set([...DEFAULT_STATE_FILTER_VALUES, ...localCoordinatorStates]),
    [localCoordinatorStates]
  );
  const stateOptionsForFilter = useMemo<StateFilterOption[]>(() => {
    const defaultStateOptions = DEFAULT_STATE_FILTER_VALUES.map((value) => {
      const matchedOption = ALL_STATE_OPTIONS.find((option) => option.value === value);
      return matchedOption ?? { value, label: value };
    });

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

    if (isRpmOrAdminUser) {
      return [...defaultStateOptions, ...coordinatorStateOptions, ...fallbackCoordinatorStateOptions];
    }

    if (!isLcUser) {
      return ALL_STATE_OPTIONS;
    }

    return [
      { value: NO_PREFERENCES_FILTER_VALUE, label: NO_PREFERENCES_FILTER_LABEL },
      { value: MY_STATES_FILTER_VALUE, label: MY_STATES_FILTER_LABEL },
      ...coordinatorStateOptions,
      ...fallbackCoordinatorStateOptions,
    ];
  }, [isLcUser, isRpmOrAdminUser, localCoordinatorStateSet, localCoordinatorStates]);
  const sanitizeStateFilterValue = useCallback(
    (stateValue: string) => {
      const normalizedStateValue = stateValue.trim();

      if (allowedLcStateFilterValues.has(normalizedStateValue)) {
        return normalizedStateValue;
      }

      if (isRpmOrAdminUser) {
        if (allowedRpmAdminStateFilterValues.has(normalizedStateValue)) {
          return normalizedStateValue;
        }

        return defaultFilters.state;
      }

      if (!isLcUser) {
        return normalizedStateValue || defaultFilters.state;
      }

      return defaultStateFilterValue;
    },
    [
      allowedLcStateFilterValues,
      allowedRpmAdminStateFilterValues,
      defaultStateFilterValue,
      isLcUser,
      isRpmOrAdminUser,
    ]
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

  const animateResultsRefresh = useCallback(() => {
    setResultsAnimationKey((prev) => prev + 1);
  }, []);

  const fetchLastUpdateTime = useCallback(async () => {
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
  }, []);

  const fetchFavoriteStatesForFilter = useCallback(async () => {
    const data = await getCachedValue<unknown>(
      "user:states",
      () => getFavoriteStates<unknown>(),
      CACHE_TTL_SHORT_MS
    );

    const parsedStateValues = parseStateValuesResponse(data);
    setLocalCoordinatorStates((prev) =>
      hasSameValues(prev, parsedStateValues) ? prev : parsedStateValues
    );
    return parsedStateValues;
  }, []);

  const resolveStateFilterValue = useCallback(
    async (stateValue: string): Promise<string[]> => {
      const sanitizedStateValue = sanitizeStateFilterValue(stateValue);

      if (sanitizedStateValue === NO_PREFERENCES_FILTER_VALUE) {
        if (localCoordinatorStates.length > 0) {
          return [NO_PREFERENCES_FILTER_VALUE, ...localCoordinatorStates];
        }

        try {
          const favoriteStates = await fetchFavoriteStatesForFilter();
          return [NO_PREFERENCES_FILTER_VALUE, ...favoriteStates];
        } catch (error) {
          console.error("Error resolving favorite states filter:", error);
          return [NO_PREFERENCES_FILTER_VALUE];
        }
      }

      if (sanitizedStateValue !== MY_STATES_FILTER_VALUE) {
        return toStateFilterPayload(sanitizedStateValue);
      }

      if (localCoordinatorStates.length > 0) {
        return localCoordinatorStates;
      }

      try {
        const favoriteStates = await fetchFavoriteStatesForFilter();
        return favoriteStates;
      } catch (error) {
        console.error("Error resolving favorite states filter:", error);
        return [];
      }
    },
    [fetchFavoriteStatesForFilter, localCoordinatorStates, sanitizeStateFilterValue]
  );

  const fetchStudents = useCallback(async (
    page = 1,
    orderByParam?: string,
    descendingParam?: boolean,
    resultsPerPageParam?: number,
    onlyFavorites = showFavoritesOnly || filters.onlyFavorites,
    filtersOverride?: Filters,
    searchOverrides?: {
      query?: string;
      usahsIdQuery?: string;
      photoQuery?: string;
    }
  ) => {
    const searchStart = now();
    const sortBy = orderByParam ?? orderBy;
    const sortDesc =
      typeof descendingParam === "boolean" ? descendingParam : descending;
    const pageSize = resultsPerPageParam ?? resultsPerPage;
    const effectiveFilters = filtersOverride ?? filters;
    const effectiveQuery = searchOverrides?.query ?? query;
    const effectiveUsahsIdQuery = searchOverrides?.usahsIdQuery ?? usahsIdQuery;
    const effectivePhotoQuery = searchOverrides?.photoQuery ?? photoQuery;
    try {
      const effectiveStatusOptions = sanitizeStatusOptions(
        effectiveFilters.statusOptions
      );
      const statusValue = effectiveStatusOptions.includes(ALL_STATUS)
        ? "allocated"
        : effectiveStatusOptions.map((status) => status.toLowerCase()).join(",");
      const stateResolutionStart = now();
      const resolvedStateValue = await resolveStateFilterValue(
        effectiveFilters.state
      );
      const stateResolutionDuration = elapsedMs(stateResolutionStart);

      const apiStart = now();
      const data = await searchStudentsApi<StudentSearchResponse>({
        page,
        pageSize,
        orderBy: sortBy,
        descending: sortDesc,
        filters: {
          ...toSearchFiltersPayload(effectiveFilters),
          state: resolvedStateValue,
          country_of_origin: getCountryFilterPayload(
            effectiveFilters.country_of_origin
          ),
          status: statusValue,
          free_text: effectiveQuery,
          usahsId: effectiveUsahsIdQuery,
          photo_search: effectivePhotoQuery,
          only_favorites: onlyFavorites,
        },
      });
      const apiDuration = elapsedMs(apiStart);
      setCurrentPage(data.page || 1);
      setTotalPages(data.total_pages || 1);
      setStudents(data.results || []);
      setTotalResults(data.total_results || data.results?.length || 0);

      logPerf("studentSearch.fetchStudents", {
        page,
        page_size: pageSize,
        results_count: data.results?.length ?? 0,
        total_results: data.total_results ?? 0,
        duration_ms: elapsedMs(searchStart),
        state_resolution_ms: stateResolutionDuration,
        api_ms: apiDuration,
        only_favorites: onlyFavorites,
      });
    } catch (error) {
      logPerf("studentSearch.fetchStudents.error", {
        page,
        page_size: pageSize,
        duration_ms: elapsedMs(searchStart),
      });
      console.error("Error:", error);
    }
  }, [
    descending,
    filters,
    orderBy,
    photoQuery,
    query,
    resolveStateFilterValue,
    resultsPerPage,
    sanitizeStatusOptions,
    showFavoritesOnly,
    usahsIdQuery,
  ]);

  const fetchStudentsWithDefaults = useCallback(async (
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
          ...toSearchFiltersPayload(defaultFilters),
          state: resolvedStateValue,
          country_of_origin: getCountryFilterPayload(defaultFilters.country_of_origin),
          status: "Allocated",
          free_text: "",
          usahsId: "",
          photo_search: "",
          only_favorites: false,
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
  }, [defaultStateFilterValue, descending, orderBy, resolveStateFilterValue, resultsPerPage, sanitizeStateFilterValue]);

  const fetchStudentsByStatus = useCallback(async (status: string[]) => {
    const statusFetchStart = now();
    const sanitizedStatus = sanitizeStatusOptions(status);
    const nextFilters = {
      ...filters,
      statusOptions: sanitizedStatus,
      onlyFavorites: false,
    };
    setCurrentPage(1);
    setShowFavoritesOnly(false);
    setFilters((prev) => {
      const sameStatusOptions =
        prev.statusOptions.length === sanitizedStatus.length &&
        prev.statusOptions.every((value, index) => value === sanitizedStatus[index]);

      if (sameStatusOptions && !prev.onlyFavorites) {
        return prev;
      }

      return { ...prev, statusOptions: sanitizedStatus, onlyFavorites: false };
    });

    try {
      const statusKey = sanitizedStatus
        .map((value) => value.toLowerCase())
        .join(",");
      const stateResolutionStart = now();
      const resolvedStateValue = await resolveStateFilterValue(nextFilters.state);
      const stateResolutionDuration = elapsedMs(stateResolutionStart);
      const resolvedStateToken = resolvedStateValue
        .map((value) => value.toLowerCase())
        .sort()
        .join(",");
      const cacheKey = `students:status:${statusKey}:state:${resolvedStateToken}:order:${orderBy}:descending:${descending}:pageSize:${resultsPerPage}:filters:${JSON.stringify(
        nextFilters
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
              ...toSearchFiltersPayload(nextFilters),
              state: resolvedStateValue,
              country_of_origin: getCountryFilterPayload(nextFilters.country_of_origin),
              statusOptions: sanitizedStatus,
              only_favorites: false,
            },
          }),
        CACHE_TTL_SHORT_MS
      );
      setStudents(data.results || []);
      setCurrentPage(data.page || 1);
      setTotalPages(data.total_pages || 1);
      setTotalResults(data.total_results || data.results?.length || 0);
      animateResultsRefresh();

      logPerf("studentSearch.fetchByStatus", {
        status: sanitizedStatus,
        results_count: data.results?.length ?? 0,
        total_results: data.total_results ?? 0,
        duration_ms: elapsedMs(statusFetchStart),
        state_resolution_ms: stateResolutionDuration,
      });
    } catch (error) {
      logPerf("studentSearch.fetchByStatus.error", {
        status: sanitizedStatus,
        duration_ms: elapsedMs(statusFetchStart),
      });
      console.error("Error:", error);
      setStudents([]);
    }
  }, [animateResultsRefresh, descending, filters, orderBy, resolveStateFilterValue, resultsPerPage, sanitizeStatusOptions]);

  const handleResultsPerPageChange = useCallback((value: number) => {
    setResultsPerPage(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(RESULTS_PER_PAGE_STORAGE_KEY, String(value));
    }

    setCurrentPage(1);
    setShowFavoritesOnly(false);
    fetchStudents(1, undefined, undefined, value);
  }, [fetchStudents]);

  const fetchLoggedInUser = useCallback(async () => {
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
  }, []);

  const clearFilters = useCallback(() => {
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
    posthog.capture("student_filters_cleared");
  }, [defaultStateFilterValue, fetchStudentsWithDefaults, sanitizeStateFilterValue]);

  const toggleProgramType = useCallback((value: string) => {
    setFilters((prev) => ({
      ...prev,
      program_types: prev.program_types.includes(value)
        ? prev.program_types.filter((item) => item !== value)
        : [...prev.program_types, value],
    }));
  }, []);

  const toggleScholarship = useCallback((value: string) => {
    setFilters((prev) => ({
      ...prev,
      grants_options: prev.grants_options.includes(value)
        ? prev.grants_options.filter((item) => item !== value)
        : [...prev.grants_options, value],
    }));
  }, []);

  const toggleStatus = useCallback((value: string) => {
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
  }, [isLcUser]);

  const handleFindStudents = useCallback((searchOverrides?: {
    query?: string;
    usahsIdQuery?: string;
    photoQuery?: string;
  }) => {
    const nextQuery = searchOverrides?.query ?? query;
    const nextUsahsIdQuery = searchOverrides?.usahsIdQuery ?? usahsIdQuery;
    const nextPhotoQuery = searchOverrides?.photoQuery ?? photoQuery;

    if (searchOverrides?.query !== undefined) {
      setQuery(searchOverrides.query);
    }
    if (searchOverrides?.usahsIdQuery !== undefined) {
      setUsahsIdQuery(searchOverrides.usahsIdQuery);
    }
    if (searchOverrides?.photoQuery !== undefined) {
      setPhotoQuery(searchOverrides.photoQuery);
    }

    setShowFavoritesOnly(false);
    setCurrentPage(1);
    fetchStudents(1, undefined, undefined, undefined, undefined, undefined, {
      query: nextQuery,
      usahsIdQuery: nextUsahsIdQuery,
      photoQuery: nextPhotoQuery,
    });
    posthog.capture("student_search_executed", {
      query: nextQuery.trim() || undefined,
      usahs_id_query: nextUsahsIdQuery.trim() || undefined,
      photo_query: nextPhotoQuery.trim() || undefined,
      ...buildFilterAnalyticsPayload(filters, activeFilterCount),
    });
  }, [activeFilterCount, fetchStudents, filters, photoQuery, query, usahsIdQuery]);

  const applyFilters = useCallback(() => {
    setShowFavoritesOnly(false);
    setCurrentPage(1);
    fetchStudents(1);
    setIsFilterOpen(false);
    posthog.capture(
      "student_filters_applied",
      buildFilterAnalyticsPayload(filters, activeFilterCount)
    );
  }, [activeFilterCount, fetchStudents, filters]);

  const toggleSort = useCallback((field: string) => {
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
  }, [descending, fetchStudents, orderBy, setDescending, setOrderBy, showFavoritesOnly]);

  const goToNextPage = useCallback(() => {
    if (currentPage >= totalPages) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchStudents(nextPage);
  }, [currentPage, fetchStudents, totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage <= 1) return;
    const previousPage = currentPage - 1;
    setCurrentPage(previousPage);
    fetchStudents(previousPage);
  }, [currentPage, fetchStudents]);

  const handleFavorite = useCallback(async (appId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    try {
      await addFavorite(appId);
      setFavoritedStudents((prev) => new Set(prev).add(appId.toString()));
      invalidateClientCache("user:favorites");
      posthog.capture("student_favorited", { app_id: appId });
    } catch (error) {
      console.error("Error favoriting student:", error);
    }
  }, []);

  const handleUnfavorite = useCallback(async (
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
      posthog.capture("student_unfavorited", { app_id: appId });
    } catch (error) {
      console.error("Error unfavoriting student:", error);
    }
  }, []);

  const showFavorites = useCallback(() => {
    const nextFilters = {
      ...filters,
      onlyFavorites: true,
      statusOptions: [ALL_STATUS],
    };
    setFilters(nextFilters);
    setShowFavoritesOnly(true);
    setCurrentPage(1);
    void fetchStudents(1, undefined, undefined, undefined, true, nextFilters);
    posthog.capture("favorites_viewed");
  }, [fetchStudents, filters]);

  const handleUpdateDatabase = useCallback(async () => {
    if (isUpdatingDatabase) return;
    setIsUpdatingDatabase(true);

    try {
      await updateStudentDatabase();

      invalidateClientCacheByPrefix("misc:");
      invalidateClientCacheByPrefix("students:status:");
      invalidateClientCacheByPrefix("newsFeed:list");

      await fetchLastUpdateTime();
      posthog.capture("database_update_triggered");
    } catch (error) {
      console.error("Error updating student DB:", error);
      posthog.captureException(error);
    } finally {
      setIsUpdatingDatabase(false);
    }
  }, [fetchLastUpdateTime, isUpdatingDatabase]);

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
    if (!isAuthenticated || !hasLoadedAuthUser || hasBootstrappedInitialResults.current) {
      return;
    }

    let cancelled = false;

    const bootstrapInitialResults = async () => {
      const shouldLoadPreferredStates = isLcUser || isRpmOrAdminUser;

      if (shouldLoadPreferredStates && localCoordinatorStates.length === 0) {
        try {
          await fetchFavoriteStatesForFilter();
        } catch {
          // no-op: initial students fetch can proceed without preferred states
        }
      }

      if (cancelled) return;

      hasBootstrappedInitialResults.current = true;
      await fetchStudentsByStatus(["Allocated"]);
    };

    void bootstrapInitialResults();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fetchFavoriteStatesForFilter,
    hasLoadedAuthUser,
    isAuthenticated,
    isLcUser,
    isRpmOrAdminUser,
    localCoordinatorStates.length,
  ]);

  useEffect(() => {
    if (typeof hasLoadedAuthUserOverride === "boolean") {
      if (!hasLoadedAuthUserOverride) {
        setHasLoadedAuthUser(false);
        return;
      }

      setAccountType(accountTypeOverride ?? "");
      setHasLoadedAuthUser(true);
      return;
    }

    if (isAuthenticated) {
      fetchLoggedInUser();
    }
  }, [accountTypeOverride, fetchLoggedInUser, hasLoadedAuthUserOverride, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      hasBootstrappedInitialResults.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const shouldLoadPreferredStates = isLcUser || isRpmOrAdminUser;
    if (!isAuthenticated || !hasLoadedAuthUser || !shouldLoadPreferredStates) {
      if (!shouldLoadPreferredStates) {
        setLocalCoordinatorStates([]);
      }
      return;
    }

    void fetchFavoriteStatesForFilter().catch(() => setLocalCoordinatorStates([]));
  }, [
    fetchFavoriteStatesForFilter,
    hasLoadedAuthUser,
    isAuthenticated,
    isLcUser,
    isRpmOrAdminUser,
  ]);

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
    if (!isRpmOrAdminUser || isLcUser) return;

    setFilters((prev) => {
      const nextStateValue = sanitizeStateFilterValue(prev.state);
      if (nextStateValue === prev.state) {
        return prev;
      }

      return {
        ...prev,
        state: nextStateValue,
      };
    });
  }, [isLcUser, isRpmOrAdminUser, sanitizeStateFilterValue]);

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
    if (!suppressHeaderMetadataFetch && isAuthenticated) {
      fetchLastUpdateTime();
    }
  }, [fetchLastUpdateTime, isAuthenticated, suppressHeaderMetadataFetch]);

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
