// Small display helpers for a course's length and department, shared by the
// course cards, the course page and the search filters. No React in here, so
// they can be tested on their own.

// Fallback labels, used if the server sends bare bucket names (older servers did).
export const DURATION_LABELS: Record<string, string> = {
  short: "Up to 2 hours",
  medium: "2 to 10 hours",
  long: "Over 10 hours",
};

export type DurationOption = { value: string; label: string };

// The filter options as { value, label }, whether the server sent
// [{ value, label }] or plain ["short", "medium", "long"].
export const toDurationOptions = (raw: unknown): DurationOption[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d: any) => {
      if (typeof d === "string") return { value: d, label: DURATION_LABELS[d] || d };
      if (d && typeof d.value === "string") {
        return { value: d.value, label: d.label || DURATION_LABELS[d.value] || d.value };
      }
      return null;
    })
    .filter((d): d is DurationOption => d !== null);
};

// 90 -> "1h 30m", 600 -> "10h", 45 -> "45m", 0 -> ""
export const formatMinutes = (minutes: number): string => {
  if (!minutes || minutes <= 0) return "";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};

// A course's length for display. The server sends `durationMinutes` (the
// instructor's hours, or the lessons' total when they gave none) on search
// results and the course page; the plain course list only has `durationHours`.
export const courseDuration = (course: any): string => {
  if (!course) return "";
  const minutes = Number(course.durationMinutes);
  if (Number.isFinite(minutes) && minutes > 0) return formatMinutes(minutes);
  const hours = Number(course.durationHours);
  if (Number.isFinite(hours) && hours > 0) return formatMinutes(hours * 60);
  return "";
};

// The department's name, whether it came populated ({ _id, name }) or not.
export const departmentName = (course: any): string =>
  course?.department && typeof course.department === "object" ? course.department.name || "" : "";

// For edit forms: the department id out of whatever shape the server sent.
export const departmentId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "object") return value._id ? String(value._id) : "";
  return String(value);
};
