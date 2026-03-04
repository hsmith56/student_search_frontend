"use client";

import { apiFetch } from "@/lib/api/api-client";

type SearchStudentsArgs = {
  page: number;
  pageSize: number;
  orderBy: string;
  descending: boolean;
  filters: unknown;
  signal?: AbortSignal;
};

function buildSearchQuery({
  page,
  pageSize,
  orderBy,
  descending,
}: Omit<SearchStudentsArgs, "filters" | "signal">) {
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    order_by: orderBy,
    descending: String(descending),
  });
  return query.toString();
}

export function searchStudents<T>({
  page,
  pageSize,
  orderBy,
  descending,
  filters,
  signal,
}: SearchStudentsArgs) {
  const query = buildSearchQuery({ page, pageSize, orderBy, descending });

  return apiFetch<T>(`/students/search?${query}`, {
    method: "POST",
    jsonBody: filters,
    signal,
  });
}

export function getStudentById<T>(studentId: string | number, signal?: AbortSignal) {
  return apiFetch<T>(`/students/full/${encodeURIComponent(String(studentId))}`, {
    method: "GET",
    signal,
  });
}

export function updateStudentDatabase() {
  return apiFetch<unknown>("/students/update_db", {
    method: "POST",
  });
}

