"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type UseAuthRedirectArgs = {
  authLoading: boolean;
  isAuthenticated: boolean;
};

export function useAuthRedirect({
  authLoading,
  isAuthenticated,
}: UseAuthRedirectArgs) {
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);
}
