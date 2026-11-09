import { LedgerEntry, LedgerKind } from "@/types/ledger";

export const KIND_LABEL: Record<LedgerKind, string> = {
  lesson: "Lesson finished",
  quiz: "Quiz passed",
  assignment: "Assignment submitted",
  certificate: "Certificate earned",
};

// "2026-11-04T09:00:00Z" -> "04 Nov" (in the visitor's own time zone)
export function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export interface MonthGroup {
  key: string; // "2026-11"
  label: string; // "NOVEMBER 2026"
  entries: LedgerEntry[];
  added: number; // how many of these entries add to the total
}

// Entries arrive newest first and stay in that order; this only cuts them into months.
export function groupByMonth(entries: LedgerEntry[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const entry of entries) {
    const d = new Date(entry.at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = {
        key,
        label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }).toUpperCase(),
        entries: [],
        added: 0,
      };
      groups.push(group);
    }
    group.entries.push(entry);
    if (entry.counts) group.added += 1;
  }
  return groups;
}

export interface ActivityCell {
  key: string; // local date, "2026-11-04"
  count: number;
  level: 0 | 1 | 2 | 3;
  future: boolean; // a day that has not happened yet (the rest of this week)
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Turns entry times into `weeks` columns of 7 days (Sunday to Saturday), the
// last column being the current week. Days are cut in the visitor's own time zone.
export function buildActivityGrid(
  dates: string[],
  now: Date,
  weeks = 12
): { columns: ActivityCell[][]; total: number } {
  const counts = new Map<string, number>();
  for (const iso of dates) {
    const key = dayKey(new Date(iso));
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - (weeks - 1) * 7); // the Sunday `weeks` weeks back

  const columns: ActivityCell[][] = [];
  let total = 0;
  for (let w = 0; w < weeks; w++) {
    const column: ActivityCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      const key = dayKey(day);
      const future = day.getTime() > today.getTime();
      const count = future ? 0 : counts.get(key) || 0;
      total += count;
      column.push({ key, count, future, level: count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3 });
    }
    columns.push(column);
  }
  return { columns, total };
}

// The first lesson not finished yet, or -1 when everything is done.
export function nextLessonIndex(lessons: { _id: string }[], completedIds: string[]): number {
  return lessons.findIndex((l) => !completedIds.includes(l._id));
}
