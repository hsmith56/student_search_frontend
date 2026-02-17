import type { StudentData } from "@/features/student-profile/types";

export function cleanList(
  items: Array<string | null | undefined> | undefined | null,
): string[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item !== "");
}

export function textOrDash(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return "Not provided";
  }

  const text = String(value).trim();
  return text ? text : "Not provided";
}

export function boolText(value: boolean): string {
  return value ? "Yes" : "No";
}

export function religiousFrequencyText(
  value: number | string | undefined | null,
): string {
  const mappedValues: Record<number, string> = {
    0: "Never",
    1: "Occasionally",
    2: "Often",
  };

  if (value === undefined || value === null) {
    return "Not provided";
  }

  const numericValue =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (Object.prototype.hasOwnProperty.call(mappedValues, numericValue)) {
    return mappedValues[numericValue];
  }

  return textOrDash(value);
}

export function collectNarratives(student: StudentData) {
  return [
    { title: "Introduction", text: student.intro_message },
    { title: "Message to Host Family", text: student.message_to_host_family },
    {
      title: "Message from Natural Family",
      text: student.message_from_natural_family,
    },
    { title: "Family Description", text: student.family_description },
    { title: "Photo Comments", text: student.photo_comments },
  ].filter((entry) => entry.text?.trim());
}

export function statusTone(status: string): "placed" | "pending" | "allocated" | "other" {
  const normalized = status.toLowerCase();
  if (normalized.includes("placed")) {
    return "placed";
  }
  if (normalized.includes("pending")) {
    return "pending";
  }
  if (normalized.includes("allocated")) {
    return "allocated";
  }
  return "other";
}
