import { describe, expect, it } from "vitest";
import { buildActivityGrid, groupByMonth, nextLessonIndex, formatEntryDate } from "../src/utils/ledger";
import type { LedgerEntry } from "../src/types/ledger";

// Dates are built from local parts so the tests give the same answer in any time zone.
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();

const entry = (at: string, counts = true, total = 1): LedgerEntry => ({
  kind: counts ? "lesson" : "certificate",
  at,
  title: "x",
  courseName: "c",
  counts,
  total,
});

describe("groupByMonth", () => {
  it("cuts a newest-first list into months and counts what adds to the total", () => {
    const groups = groupByMonth([
      entry(local(2026, 11, 4), true, 14),
      entry(local(2026, 11, 2), true, 13),
      entry(local(2026, 10, 29), false, 12),
      entry(local(2026, 10, 28), true, 12),
    ]);
    expect(groups.map((g) => [g.key, g.label, g.entries.length, g.added])).toEqual([
      ["2026-11", "NOVEMBER 2026", 2, 2],
      ["2026-10", "OCTOBER 2026", 2, 1],
    ]);
  });

  it("an empty list has no groups", () => {
    expect(groupByMonth([])).toEqual([]);
  });
});

describe("formatEntryDate", () => {
  it("shows day and short month", () => {
    expect(formatEntryDate(local(2026, 11, 4))).toBe("04 Nov");
  });
});

describe("buildActivityGrid", () => {
  const now = new Date(2026, 10, 5, 15); // Thursday 5 Nov 2026, local time

  it("makes 12 weeks of 7 days, ending with this week", () => {
    const { columns } = buildActivityGrid([], now);
    expect(columns).toHaveLength(12);
    expect(columns.every((c) => c.length === 7)).toBe(true);
    expect(columns[11][0].key).toBe("2026-11-01"); // this week's Sunday
    expect(columns[11][4].key).toBe("2026-11-05"); // today
    expect(columns[0][0].key).toBe("2026-08-16"); // 11 weeks earlier
  });

  it("days after today are marked as future and stay empty", () => {
    const { columns } = buildActivityGrid([local(2026, 11, 6)], now); // an entry "tomorrow" is ignored
    expect(columns[11][4].future).toBe(false);
    expect(columns[11][5].future).toBe(true);
    expect(columns[11][5].count).toBe(0);
  });

  it("counts entries per day and sets the shade", () => {
    const { columns, total } = buildActivityGrid(
      [
        local(2026, 11, 5, 9),
        local(2026, 11, 4, 9),
        local(2026, 11, 4, 10),
        local(2026, 11, 3, 9),
        local(2026, 11, 3, 10),
        local(2026, 11, 3, 11),
        local(2026, 11, 3, 12),
      ],
      now
    );
    const byKey = new Map(columns.flat().map((c) => [c.key, c]));
    expect(byKey.get("2026-11-05")).toMatchObject({ count: 1, level: 1 });
    expect(byKey.get("2026-11-04")).toMatchObject({ count: 2, level: 2 });
    expect(byKey.get("2026-11-03")).toMatchObject({ count: 4, level: 3 });
    expect(byKey.get("2026-11-02")).toMatchObject({ count: 0, level: 0 });
    expect(total).toBe(7);
  });

  it("ignores entries older than the 12 weeks", () => {
    expect(buildActivityGrid([local(2026, 1, 1)], now).total).toBe(0);
  });
});

describe("nextLessonIndex", () => {
  const lessons = [{ _id: "a" }, { _id: "b" }, { _id: "c" }];

  it("finds the first lesson not finished", () => {
    expect(nextLessonIndex(lessons, [])).toBe(0);
    expect(nextLessonIndex(lessons, ["a"])).toBe(1);
    expect(nextLessonIndex(lessons, ["a", "c"])).toBe(1);
  });

  it("is -1 when everything is done, or there are no lessons", () => {
    expect(nextLessonIndex(lessons, ["a", "b", "c"])).toBe(-1);
    expect(nextLessonIndex([], [])).toBe(-1);
  });
});
