"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  API_URL,
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
import { useSelectedStudentMedia } from "@/features/student-search/hooks/use-selected-student-media";
import { useStudentSearchPreferences } from "@/features/student-search/hooks/use-student-search-preferences";
import {
  getCachedValue,
  invalidateClientCache,
  invalidateClientCacheByPrefix,
} from "@/lib/client-cache";

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

export function useStudentSearchController({
  isAuthenticated,
}: UseStudentSearchControllerArgs) {
  const [query, setQuery] = useState("");
  const [updateTime, setUpdateTime] = useState("");
  const [isUpdatingDatabase, setIsUpdatingDatabase] = useState(false);
  const [usahsIdQuery, setUsahsIdQuery] = useState("");
  const [photoQuery, setPhotoQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isProgramTypeOpen, setIsProgramTypeOpen] = useState(false);
  const [isScholarshipOpen, setIsScholarshipOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [hasLoadedAuthUser, setHasLoadedAuthUser] = useState(false);

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(
    null
  );
  const selectedStudentMediaLink = useSelectedStudentMedia(selectedStudent);

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
  const isLcUser = accountType.toLowerCase() === LC_ACCOUNT_TYPE;
  const canShowUnassigned = hasLoadedAuthUser && !isLcUser;
  const canUpdateDatabase = hasLoadedAuthUser && !isLcUser;
  const statusOptionsForFilter = canShowUnassigned
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.filter(
        (status) =>
          status.value !== UNASSIGNED_STATUS && status.value !== ALL_STATUS
      );

  const sanitizeStatusOptions = (statusOptions: string[]) => {
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
  };

  const getHeaders = () => ({
    "Content-Type": "application/json",
  });

  const animateResultsRefresh = () => {
    setResultsAnimationKey((prev) => prev + 1);
  };

  const fetchLastUpdateTime = async () => {
    try {
      const data = await getCachedValue<unknown[]>(
        "misc:last_update_time",
        async () => {
          const response = await fetch(`${API_URL}/misc/last_update_time`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch last update time: ${response.status}`);
          }

          return (await response.json()) as unknown[];
        },
        CACHE_TTL_SHORT_MS
      );
      setUpdateTime(Array.isArray(data) ? (data?.[0] as string) ?? "" : "");
    } catch {
      setUpdateTime("");
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

      const response = await fetch(
        `${API_URL}/students/search?page=${page}&page_size=${pageSize}&order_by=${sortBy}&descending=${sortDesc}`,
        {
          method: "POST",
          headers: getHeaders(),
          credentials: "include",
          body: JSON.stringify({
            ...filters,
            status: statusValue,
            free_text: query,
            usahsId: usahsIdQuery,
            photo_search: photoQuery,
          }),
        }
      );

      const data = await response.json();
      setCurrentPage(data.page || 1);
      setTotalPages(data.total_pages || 1);
      setStudents(data.results || []);
      setTotalResults(data.total_results || data.results?.length || 0);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchStudentsWithDefaults = async () => {
    try {
      const response = await fetch(
        `${API_URL}/students/search?page=1&page_size=${resultsPerPage}&order_by=${orderBy}&descending=${descending}`,
        {
          method: "POST",
          headers: getHeaders(),
          credentials: "include",
          body: JSON.stringify({
            ...defaultFilters,
            status: "Allocated",
            free_text: "",
            usahsId: "",
            photo_search: "",
            order_by: orderBy,
            descending,
          }),
        }
      );

      const data = await response.json();
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
      const cacheKey = `students:status:${statusKey}:order:${orderBy}:descending:${descending}:pageSize:${resultsPerPage}:filters:${JSON.stringify(
        filters
      )}`;
      const data = await getCachedValue<{
        results?: StudentRecord[];
        page?: number;
        total_pages?: number;
        total_results?: number;
      }>(
        cacheKey,
        async () => {
          const response = await fetch(
            `${API_URL}/students/search?page=1&page_size=${resultsPerPage}&order_by=${orderBy}&descending=${descending}`,
            {
              method: "POST",
              headers: getHeaders(),
              credentials: "include",
              body: JSON.stringify({
                ...filters,
                statusOptions: sanitizedStatus,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch students by status: ${response.status}`);
          }

          return (await response.json()) as {
            results?: StudentRecord[];
            page?: number;
            total_pages?: number;
            total_results?: number;
          };
        },
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
        async () => {
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: getHeaders(),
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
    setFilters(defaultFilters);
    setQuery("");
    setUsahsIdQuery("");
    setPhotoQuery("");
    setCurrentPage(1);
    setShowFavoritesOnly(false);
    fetchStudentsWithDefaults();
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
      const response = await fetch(
        `${API_URL}/user/favorites?app_id=${appId.toString()}`,
        {
          method: "PATCH",
          headers: { accept: "application/json" },
          credentials: "include",
        }
      );

      if (response.ok) {
        setFavoritedStudents((prev) => new Set(prev).add(appId.toString()));
        invalidateClientCache("user:favorites");
      }
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
      const response = await fetch(
        `${API_URL}/user/favorites?app_id=${appId.toString()}`,
        {
          method: "DELETE",
          headers: { accept: "application/json" },
          credentials: "include",
        }
      );

      if (response.ok) {
        setFavoritedStudents((prev) => {
          const next = new Set(prev);
          next.delete(appId.toString());
          return next;
        });
        invalidateClientCache("user:favorites");
      }
    } catch (error) {
      console.error("Error unfavoriting student:", error);
    }
  };

  const showFavorites = () => {
    (async () => {
      try {
        const data = await getCachedValue<StudentRecord[]>(
          "user:favorites",
          async () => {
            const response = await fetch(`${API_URL}/user/favorites`, {
              method: "GET",
              headers: { accept: "application/json" },
              credentials: "include",
            });

            if (!response.ok) {
              throw new Error(`Failed to fetch favorites: ${response.status}`);
            }

            return (await response.json()) as StudentRecord[];
          },
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
      const response = await fetch(`${API_URL}/students/update_db`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to update DB: ${response.status}`);
      }

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
    if (isAuthenticated) {
      fetchStudentsByStatus(["Allocated"]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLoggedInUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isLcUser) return;

    setFilters((prev) => {
      const nextStatusOptions = sanitizeStatusOptions(prev.statusOptions);

      if (
        nextStatusOptions.length === prev.statusOptions.length &&
        nextStatusOptions.every((status, index) => status === prev.statusOptions[index])
      ) {
        return prev;
      }

      return {
        ...prev,
        statusOptions: nextStatusOptions,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLcUser]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchFavorites = async () => {
      try {
        const data = await getCachedValue<StudentRecord[]>(
          "user:favorites",
          async () => {
            const response = await fetch(`${API_URL}/user/favorites`, {
              method: "GET",
              headers: { accept: "application/json" },
              credentials: "include",
            });

            if (!response.ok) {
              throw new Error(`Failed to fetch favorites: ${response.status}`);
            }

            return (await response.json()) as StudentRecord[];
          },
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
      async () => {
        const response = await fetch(`${API_URL}/misc/countries`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch countries: ${response.status}`);
        }

        return (await response.json()) as unknown;
      },
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
      async () => {
        const response = await fetch(`${API_URL}/misc/available_now`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch available_now: ${response.status}`);
        }

        return (await response.json()) as unknown[];
      },
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
      async () => {
        const response = await fetch(`${API_URL}/misc/unassigned_now`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch unassigned_now: ${response.status}`);
        }

        return (await response.json()) as unknown[];
      },
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
      async () => {
        const response = await fetch(`${API_URL}/misc/placed`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch placed count: ${response.status}`);
        }

        return (await response.json()) as unknown;
      },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    isProgramTypeOpen,
    setIsProgramTypeOpen,
    isScholarshipOpen,
    setIsScholarshipOpen,
    isStatusOpen,
    setIsStatusOpen,
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
    totalResults,
    viewMode,
    setViewMode,
    students,
    resultsAnimationKey,
    favoritedStudents,
    orderBy,
    descending,
    toggleSort,
    selectedStudent,
    setSelectedStudent,
    selectedStudentMediaLink,
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
    statusOptionsForFilter,
    showFavorites,
    fetchStudentsByStatus,
  };
}
