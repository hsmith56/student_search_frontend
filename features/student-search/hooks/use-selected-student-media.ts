"use client";

import { useEffect, useState } from "react";
import type { StudentRecord } from "@/features/student-search/types";
import { extractMediaLink } from "@/features/student-search/utils";
import { getStudentById } from "@/lib/api/students";

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

    getStudentById<StudentRecord>(selectedStudent.app_id, controller.signal)
      .then((fullStudent) => {
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
