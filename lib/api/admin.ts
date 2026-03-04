"use client";

import { apiFetch } from "@/lib/api/api-client";

export function getRpmManagers<T>() {
  return apiFetch<T>("/admin/get_rpms", {
    method: "GET",
  });
}

