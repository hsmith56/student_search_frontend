"use client";

import type React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { states } from "@/components/search/states";
import { interests } from "@/components/search/interests";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";
import {
  Search,
  GraduationCap,
  Star,
  MapPin,
  Calendar,
  Award,
  SlidersHorizontal,
  ChevronRight,
  Users,
  UserCheck as UserLock,
  CheckCircle2,
  Camera,
  ChevronLeft,
  RotateCcw,
  Heart,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const API_URL = "/api";
const ORDER_BY_STORAGE_KEY = "studentSearch.orderBy";
const DESCENDING_STORAGE_KEY = "studentSearch.descending";

export default function SearchInterface() {
  const { isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [updateTime, setUpdateTime] = useState("");
  const [isUpdatingDatabase, setIsUpdatingDatabase] = useState(false);
  const [usahsIdQuery, setUsahsIdQuery] = useState("");
  const [photoQuery, setPhotoQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isprogram_typeOpen, setIsprogram_typeOpen] = useState(false);
  const [isScholarshipOpen, setIsScholarshipOpen] = useState(false);
  const [firstName, setFirstName] = useState("");

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [favoritedStudents, setFavoritedStudents] = useState<Set<string>>(
    new Set()
  );
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [viewMode, setViewMode] = useState<"card" | "compact">(() => {
    // Default: mobile -> card view, desktop -> compact view
    if (typeof window === "undefined") return "compact";
    return window.innerWidth >= 768 ? "compact" : "card";
  });
  const [totalResults, setTotalResults] = useState<number>(0);
  const [orderBy, setOrderBy] = useState<string>(() => {
    if (typeof window === "undefined") return "adjusted_age";
    return localStorage.getItem(ORDER_BY_STORAGE_KEY) || "adjusted_age";
  });
  const [descending, setDescending] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(DESCENDING_STORAGE_KEY);
    if (stored === null) return true;
    return stored === "true";
  });

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [isSearchFiltersExpanded, setIsSearchFiltersExpanded] = useState(true);
  const [resultsAnimationKey, setResultsAnimationKey] = useState(0);

  type Filters = {
    country_of_origin: string;
    interests: string;
    state: string;
    gender_male: boolean;
    gender_female: boolean;
    pets_in_home: string;
    program_types: string[];
    early_placement: string;
    grants_options: string[];
    hasVideo: boolean;
    gpa: string;
    adjusted_age: string;
    religiousPractice: string;
    double_placement: string;
    single_placement: string;
    status?: string;
    statusOptions: string[];
  };

  const defaultFilters: Filters = {
    country_of_origin: "all",
    interests: "all",
    state: "all",
    gender_male: false,
    gender_female: false,
    pets_in_home: "all",
    program_types: [],
    early_placement: "all",
    grants_options: [],
    hasVideo: false,
    gpa: "all",
    adjusted_age: "all",
    religiousPractice: "all",
    double_placement: "all",
    single_placement: "all",
    statusOptions: ["Allocated"],
  };

  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const [students, setStudents] = useState<any[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [unassignedNow, setUnassignedNow] = useState<number>(0);
  const [availableNow, setAvailableNow] = useState<number>(0);
  const [alreadyPlaced, set_alreadyPlaced] = useState<number>(0);
  const FilterCheckbox = (props: React.ComponentProps<typeof Checkbox>) => (
    <Checkbox
      className="size-5 border-slate-500 bg-white shadow-sm data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white focus-visible:ring-blue-300/70"
      {...props}
    />
  );

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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (usahsIdQuery.trim()) {
        setCurrentPage(1);
        fetchStudents(1);
      }
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
    if (isAuthenticated) {
      const fetchFavorites = async () => {
        try {
          const response = await fetch(`${API_URL}/user/favorites`, {
            method: "GET",
            headers: {
              accept: "application/json",
            },
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            const favoritedIds = new Set<string>(
              data.map((student: any) => String(student.pax_id))
            );
            setFavoritedStudents(favoritedIds);
          }
        } catch (error) {
          console.error("Error fetching favorites:", error);
        }
      };

      fetchFavorites();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
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
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
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
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
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
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetch(`${API_URL}/misc/placed`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          set_alreadyPlaced(data);
        })
        .catch(() => set_alreadyPlaced(0));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLastUpdateTime();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ORDER_BY_STORAGE_KEY, orderBy);
    localStorage.setItem(DESCENDING_STORAGE_KEY, String(descending));
  }, [orderBy, descending]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const toggleprogram_type = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      program_types: prev.program_types.includes(value)
        ? prev.program_types.filter((v) => v !== value)
        : [...prev.program_types, value],
    }));
  };

  const toggleScholarship = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      grants_options: prev.grants_options.includes(value)
        ? prev.grants_options.filter((v) => v !== value)
        : [...prev.grants_options, value],
    }));
  };

  const toggleStatus = (value: string) => {
    setFilters((prev) => {
      if (value === "All") {
        return { ...prev, statusOptions: ["All"] };
      }

      let newStatusOptions = prev.statusOptions.filter((v) => v !== "All");

      if (newStatusOptions.includes(value)) {
        newStatusOptions = newStatusOptions.filter((v) => v !== value);
      } else {
        newStatusOptions = [...newStatusOptions, value];
      }

      if (newStatusOptions.length === 0) {
        newStatusOptions = ["All"];
      }

      return { ...prev, statusOptions: newStatusOptions };
    });
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

  const getHeaders = () => ({
    "Content-Type": "application/json",
  });

  const fetchStudentsWithDefaults = async () => {
    try {
      const response = await fetch(
        `${API_URL}/students/search?page=1&page_size=15&order_by=${orderBy}&descending=${descending}`,
        {
          method: "POST",
          headers: getHeaders(),
          credentials: "include", // Add credentials for cookies
          body: JSON.stringify({
            ...defaultFilters,
            status: "Allocated",
            free_text: "",
            usahsId: "",
            photo_search: "",
            order_by: orderBy,
            descending: descending,
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

  const fetchStudents = async (
    page = 1,
    orderByParam?: string,
    descendingParam?: boolean
  ) => {
    const ob = orderByParam ?? orderBy;
    const desc =
      typeof descendingParam === "boolean" ? descendingParam : descending;
    try {
      const statusValue = filters.statusOptions.includes("All")
        ? "allocated"
        : filters.statusOptions.map((s) => s.toLowerCase()).join(",");

      const response = await fetch(
        `${API_URL}/students/search?page=${page}&page_size=15&order_by=${ob}&descending=${desc}`,
        {
          method: "POST",
          headers: getHeaders(),
          credentials: "include", // Add credentials for cookies
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

  const handleFindStudents = () => {
    setShowFavoritesOnly(false);
    setCurrentPage(1);
    fetchStudents(1);
  };

  const handleSearchInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleFindStudents();
  };

  const animateResultsRefresh = () => {
    setResultsAnimationKey((prev) => prev + 1);
  };

  const sortStudentsLocally = (
    list: any[],
    field: string,
    isDescending: boolean
  ) => {
    const getSortValue = (student: any) => {
      switch (field) {
        case "first_name":
          return student.first_name ?? "";
        case "country":
          return student.country ?? "";
        case "gpa":
          return Number(student.gpa);
        case "adjusted_age":
          return Number(student.adjusted_age);
        case "placement_status":
          return student.placement_status ?? "";
        default:
          return student?.[field] ?? "";
      }
    };

    return [...list].sort((a, b) => {
      const av = getSortValue(a);
      const bv = getSortValue(b);

      let comparison = 0;
      if (typeof av === "number" && typeof bv === "number") {
        const an = Number.isNaN(av) ? Number.NEGATIVE_INFINITY : av;
        const bn = Number.isNaN(bv) ? Number.NEGATIVE_INFINITY : bv;
        comparison = an - bn;
      } else {
        comparison = String(av).localeCompare(String(bv), undefined, {
          sensitivity: "base",
          numeric: true,
        });
      }

      return isDescending ? -comparison : comparison;
    });
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

    // fetch page 1 with new sort immediately (pass values so fetch uses them)
    fetchStudents(1, field, newDescending);
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
          credentials: "include", // Add credentials for cookies
          body: JSON.stringify({
            ...filters,
            statusOptions: status,
          }),
        }
      );

      toggleStatus("All"); // set toggle to All to clear previous filter options, then iteratively set the correct ones
      status.forEach((stat) => {
        toggleStatus(stat);
      });

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

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchStudents(nextPage);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      fetchStudents(prevPage);
    }
  };

  const handleFavorite = async (pax_id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const response = await fetch(
        `${API_URL}/user/favorites?pax_id=${pax_id.toString()}`,
        {
          method: "PATCH",
          headers: {
            accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (response.ok) {
        setFavoritedStudents((prev) => new Set(prev).add(pax_id.toString()));
      }
    } catch (error) {
      console.error("Error favoriting student:", error);
    }
  };

  const handleUnfavorite = async (pax_id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const response = await fetch(
        `${API_URL}/user/favorites?pax_id=${pax_id.toString()}`,
        {
          method: "DELETE",
          headers: {
            accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (response.ok) {
        setFavoritedStudents((prev) => {
          const newSet = new Set(prev);
          newSet.delete(pax_id.toString());
          return newSet;
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
          headers: {
            accept: "application/json",
          },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setStudents(sortStudentsLocally(data || [], orderBy, descending));
          const favoritedIds = new Set<string>(
            (data || []).map((s: any) => String(s.pax_id.toString()))
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

  const submitFeedback = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedComment = feedbackComment.trim();
    if (!trimmedComment) {
      setFeedbackError("Please enter feedback before submitting.");
      setFeedbackSuccess(null);
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      const response = await fetch(`${API_URL}/feedback/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          comment: trimmedComment,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      setFeedbackComment("");
      setFeedbackSuccess("Feedback submitted. Thank you.");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setFeedbackError("Unable to submit feedback right now. Please try again.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const openFeedbackDialog = () => {
    setIsFeedbackOpen(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);
  };

  const displayedStudents = students;
  const shouldAnimateResults = resultsAnimationKey > 0;

  const getStatusRingColor = (status: string) => {
    if (!status) return "border-slate-300";

    const statusLower = status.toLowerCase();
    if (statusLower.includes("pending")) return "border-yellow-200 ";
    if (statusLower.includes("placed"))
      return "border-green-500 rounded-md p-4";
    if (statusLower === "allocated") return "border-blue-500 bg-white";
    if (statusLower === "unassigned") return "border-slate-500 bg-slate-300 ";

    return "border-slate-300";
  };

  const formatGender = (genderValue: unknown) => {
    const rawValue = Array.isArray(genderValue) ? genderValue[0] : genderValue;
    const normalized = String(rawValue ?? "").trim().toLowerCase();

    if (!normalized) return "-";
    if (normalized.startsWith("m")) return "Male";
    if (normalized.startsWith("f")) return "Female";

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const fetchLoggedInUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: getHeaders(),
        credentials: "include", // Add credentials for cookies
      });

      const data = await response.json();
      setFirstName(data["first_name"]);
    } catch (error) {
      console.error("Error:", error);
    }
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

  const quickStatsCards = [
    {
      label: "Available Now",
      value: availableNow,
      icon: Users,
      iconClass: "text-sky-700",
      cardClass: "border-sky-200/80 bg-white/95 hover:border-sky-300/90",
      onClick: () => fetchStudentsByStatus(["Allocated"]),
    },
    {
      label: "Unassigned",
      value: unassignedNow,
      icon: UserLock,
      iconClass: "text-slate-600",
      cardClass: "border-slate-300/80 bg-white/95 hover:border-slate-400/90",
      onClick: () => fetchStudentsByStatus(["Unassigned"]),
    },
    {
      label: "Students Placed",
      value: alreadyPlaced,
      icon: CheckCircle2,
      iconClass: "text-emerald-700",
      cardClass: "border-emerald-200/80 bg-white/95 hover:border-emerald-300/90",
      onClick: () => fetchStudentsByStatus(["Placed", "Pending"]),
    },
    {
      label: "My Favorites",
      value: favoritedStudents.size,
      icon: Heart,
      iconClass: "text-rose-700",
      cardClass: "border-rose-200/80 bg-white/95 hover:border-rose-300/90",
      onClick: showFavorites,
    },
  ];

  const searchTips = [
    "Photo search looks for keywords in the photo comment section.",
    "Click the heart on a profile card to add it to favorites.",
    "Select any student card to open detailed profile information.",
  ];

  return (
    <div className="min-h-screen bg-gray-200 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-br from-blue-300/12 to-indigo-300/12 rounded-full blur-3xl" /> */}
        {/* <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-violet-500/10 to-blue-500/10 rounded-full blur-3xl" /> */}
        {/* <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/8 to-purple-500/8 rounded-full blur-3xl" /> */}
      </div>

      <div className="relative z-10">
        <Header
          firstName={firstName}
          onLogout={logout}
          updateTime={updateTime}
          onUpdateDatabase={handleUpdateDatabase}
          isUpdatingDatabase={isUpdatingDatabase}
        />

        <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-10 py-5">
          <div className="mx-auto w-full max-w-[1900px]">
            <section className="mb-4">
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                {quickStatsCards.map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    onClick={card.onClick}
                    className={`group min-h-[148px] rounded-xl border p-4 text-left shadow-[0_5px_14px_-12px_rgba(15,23,42,0.75)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-20px_rgba(15,23,42,0.85)] ${card.cardClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {card.label}
                      </p>
                      <card.icon className={`h-[18px] w-[18px] ${card.iconClass}`} />
                    </div>
                    <p className="mt-7 text-[2rem] font-semibold leading-none text-slate-900">
                      {card.value}
                    </p>
                    <p className="mt-5 text-[11px] font-medium text-slate-500 group-hover:text-slate-700">
                      View list
                    </p>
                  </button>
                ))}

                <div className="flex min-h-[148px] flex-col rounded-xl border border-slate-300/90 bg-white/95 p-4 shadow-[0_5px_14px_-12px_rgba(15,23,42,0.75)]">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Star className="h-4 w-4 text-slate-700" />
                    Tips & Feedback
                  </h3>
                  <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700">
                    {searchTips.slice(0, 2).map((tip) => (
                      <li key={tip} className="flex items-start gap-2">
                        <span className="mt-[7px] block h-1 w-1 flex-shrink-0 rounded-full bg-slate-500" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={openFeedbackDialog}
                    className="mt-auto h-9 w-full bg-slate-900 text-sm text-white hover:bg-slate-800"
                  >
                    Open feedback form
                  </Button>
                </div>
              </div>
            </section>

            <div className="sticky top-[60px] bg-white/90 backdrop-blur-xl z-40 rounded-xl shadow-lg shadow-slate-900/5 border border-black-200/60 mb-3 overflow-hidden">
                <button
                  onClick={() =>
                    setIsSearchFiltersExpanded(!isSearchFiltersExpanded)
                  }
                  className="xl:hidden w-full flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
                >
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-600" />
                    Search & Filters
                  </h3>
                  {isSearchFiltersExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                <div
                  className={`${
                    isSearchFiltersExpanded ? "block" : "hidden"
                  } xl:block p-4 ${
                    isSearchFiltersExpanded
                      ? "border-t border-slate-200 xl:border-t-0"
                      : ""
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Free Text Search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleSearchInputKeyDown}
                        className="pl-9 h-10 text-slate-700 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
                      />
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="usahsId Search"
                        value={usahsIdQuery}
                        onChange={(e) => setUsahsIdQuery(e.target.value)}
                        onKeyDown={handleSearchInputKeyDown}
                        className="pl-9 h-10 text-slate-700 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
                      />
                    </div>
                    <div className="relative">
                      <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Photo Search"
                        value={photoQuery}
                        onChange={(e) => setPhotoQuery(e.target.value)}
                        onKeyDown={handleSearchInputKeyDown}
                        className="pl-9 h-10 text-slate-700 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
                    <Button
                      onClick={() => setIsFilterOpen(true)}
                      variant="outline"
                      className="h-10 border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 font-medium transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      Filters
                    </Button>
                    <Button
                      onClick={handleFindStudents}
                      className="flex-1 h-10 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-600/25 hover:shadow-lg hover:shadow-orange-600/30 transition-all duration-200 font-semibold whitespace-nowrap"
                    >
                      Find Students
                    </Button>
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                      className="h-10 border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-medium transition-all duration-200 flex items-center justify-center gap-2 bg-transparent whitespace-nowrap flex-shrink-0"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Clear Filters
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-600">
                      <span className="font-bold text-slate-900">
                        {totalResults}
                      </span>{" "}
                      results found
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600">
                        View:
                      </span>
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        <button
                          onClick={() => setViewMode("card")}
                          className={`p-1.5 rounded transition-all duration-200 ${
                            viewMode === "card"
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                          title="Card View"
                        >
                          <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode("compact")}
                          className={`p-1.5 rounded transition-all duration-200 ${
                            viewMode === "compact"
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                          title="Compact View"
                        >
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {viewMode === "card" ? (
                <div
                  key={`card-results-${resultsAnimationKey}`}
                  className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8 ${
                    shouldAnimateResults ? "results-refresh-container" : ""
                  }`}
                >
                  {displayedStudents.map((student, index) => (
                    <div
                      key={student.pax_id.toString()}
                      onClick={() => {
                        setSelectedStudent(student);
                      }}
                      style={
                        shouldAnimateResults
                          ? ({ "--results-item-index": index } as React.CSSProperties)
                          : undefined
                      }
                      className={`group cursor-pointer border-2 ${getStatusRingColor(
                        student.placement_status
                      )} rounded-xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all duration-200 relative ${
                        shouldAnimateResults ? "results-refresh-item" : ""
                      }`}
                    >
                      <button
                        onClick={(e) =>
                          favoritedStudents.has(student.pax_id.toString())
                            ? handleUnfavorite(student.pax_id.toString(), e)
                            : handleFavorite(student.pax_id.toString(), e)
                        }
                        className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 hover:bg-white hover:scale-110 transition-all duration-200 shadow-sm"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            favoritedStudents.has(student.pax_id.toString())
                              ? "fill-pink-500 text-pink-500"
                              : "text-slate-400 hover:text-pink-500"
                          } transition-colors duration-200`}
                        />
                      </button>

                      <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-3 pr-8 bg-pink">
                        <div className="flex-1">
                          <h2 className="text-slate-900 font-semibold text-base tracking-tight group-hover:text-blue-700 transition-colors duration-200">
                            {student.first_name} - {formatGender(student.gender_desc)}
                          </h2>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {student.usahsid.toString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 px-2.5 py-1.5 rounded-lg font-semibold text-sm border border-blue-200/60 shadow-sm">
                          <Award className="w-3.5 h-3.5" />
                          {student.gpa}
                        </div>
                      </div>

                      <div className="space-y-1 text-sm text-slate-600 mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-medium text-slate-500">
                              Country
                            </span>
                          </div>
                          <span className="font-semibold text-slate-700">
                            {student.country}
                          </span>
                        </div>
                        {/* <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">
                            City Size
                          </span>
                          <span className="font-semibold text-slate-700">
                            {student.urban_request}
                          </span>
                        </div> */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">
                            Grade / Age{" "}
                          </span>
                          <span className="font-semibold text-slate-700">
                            {student.applying_to_grade} / {student.adjusted_age}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">
                            English
                          </span>
                          <span className="font-semibold text-blue-600">
                            {student.english_score}
                          </span>
                        </div>
                        <div className="flex items-start justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <span className="text-xs font-medium text-slate-500">
                              Program
                            </span>
                          </div>
                          <span className="font-medium text-slate-700 text-xs text-right leading-tight max-w-[180px]">
                            {student.program_type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">
                            Application Status
                          </span>
                          <span className="font-semibold text-slate-700">
                            {student.placement_status}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-3">
                        <p className="text-slate-700 text-xs font-semibold mb-2 flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-slate-400" />
                          Interests
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {student.selected_interests
                            .slice(0, 4)
                            .map((i: string) => (
                              <span
                                key={i}
                                className="bg-gradient-to-br from-slate-50 to-blue-50/50 text-slate-700 text-[11px] px-2 py-1 rounded-md border border-slate-200/60 font-medium hover:border-blue-300 transition-colors duration-200"
                              >
                                {i}
                              </span>
                            ))}
                          {student.selected_interests.length > 4 && (
                            <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-1 rounded-md font-semibold">
                              +{student.selected_interests.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Mobile-friendly card layout for compact view, table for desktop */
                <>
                  {/* Mobile card view */}
                  <div
                    key={`mobile-results-${resultsAnimationKey}`}
                    className={`md:hidden space-y-3 mb-8 ${
                      shouldAnimateResults ? "results-refresh-container" : ""
                    }`}
                  >
                    {displayedStudents.map((student, index) => (
                      <div
                        key={student.pax_id.toString()}
                        onClick={() => {
                          setSelectedStudent(student);
                        }}
                        style={
                          shouldAnimateResults
                            ? ({ "--results-item-index": index } as React.CSSProperties)
                            : undefined
                        }
                        className={`bg-white/95 backdrop-blur-sm border-2 ${getStatusRingColor(
                          student.placement_status
                        )} rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer relative ${
                          shouldAnimateResults ? "results-refresh-item" : ""
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            favoritedStudents.has(student.pax_id.toString())
                              ? handleUnfavorite(student.pax_id.toString(), e)
                              : handleFavorite(student.pax_id.toString(), e);
                          }}
                          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 hover:bg-white hover:scale-110 transition-all duration-200 shadow-sm"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              favoritedStudents.has(student.pax_id.toString())
                                ? "fill-pink-500 text-pink-500"
                                : "text-slate-400 hover:text-pink-500"
                            } transition-colors duration-200`}
                          />
                        </button>

                        <div className="mb-3 pr-8">
                          <h3 className="text-lg font-bold text-slate-900">
                            {student.first_name} - {formatGender(student.gender_desc)}
                          </h3>
                          <p className="text-xs text-slate-500 font-mono">
                            {student.usahsid.toString()}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-500">
                              Country
                            </span>
                            <span className="font-semibold text-slate-700 text-sm">
                              {student.country}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-500">
                              GPA
                            </span>
                            <span className="font-semibold text-blue-600 text-sm flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" />
                              {student.gpa}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-500">
                              Grade / Age
                            </span>
                            <span className="font-semibold text-slate-700 text-sm">
                              {student.applying_to_grade} /{" "}
                              {student.adjusted_age}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-500">
                              English
                            </span>
                            <span className="font-semibold text-blue-600 text-sm">
                              {student.english_score}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-3 space-y-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-500 mb-1">
                              Program
                            </span>
                            <span className="font-medium text-slate-700 text-xs leading-tight">
                              {student.program_type}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                              Status
                            </span>
                            <span
                              className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${
                                student.placement_status
                                  ?.toLowerCase()
                                  .includes("unassigned")
                                  ? "bg-slate-100 text-slate-700 border border-slate-300"
                                  : student.placement_status
                                      ?.toLowerCase()
                                      .includes("pending")
                                  ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                  : student.placement_status
                                      ?.toLowerCase()
                                      .includes("placed")
                                  ? "bg-green-100 text-green-700 border border-green-300"
                                  : "bg-blue-100 text-blue-700 border border-blue-300"
                              }`}
                            >
                              {student.placement_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table view */}
                  <div
                    key={`desktop-results-${resultsAnimationKey}`}
                    className={`hidden md:block bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg shadow-slate-900/5 mb-8 overflow-hidden ${
                      shouldAnimateResults ? "results-refresh-container" : ""
                    }`}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1360px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              <div
                                className="flex items-center gap-2 cursor-pointer select-none"
                                onClick={() => toggleSort("first_name")}
                              >
                                <span>Name</span>
                                {orderBy === "first_name" && (
                                  <span className="text-slate-400">
                                    {descending ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              Gender
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              <div
                                className="flex items-center gap-2 cursor-pointer select-none"
                                onClick={() => toggleSort("country")}
                              >
                                <span>Country</span>
                                {orderBy === "country" && (
                                  <span className="text-slate-400">
                                    {descending ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              Interests
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              <div
                                className="flex items-center gap-2 cursor-pointer select-none"
                                onClick={() => toggleSort("gpa")}
                              >
                                <span>GPA</span>
                                {orderBy === "gpa" && (
                                  <span className="text-slate-400">
                                    {descending ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              <div
                                className="flex items-center gap-2 cursor-pointer select-none"
                                onClick={() => toggleSort("adjusted_age")}
                              >
                                <span>Grade/Age</span>
                                {orderBy === "adjusted_age" && (
                                  <span className="text-slate-400">
                                    {descending ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              English
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              Program
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              <div
                                className="flex items-center gap-2 cursor-pointer select-none"
                                onClick={() => toggleSort("placement_status")}
                              >
                                <span>Status</span>
                                {orderBy === "placement_status" && (
                                  <span className="text-slate-400">
                                    {descending ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {displayedStudents.map((student, index) => (
                            <tr
                              key={student.pax_id.toString()}
                              onClick={() => {
                                setSelectedStudent(student);
                              }}
                              style={
                                shouldAnimateResults
                                  ? ({ "--results-item-index": index } as React.CSSProperties)
                                  : undefined
                              }
                              className={`hover:bg-blue-50/50 cursor-pointer transition-colors duration-150 ${
                                shouldAnimateResults ? "results-refresh-item" : ""
                              }`}
                            >
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                {student.first_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {formatGender(student.gender_desc)}
                              </td>
                              <td className="px-4 py-3 text-xs font-mono text-slate-500">
                                {student.usahsid.toString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {student.country}
                              </td>
                              <td
                                className="px-4 py-3 text-xs text-slate-700 whitespace-normal"
                                title={
                                  Array.isArray(student.selected_interests)
                                    ? student.selected_interests.join(", ")
                                    : ""
                                }
                              >
                                {Array.isArray(student.selected_interests) &&
                                student.selected_interests.length > 0
                                  ? student.selected_interests.join(", ")
                                  : "-"}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 px-2 py-1 rounded-md font-semibold text-xs border border-blue-200/60">
                                  <Award className="w-3 h-3" />
                                  {student.gpa}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {student.applying_to_grade} /{" "}
                                {student.adjusted_age}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                                {student.english_score}
                              </td>
                              <td
                                className="px-4 py-3 text-xs text-slate-700 max-w-[150px] truncate"
                                title={student.program_type}
                              >
                                {student.program_type}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${
                                    student.placement_status
                                      ?.toLowerCase()
                                      .includes("unassigned")
                                      ? "bg-slate-100 text-slate-700 border border-slate-300"
                                      : student.placement_status
                                          ?.toLowerCase()
                                          .includes("pending")
                                      ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                      : student.placement_status
                                          ?.toLowerCase()
                                          .includes("placed")
                                      ? "bg-green-100 text-green-700 border border-green-300"
                                      : "bg-blue-100 text-blue-700 border border-blue-300"
                                  }`}
                                >
                                  {student.placement_status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    favoritedStudents.has(
                                      student.pax_id.toString()
                                    )
                                      ? handleUnfavorite(
                                          student.pax_id.toString(),
                                          e
                                        )
                                      : handleFavorite(
                                          student.pax_id.toString(),
                                          e
                                        );
                                  }}
                                  className="p-1.5 rounded-full hover:bg-slate-100 transition-all duration-200"
                                >
                                  <Heart
                                    className={`w-4 h-4 ${
                                      favoritedStudents.has(
                                        student.pax_id.toString()
                                      )
                                        ? "fill-pink-500 text-pink-500"
                                        : "text-slate-400 hover:text-pink-500"
                                    } transition-colors duration-200`}
                                  />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {totalPages > 1 && !showFavoritesOnly && (
                <div className="flex items-center justify-center gap-4 mb-8">
                  <Button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    variant="outline"
                    className="h-10 px-4 border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-300 bg-transparent"
                  >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <span className="text-sm font-medium text-slate-600">
                      Page
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {currentPage}
                    </span>
                    <span className="text-sm font-medium text-slate-400">
                      of
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {totalPages}
                    </span>
                  </div>

                  <Button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    className="h-10 px-4 border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-300 bg-transparent"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        <Footer />
      </div>

      <Dialog
        open={isFeedbackOpen}
        onOpenChange={(open) => {
          setIsFeedbackOpen(open);
          if (!open) {
            setFeedbackError(null);
            setFeedbackSuccess(null);
          }
        }}
      >
        <DialogContent className="bg-white/95 backdrop-blur-xl border border-slate-200 w-[92vw] max-w-lg mx-auto rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-xl font-bold flex items-center gap-2 text-blue-600">
              Provide Feedback
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitFeedback} className="space-y-3">
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Tell us what could be improved..."
              className="w-full min-h-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-500 resize-y"
            />
            {feedbackError && (
              <p className="text-xs font-medium text-red-600">
                {feedbackError}
              </p>
            )}
            {feedbackSuccess && (
              <p className="text-xs font-medium text-green-700">
                {feedbackSuccess}
              </p>
            )}
            <Button
              type="submit"
              disabled={isSubmittingFeedback}
              className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm disabled:opacity-60"
            >
              {isSubmittingFeedback ? "Submitting..." : "Submit feedback"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
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
                    onValueChange={(v) =>
                      setFilters({ ...filters, country_of_origin: v })
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
                    onValueChange={(v) => setFilters({ ...filters, state: v })}
                  >
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400">
                      <SelectValue placeholder="Show All" />
                    </SelectTrigger>

                    <SelectContent>
                      {states.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
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
                          setFilters({ ...filters, gender_male: !!checked })
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
                          setFilters({ ...filters, gender_female: !!checked })
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
                    onValueChange={(v) => setFilters({ ...filters, gpa: v })}
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
                    onValueChange={(v) =>
                      setFilters({ ...filters, adjusted_age: v })
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
                    onValueChange={(v) =>
                      setFilters({ ...filters, interests: v })
                    }
                  >
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-300 shadow-sm hover:border-slate-400">
                      <SelectValue placeholder="Show All" />
                    </SelectTrigger>

                    <SelectContent>
                      {interests.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
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
                {/* <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-2">Pets in Home</label>
                  <div className="flex items-center gap-3 mt-2">
                    <Switch
                      checked={filters.pets_in_home}
                      onCheckedChange={(checked) => setFilters({ ...filters, pets_in_home: checked })}
                    />
                    <span className="text-sm text-slate-700 font-medium">
                      {filters.pets_in_home ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div> */}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-2">
                    Pets in Home
                  </label>
                  <Select
                    value={filters.pets_in_home}
                    onValueChange={(v) =>
                      setFilters({ ...filters, pets_in_home: v })
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
                    onValueChange={(v) =>
                      setFilters({ ...filters, early_placement: v })
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
                    onClick={() => setIsprogram_typeOpen(true)}
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
                    onValueChange={(v) =>
                      setFilters({ ...filters, double_placement: v })
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
                    onValueChange={(v) =>
                      setFilters({ ...filters, single_placement: v })
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
                    onValueChange={(v) =>
                      setFilters({ ...filters, religiousPractice: v })
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
                        setFilters({ ...filters, hasVideo: !!checked })
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
              onClick={() => setIsFilterOpen(false)}
              className="flex-1 h-10 border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowFavoritesOnly(false);
                setCurrentPage(1);
                fetchStudents(1);
                setIsFilterOpen(false);
              }}
              className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white shadow-sm font-semibold"
            >
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isprogram_typeOpen} onOpenChange={setIsprogram_typeOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border border-slate-200 w-md mx-auto rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-lg font-bold">
              Select Program Length
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 mt-1">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="10-month-jan"
                checked={filters.program_types.includes("10-month-jan")}
                onCheckedChange={() => toggleprogram_type("10-month-jan")}
              />
              <label
                htmlFor="10-month-jan"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                10 month Jan
              </label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="10-month-aug"
                checked={filters.program_types.includes("10-month-aug")}
                onCheckedChange={() => toggleprogram_type("10-month-aug")}
              />
              <label
                htmlFor="10-month-aug"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                10 month Aug
              </label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="5-month-jan"
                checked={filters.program_types.includes("5-month-jan")}
                onCheckedChange={() => toggleprogram_type("5-month-jan")}
              />
              <label
                htmlFor="5-month-jan"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                5 month Jan
              </label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="5-month-aug"
                checked={filters.program_types.includes("5-month-aug")}
                onCheckedChange={() => toggleprogram_type("5-month-aug")}
              />
              <label
                htmlFor="5-month-aug"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                5 month Aug
              </label>
            </div>
          </div>
          <div className="flex border-t border-slate-200">
            <Button
              onClick={() => setIsprogram_typeOpen(false)}
              className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25 font-semibold"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isScholarshipOpen} onOpenChange={setIsScholarshipOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border border-slate-200 w-md mx-auto rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-lg font-bold">
              Select Scholarship Options
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 mt-1">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="grant"
                checked={filters.grants_options.includes("grant")}
                onCheckedChange={() => toggleScholarship("grant")}
              />
              <label
                htmlFor="grant"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                Show all grant students
              </label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="cbe"
                checked={filters.grants_options.includes("cbe")}
                onCheckedChange={() => toggleScholarship("cbe")}
              />
              <label
                htmlFor="cbe"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                CBE
              </label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="cbx"
                checked={filters.grants_options.includes("cbx")}
                onCheckedChange={() => toggleScholarship("cbx")}
              />
              <label
                htmlFor="cbx"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                CBX
              </label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="cbg"
                checked={filters.grants_options.includes("cbg")}
                onCheckedChange={() => toggleScholarship("cbg")}
              />
              <label
                htmlFor="cbg"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                CBG
              </label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="fao"
                checked={filters.grants_options.includes("fao")}
                onCheckedChange={() => toggleScholarship("fao")}
              />
              <label
                htmlFor="fao"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                FAO
              </label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="flx"
                checked={filters.grants_options.includes("flx")}
                onCheckedChange={() => toggleScholarship("flx")}
              />
              <label
                htmlFor="flx"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                FLX
              </label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="yes"
                checked={filters.grants_options.includes("yes")}
                onCheckedChange={() => toggleScholarship("yes")}
              />
              <label
                htmlFor="yes"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                YES
              </label>
            </div>
          </div>
          <div className="flex border-t border-slate-200">
            <Button
              onClick={() => setIsScholarshipOpen(false)}
              className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25 font-semibold"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedStudent}
        onOpenChange={() => setSelectedStudent(null)}
      >
        <DialogContent className="bg-white/95 backdrop-blur-xl border border-slate-200 max-w-90% mx-auto rounded-xl shadow-2xl max-h-[85vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader className="relative text-justify">
                <DialogTitle className="text-slate-900 text-xl font-bold tracking-tight">
                  <a
                    href={`https://beacon.ciee.org/participant/${selectedStudent.app_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {selectedStudent.first_name}
                  </a>
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <a
                    href={`/StudentProfile?id=${selectedStudent.app_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-slate-500 font-mono max-w-min underline underline-offset-2"
                  >
                    {selectedStudent.usahsid.toString()}
                  </a>

                  <button
                    type="button"
                    onClick={(e) => {
                      // prevent parent click handlers from running (dialog closing / selection)
                      e.stopPropagation();
                      try {
                        const text = selectedStudent.usahsid?.toString() ?? "";
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(text);
                        } else {
                          // fallback for older browsers
                          const ta = document.createElement("textarea");
                          ta.value = text;
                          ta.setAttribute("readonly", "");
                          ta.style.position = "absolute";
                          ta.style.left = "-9999px";
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand("copy");
                          document.body.removeChild(ta);
                        }
                      } catch (err) {
                        // ignore errors silently - copying is best-effort
                        console.error(err);
                      }
                    }}
                    title="Copy usahsid"
                    aria-label="Copy usahsid"
                    className="p-1 rounded-md bg-white/90 border border-slate-200 hover:bg-slate-100 text-slate-500"
                  >
                    {/* Inline copy icon to avoid adding imports */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="w-4 h-4"
                      aria-hidden="true"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() =>
                    favoritedStudents.has(selectedStudent.pax_id.toString())
                      ? handleUnfavorite(selectedStudent.pax_id.toString())
                      : handleFavorite(selectedStudent.pax_id.toString())
                  }
                  className="absolute top-0 right-10 p-2 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 hover:bg-white hover:scale-110 transition-all duration-200 shadow-sm"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      favoritedStudents.has(selectedStudent.pax_id.toString())
                        ? "fill-pink-500 text-pink-500"
                        : "text-slate-400 hover:text-pink-500"
                    } transition-colors duration-200`}
                  />
                </button>
              </DialogHeader>
              <div className="mt-0">
                <p className="font-semibold text-slate-900 mb-2 text-sm flex items-center gap-1.5 border-t border-slate-200 pt-3">
                  <Star className="w-4 h-4 text-blue-400" />
                  Interests
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedStudent.selected_interests.map((i: string) => (
                    <span
                      key={i}
                      className="bg-gradient-to-br from-slate-50 to-blue-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200 font-medium"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2 text-slate-700 mt-2 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between border-slate-100">
                  <span className="text-sm font-medium text-slate-600">
                    Academics
                  </span>
                  <span className="font-semibold text-blue-600 flex items-center gap-1">
                    {selectedStudent.applying_to_grade}th Grade -{" "}
                    {selectedStudent.gpa}
                    <Award className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-center justify-between border-slate-100">
                  <span className="text-sm font-medium text-slate-600">
                    Program
                  </span>
                  <span className="font-semibold flex items-center gap-1">
                    {selectedStudent.program_type}
                  </span>
                </div>

                <div className="flex items-center justify-between border-slate-100">
                  <span className="text-sm font-medium text-slate-600">
                    Country
                  </span>
                  <span className="font-semibold">
                    {selectedStudent.country}
                  </span>
                </div>
                <div className="flex items-center justify-between border-slate-100">
                  <span className="text-sm font-medium text-slate-600">
                    City Size
                  </span>
                  <span className="font-semibold">
                    {selectedStudent.urban_request}
                  </span>
                </div>
                <div className="flex items-center justify-between border-slate-100 border-b border-slate-200 pb-1">
                  <span className="text-sm font-medium text-slate-600">
                    English Score
                  </span>
                  <span className="font-semibold text-blue-600">
                    {selectedStudent.english_score}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setSelectedStudent(null)}
                className="mt-2 w-full h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25 font-medium"
              >
                Close
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border border-slate-200 w-md mx-auto rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-lg font-bold">
              Select Placement Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 mt-1">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="status-all"
                checked={filters.statusOptions.includes("All")}
                onCheckedChange={() => toggleStatus("All")}
              />
              <label
                htmlFor="status-all"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                All
              </label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="status-allocated"
                checked={filters.statusOptions.includes("Allocated")}
                onCheckedChange={() => toggleStatus("Allocated")}
              />
              <label
                htmlFor="status-allocated"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                Allocated
              </label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="status-placed"
                checked={filters.statusOptions.includes("Placed")}
                onCheckedChange={() => toggleStatus("Placed")}
              />
              <label
                htmlFor="status-placed"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                Placed
              </label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="status-pending"
                checked={filters.statusOptions.includes("Pending")}
                onCheckedChange={() => toggleStatus("Pending")}
              />
              <label
                htmlFor="status-pending"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                Pending
              </label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FilterCheckbox
                id="status-unassigned"
                checked={filters.statusOptions.includes("Unassigned")}
                onCheckedChange={() => toggleStatus("Unassigned")}
              />
              <label
                htmlFor="status-unassigned"
                className="text-sm text-slate-700 cursor-pointer flex-1 font-medium"
              >
                Unassigned
              </label>
            </div>
          </div>
          <div className="flex border-t border-slate-200">
            <Button
              onClick={() => setIsStatusOpen(false)}
              className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25 font-semibold"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
