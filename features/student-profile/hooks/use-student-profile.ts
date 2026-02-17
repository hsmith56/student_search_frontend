"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import type { StudentData } from "@/features/student-profile/types";

type UseStudentProfileResult = {
  student: StudentData | null;
  loading: boolean;
  error: string | null;
  authLoading: boolean;
  isAuthenticated: boolean;
};

const API_BASE_URL = "/api";

export function useStudentProfile(studentId: string): UseStudentProfileResult {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    if (!studentId) {
      setStudent(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/students/full/${studentId}`, {
      method: "GET",
      headers: { accept: "application/json" },
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setStudent(null);
            setError("Session expired. Redirecting to login...");
            return;
          }
          throw new Error(`Status ${response.status}`);
        }

        const payload = (await response.json()) as StudentData;
        setStudent(payload);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Error fetching student profile:", fetchError);
        setError(String(fetchError));
        setStudent(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [authLoading, isAuthenticated, studentId]);

  return {
    student,
    loading,
    error,
    authLoading,
    isAuthenticated,
  };
}
