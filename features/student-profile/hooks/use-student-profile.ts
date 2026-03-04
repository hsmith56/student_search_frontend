"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import type { StudentData } from "@/features/student-profile/types";
import { ApiError } from "@/lib/api/api-client";
import { getStudentById } from "@/lib/api/students";

type UseStudentProfileResult = {
  student: StudentData | null;
  loading: boolean;
  error: string | null;
  authLoading: boolean;
  isAuthenticated: boolean;
};

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

    getStudentById<StudentData>(studentId, controller.signal).then((response) => {
      setStudent(response);
    })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }
        if (
          fetchError instanceof ApiError &&
          (fetchError.status === 401 || fetchError.status === 403)
        ) {
          setStudent(null);
          setError("Session expired. Redirecting to login...");
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
