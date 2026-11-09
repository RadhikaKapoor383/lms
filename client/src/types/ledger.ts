export type LedgerKind = "lesson" | "quiz" | "assignment" | "certificate";

export interface LedgerEntry {
  kind: LedgerKind;
  at: string; // ISO time
  title: string;
  courseName: string;
  detail?: string;
  certificateId?: string;
  counts: boolean; // adds to the running total?
  total: number; // the running total after this entry
}

export interface LedgerTotals {
  lessons: number;
  quizzes: number;
  assignments: number;
  certificates: number;
  entries: number;
}

export interface LedgerData {
  entries: LedgerEntry[];
  totalEntries: number;
  totals: LedgerTotals;
  activity: string[];
}
