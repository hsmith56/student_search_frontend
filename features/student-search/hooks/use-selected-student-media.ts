"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/features/student-search/constants";
import type { StudentRecord } from "@/features/student-search/types";
import { extractMediaLink } from "@/features/student-search/utils";

export function useSelectedStudentMedia(selectedStudent: StudentRecord | null) {
  const [selectedStudentMediaLink, setSelectedStudentMediaLink] = useState("");

  useEffect(() => {
    if (!selectedStudent) {
      setSelectedStudentMediaLink("");
      return;
    }

    const directLink = extractMediaLink(selectedStudent);
    setSelectedStudentMediaLink(directLink);

    if (directLink || !selectedStudent.app_id) {
      return;
    }

    const controller = new AbortController();

    fetch(`${API_URL}/students/full/${selectedStudent.app_id}`, {
      method: "GET",
      headers: { accept: "application/json" },
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }
        const fullStudent = await response.json();
        setSelectedStudentMediaLink(extractMediaLink(fullStudent));
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error("Error fetching selected student media:", error);
        }
      });

    return () => controller.abort();
  }, [selectedStudent]);

  return selectedStudentMediaLink;
}
