"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { API_URL } from "@/features/student-search/constants";
import {
  defaultFilters,
  type Filters,
  type StudentRecord,
} from "@/features/student-search/types";
import { sortStudentsLocally } from "@/features/student-search/utils";
import { useSelectedStudentMedia } from "@/features/student-search/hooks/use-selected-student-media";
import { useStudentSearchPreferences } from "@/features/student-search/hooks/use-student-search-preferences";

type UseStudentSearchControllerArgs = {
  isAuthenticated: boolean;
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
  const [isProgramTypeOpen, setIsProgramTypeOpen] = useState(false);
  const [isScholarshipOpen, setIsScholarshipOpen] = useState(false);
  const [firstName, setFirstName] = useState("");

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(
    null
  );
  const selectedStudentMediaLink = useSelectedStudentMedia(selectedStudent);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

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

  const getHeaders = () => ({
    "Content-Type": "application/json",
  });

  const animateResultsRefresh = () => {
    setResultsAnimationKey((prev) => prev + 1);
  };

  const fetchLastUpdateTime = async () => {
    try {
      const response = await fetch(`${API_URL}/misc/last_update_time`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const data = await response.json();
      setUpdateTime(data?.[0] ?? "");
    } catch {
      setUpdateTime("");
    }
  };

  const fetchStudents = async (
    page = 1,
    orderByParam?: string,
    descendingParam?: boolean
  ) => {
    const sortBy = orderByParam ?? orderBy;
    const sortDesc =
      typeof descendingParam === "boolean" ? descendingParam : descending;
    try {
      const statusValue = filters.statusOptions.includes("All")
        ? "allocated"
        : filters.statusOptions.map((status) => status.toLowerCase()).join(",");

      const response = await fetch(
        `${API_URL}/students/search?page=${page}&page_size=15&order_by=${sortBy}&descending=${sortDesc}`,
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
        `${API_URL}/students/search?page=1&page_size=15&order_by=${orderBy}&descending=${descending}`,
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
    setCurrentPage(1);
    setShowFavoritesOnly(false);
    setFilters((prev) => ({
      ...prev,
      statusOptions: status,
    }));

    try {
      const response = await fetch(
        `${API_URL}/students/search?page=1&page_size=15&order_by=${orderBy}&descending=${descending}`,
        {
          method: "POST",
          headers: getHeaders(),
          credentials: "include",
          body: JSON.stringify({
            ...filters,
            statusOptions: status,
          }),
        }
      );

      const data = await response.json();
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

  const fetchLoggedInUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: getHeaders(),
        credentials: "include",
      });
      const data = await response.json();
      setFirstName(data.first_name);
    } catch (error) {
      console.error("Error:", error);
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
    setFilters((prev) => {
      if (value === "All") {
        return { ...prev, statusOptions: ["All"] };
      }

      let newStatusOptions = prev.statusOptions.filter((item) => item !== "All");

      if (newStatusOptions.includes(value)) {
        newStatusOptions = newStatusOptions.filter((item) => item !== value);
      } else {
        newStatusOptions = [...newStatusOptions, value];
      }

      if (newStatusOptions.length === 0) {
        newStatusOptions = ["All"];
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

  const handleFavorite = async (paxId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    try {
      const response = await fetch(
        `${API_URL}/user/favorites?pax_id=${paxId.toString()}`,
        {
          method: "PATCH",
          headers: { accept: "application/json" },
          credentials: "include",
        }
      );

      if (response.ok) {
        setFavoritedStudents((prev) => new Set(prev).add(paxId.toString()));
      }
    } catch (error) {
      console.error("Error favoriting student:", error);
    }
  };

  const handleUnfavorite = async (
    paxId: string,
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();
    try {
      const response = await fetch(
        `${API_URL}/user/favorites?pax_id=${paxId.toString()}`,
        {
          method: "DELETE",
          headers: { accept: "application/json" },
          credentials: "include",
        }
      );

      if (response.ok) {
        setFavoritedStudents((prev) => {
          const next = new Set(prev);
          next.delete(paxId.toString());
          return next;
        });
      }
    } catch (error) {
      console.error("Error unfavoriting student:", error);
    }
  };

  const showFavorites = () => {
    (async () => {
      try {
        const response = await fetch(`${API_URL}/user/favorites`, {
          method: "GET",
          headers: { accept: "application/json" },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setStudents(sortStudentsLocally(data || [], orderBy, descending));
          const favoritedIds = new Set<string>(
            (data || []).map((student: StudentRecord) =>
              String(student.pax_id.toString())
            )
          );
          setFavoritedStudents(favoritedIds);
          setShowFavoritesOnly(true);
          setCurrentPage(1);
          setTotalPages(1);
          setTotalResults(data?.length || 0);
          animateResultsRefresh();
        }
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
        method: "GET",
        headers: getHeaders(),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to update DB: ${response.status}`);
      }

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
    if (!isAuthenticated) return;

    const fetchFavorites = async () => {
      try {
        const response = await fetch(`${API_URL}/user/favorites`, {
          method: "GET",
          headers: { accept: "application/json" },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          const favoritedIds = new Set<string>(
            data.map((student: StudentRecord) => String(student.pax_id))
          );
          setFavoritedStudents(favoritedIds);
        }
      } catch (error) {
        console.error("Error fetching favorites:", error);
      }
    };

    fetchFavorites();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetch(`${API_URL}/misc/countries`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCountries(data);
        } else if (Array.isArray(data.countries)) {
          setCountries(data.countries);
        } else {
          setCountries([]);
        }
      })
      .catch(() => setCountries([]));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetch(`${API_URL}/misc/available_now`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setAvailableNow(data[0]);
      })
      .catch(() => setAvailableNow(0));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetch(`${API_URL}/misc/unassigned_now`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setUnassignedNow(data[0]);
      })
      .catch(() => setUnassignedNow(0));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetch(`${API_URL}/misc/placed`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setAlreadyPlaced(data);
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
    goToPreviousPage,
    goToNextPage,
    isSearchFiltersExpanded,
    setIsSearchFiltersExpanded,
    availableNow,
    unassignedNow,
    alreadyPlaced,
    showFavorites,
    fetchStudentsByStatus,
  };
}
