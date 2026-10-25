import { describe, expect, it } from "vitest";
import {
  DURATION_OPTIONS,
  buildMongoFilter,
  effectiveDurationMinutes,
  matchesDuration,
  parseCourseSearch,
  rankAndPage,
} from "../src/services/courseSearch.service";

const ID = "64b7f0c2a1b2c3d4e5f60718";
const ok = (query: Record<string, unknown>) => {
  const out = parseCourseSearch(query);
  if ("error" in out) throw new Error(out.error);
  return out.params;
};
const err = (query: Record<string, unknown>) => {
  const out = parseCourseSearch(query);
  return "error" in out ? out.error : null;
};

describe("department filter", () => {
  it("accepts a department id and puts it in the database filter", () => {
    const p = ok({ department: ID });
    expect(p.department).toBe(ID);
    expect(buildMongoFilter(p)).toEqual({ status: "Published", department: ID });
  });
  it("rejects something that isn't an id, and operator objects", () => {
    expect(err({ department: "computer-science" })).toBe("Invalid department");
    expect(err({ department: { $ne: null } })).toBe("Invalid value for department");
  });
  it("works together with the other filters and still only shows Published", () => {
    const f = buildMongoFilter(ok({ department: ID, category: ID, level: "beginner", status: "Draft" }));
    expect(f).toEqual({ status: "Published", category: ID, department: ID, level: "Beginner" });
  });
});

describe("course length", () => {
  it("uses the instructor's hours when given", () => {
    expect(effectiveDurationMinutes(12, 45)).toBe(720);
    expect(effectiveDurationMinutes(1.5, 0)).toBe(90);
    expect(effectiveDurationMinutes("3", 10)).toBe(180);
  });
  it("falls back to the lessons' minutes when hours are empty, zero or nonsense", () => {
    for (const hours of [undefined, null, "", 0, -2, "abc", Number.NaN]) {
      expect(effectiveDurationMinutes(hours, 95), String(hours)).toBe(95);
    }
    expect(effectiveDurationMinutes(undefined, 0)).toBe(0);
  });
});

describe("duration buckets", () => {
  it("come with readable labels", () => {
    expect(DURATION_OPTIONS).toEqual([
      { value: "short", label: "Up to 2 hours" },
      { value: "medium", label: "2 to 10 hours" },
      { value: "long", label: "Over 10 hours" },
    ]);
  });
  it("put the boundaries where the labels say", () => {
    expect(matchesDuration(120, "short")).toBe(true); // exactly 2 hours is "up to 2 hours"
    expect(matchesDuration(120, "medium")).toBe(false);
    expect(matchesDuration(121, "medium")).toBe(true);
    expect(matchesDuration(600, "medium")).toBe(true); // exactly 10 hours is "2 to 10 hours"
    expect(matchesDuration(600, "long")).toBe(false);
    expect(matchesDuration(601, "long")).toBe(true);
  });
  it("every positive length is in exactly one bucket", () => {
    for (const minutes of [1, 30, 119, 120, 121, 300, 599, 600, 601, 5000]) {
      const hits = DURATION_OPTIONS.filter((o) => matchesDuration(minutes, o.value));
      expect(hits.length, `${minutes} minutes`).toBe(1);
    }
  });
  it("a course with no known length matches no bucket, but shows when no length is chosen", () => {
    for (const o of DURATION_OPTIONS) expect(matchesDuration(0, o.value)).toBe(false);
    expect(matchesDuration(0)).toBe(true);
  });
  it("rejects unknown buckets, including inherited object keys", () => {
    expect(err({ duration: "huge" })).toBe("Duration must be short, medium or long");
    expect(err({ duration: "toString" })).toBe("Duration must be short, medium or long");
    expect(err({ duration: "constructor" })).toBe("Duration must be short, medium or long");
  });
});

describe("rankAndPage with a duration filter", () => {
  const rows = [
    { _id: 1, name: "A", durationMinutes: 90, enrolled: 0 },
    { _id: 2, name: "B", durationMinutes: 600, enrolled: 3 }, // 10 h typed in by the instructor
    { _id: 3, name: "C", durationMinutes: 720, enrolled: 1 },
    { _id: 4, name: "D", durationMinutes: 0, enrolled: 9 },
  ];
  it("filters on the effective length and counts before paging", () => {
    const medium = rankAndPage(rows, { ...ok({ duration: "medium", sort: "name" }) });
    expect(medium.items.map((r) => r.name)).toEqual(["B"]);
    const long = rankAndPage(rows, { ...ok({ duration: "long" }) });
    expect(long.items.map((r) => r.name)).toEqual(["C"]);
    const all = rankAndPage(rows, { ...ok({ sort: "popular", limit: "2" }) });
    expect(all.total).toBe(4);
    expect(all.totalPages).toBe(2);
    expect(all.items.map((r) => r.name)).toEqual(["D", "B"]);
  });
});
