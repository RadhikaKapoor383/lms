// The learner's "ledger": a dated record of everything they have finished,
// with a running total after each entry. This file only turns a list of events
// into that record - it never touches the database, so it is easy to test.

export type LedgerKind = "lesson" | "quiz" | "assignment" | "certificate";

// Lessons, passed quizzes and submitted assignments add to the total.
// A certificate is recognition, not another thing finished, so it does not.
export const COUNTING_KINDS: LedgerKind[] = ["lesson", "quiz", "assignment"];

export interface LedgerEvent {
  kind: LedgerKind;
  at: Date;
  title: string;
  courseName: string;
  // Two events with the same key are the same thing finished twice (for
  // example passing a quiz again); only the earliest one is kept.
  key?: string;
  // Small extra text, e.g. a quiz score such as "8 / 10".
  detail?: string;
  // Certificates only: the public id, so the page can link to it.
  certificateId?: string;
}

export interface LedgerEntry {
  kind: LedgerKind;
  at: string; // ISO time
  title: string;
  courseName: string;
  detail?: string;
  certificateId?: string;
  counts: boolean; // does it add to the running total?
  total: number; // the running total after this entry
}

export interface LedgerTotals {
  lessons: number;
  quizzes: number;
  assignments: number;
  certificates: number;
  entries: number; // lessons + quizzes + assignments
}

export interface LedgerResult {
  entries: LedgerEntry[]; // newest first, at most `limit`
  totalEntries: number; // how many exist in all (certificates included)
  totals: LedgerTotals;
  // ISO times of the entries that count, within the last `activityDays` days.
  // The page turns these into the activity squares in the visitor's own time zone.
  activity: string[];
}

const KIND_ORDER: Record<LedgerKind, number> = { lesson: 0, quiz: 1, assignment: 2, certificate: 3 };
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVITY = 2000;

// ?limit=... from the URL: a whole number, never less than 1 or more than `max`.
export function clampLimit(raw: unknown, fallback = 40, max = 200): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export function buildLedger(
  events: LedgerEvent[],
  options: { limit?: number; now?: Date; activityDays?: number } = {}
): LedgerResult {
  const limit = options.limit ?? 40;
  const now = options.now ?? new Date();
  const activityDays = options.activityDays ?? 84;

  // oldest first, so the running total can be added up in order
  const sorted = events
    .filter((e) => e.at instanceof Date && !Number.isNaN(e.at.getTime()))
    .sort(
      (a, b) =>
        a.at.getTime() - b.at.getTime() ||
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        a.title.localeCompare(b.title)
    );

  const seen = new Set<string>();
  const entries: LedgerEntry[] = [];
  const totals: LedgerTotals = { lessons: 0, quizzes: 0, assignments: 0, certificates: 0, entries: 0 };
  let running = 0;

  for (const e of sorted) {
    if (e.key) {
      const id = `${e.kind}:${e.key}`;
      if (seen.has(id)) continue;
      seen.add(id);
    }
    const counts = COUNTING_KINDS.includes(e.kind);
    if (counts) running += 1;

    if (e.kind === "lesson") totals.lessons += 1;
    else if (e.kind === "quiz") totals.quizzes += 1;
    else if (e.kind === "assignment") totals.assignments += 1;
    else totals.certificates += 1;

    entries.push({
      kind: e.kind,
      at: e.at.toISOString(),
      title: e.title,
      courseName: e.courseName,
      ...(e.detail ? { detail: e.detail } : {}),
      ...(e.certificateId ? { certificateId: e.certificateId } : {}),
      counts,
      total: running,
    });
  }
  totals.entries = running;

  const since = now.getTime() - activityDays * DAY_MS;
  const activity = entries
    .filter((e) => e.counts && new Date(e.at).getTime() >= since)
    .map((e) => e.at)
    .slice(-MAX_ACTIVITY);

  const newestFirst = entries.slice().reverse();
  return {
    entries: newestFirst.slice(0, limit),
    totalEntries: newestFirst.length,
    totals,
    activity,
  };
}
