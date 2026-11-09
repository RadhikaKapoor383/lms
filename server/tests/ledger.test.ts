import { describe, expect, it } from "vitest";
import { LedgerEvent, buildLedger, clampLimit } from "../src/services/ledger.service";

const ev = (kind: LedgerEvent["kind"], iso: string, title: string, extra: Partial<LedgerEvent> = {}): LedgerEvent => ({
  kind,
  at: new Date(iso),
  title,
  courseName: "Web basics",
  ...extra,
});

describe("buildLedger", () => {
  it("an empty history gives an empty ledger", () => {
    expect(buildLedger([])).toEqual({
      entries: [],
      totalEntries: 0,
      totals: { lessons: 0, quizzes: 0, assignments: 0, certificates: 0, entries: 0 },
      activity: [],
    });
  });

  it("lists newest first, with the running total after each entry", () => {
    const r = buildLedger([
      ev("lesson", "2026-11-03T10:00:00Z", "Third"),
      ev("lesson", "2026-11-01T10:00:00Z", "First"),
      ev("lesson", "2026-11-02T10:00:00Z", "Second"),
    ]);
    expect(r.entries.map((e) => [e.title, e.total])).toEqual([
      ["Third", 3],
      ["Second", 2],
      ["First", 1],
    ]);
  });

  it("a certificate is listed but does not add to the total", () => {
    const r = buildLedger([
      ev("lesson", "2026-11-01T10:00:00Z", "Lesson"),
      ev("certificate", "2026-11-02T10:00:00Z", "Course", { certificateId: "abc" }),
      ev("lesson", "2026-11-03T10:00:00Z", "Next lesson"),
    ]);
    expect(r.entries.map((e) => [e.kind, e.counts, e.total])).toEqual([
      ["lesson", true, 2],
      ["certificate", false, 1],
      ["lesson", true, 1],
    ]);
    expect(r.entries[1].certificateId).toBe("abc");
    expect(r.totals).toEqual({ lessons: 2, quizzes: 0, assignments: 0, certificates: 1, entries: 2 });
  });

  it("counts each kind in the totals", () => {
    const r = buildLedger([
      ev("lesson", "2026-11-01T10:00:00Z", "L1"),
      ev("lesson", "2026-11-01T11:00:00Z", "L2"),
      ev("quiz", "2026-11-02T10:00:00Z", "Q", { detail: "8 / 10" }),
      ev("assignment", "2026-11-03T10:00:00Z", "A"),
    ]);
    expect(r.totals).toEqual({ lessons: 2, quizzes: 1, assignments: 1, certificates: 0, entries: 4 });
    expect(r.entries.find((e) => e.kind === "quiz")?.detail).toBe("8 / 10");
  });

  it("the same quiz passed twice is one entry, the earliest", () => {
    const r = buildLedger([
      ev("quiz", "2026-11-05T10:00:00Z", "Quiz", { key: "q1" }),
      ev("quiz", "2026-11-02T10:00:00Z", "Quiz", { key: "q1" }),
    ]);
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].at).toBe("2026-11-02T10:00:00.000Z");
    expect(r.totals.quizzes).toBe(1);
  });

  it("the same key on different kinds is not a duplicate", () => {
    const r = buildLedger([
      ev("lesson", "2026-11-01T10:00:00Z", "A", { key: "x" }),
      ev("assignment", "2026-11-02T10:00:00Z", "B", { key: "x" }),
    ]);
    expect(r.entries).toHaveLength(2);
  });

  it("entries at the same moment keep a steady order", () => {
    const r = buildLedger([
      ev("quiz", "2026-11-01T10:00:00Z", "Quiz"),
      ev("lesson", "2026-11-01T10:00:00Z", "Lesson"),
    ]);
    // oldest first is lesson then quiz, so newest first is quiz then lesson
    expect(r.entries.map((e) => [e.kind, e.total])).toEqual([
      ["quiz", 2],
      ["lesson", 1],
    ]);
  });

  it("limit trims the list but the totals and running totals still cover everything", () => {
    const r = buildLedger(
      [
        ev("lesson", "2026-11-01T10:00:00Z", "One"),
        ev("lesson", "2026-11-02T10:00:00Z", "Two"),
        ev("lesson", "2026-11-03T10:00:00Z", "Three"),
      ],
      { limit: 2 }
    );
    expect(r.entries.map((e) => [e.title, e.total])).toEqual([
      ["Three", 3],
      ["Two", 2],
    ]);
    expect(r.totalEntries).toBe(3);
    expect(r.totals.lessons).toBe(3);
  });

  it("activity only holds entries that count, inside the window", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    const r = buildLedger(
      [
        ev("lesson", "2026-11-09T10:00:00Z", "Recent"),
        ev("lesson", "2026-01-01T10:00:00Z", "Too old"),
        ev("certificate", "2026-11-09T11:00:00Z", "Cert"),
      ],
      { now, activityDays: 84 }
    );
    expect(r.activity).toEqual(["2026-11-09T10:00:00.000Z"]);
  });

  it("skips events with a broken date instead of failing", () => {
    const r = buildLedger([ev("lesson", "not a date", "Broken"), ev("lesson", "2026-11-01T10:00:00Z", "Fine")]);
    expect(r.entries.map((e) => e.title)).toEqual(["Fine"]);
  });
});

describe("clampLimit", () => {
  it("uses the default for missing or silly values", () => {
    expect(clampLimit(undefined)).toBe(40);
    expect(clampLimit("abc")).toBe(40);
    expect(clampLimit("0")).toBe(40);
    expect(clampLimit("-5")).toBe(40);
  });

  it("accepts a sensible number and caps the maximum", () => {
    expect(clampLimit("25")).toBe(25);
    expect(clampLimit("7.9")).toBe(7);
    expect(clampLimit("5000")).toBe(200);
  });
});
