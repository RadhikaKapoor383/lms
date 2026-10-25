import { describe, expect, it } from "vitest";
import {
  courseDuration,
  departmentId,
  departmentName,
  formatMinutes,
  toDurationOptions,
} from "../src/utils/courseMeta";

describe("duration filter options", () => {
  it("uses the labels the server sends", () => {
    expect(
      toDurationOptions([
        { value: "short", label: "Up to 2 hours" },
        { value: "long", label: "Over 10 hours" },
      ])
    ).toEqual([
      { value: "short", label: "Up to 2 hours" },
      { value: "long", label: "Over 10 hours" },
    ]);
  });
  it("turns bare bucket names from an older server into readable labels, never raw names", () => {
    expect(toDurationOptions(["short", "medium", "long"]).map((o) => o.label)).toEqual([
      "Up to 2 hours",
      "2 to 10 hours",
      "Over 10 hours",
    ]);
  });
  it("ignores junk and a missing list", () => {
    expect(toDurationOptions(undefined)).toEqual([]);
    expect(toDurationOptions([null, 3, {}, { value: "medium" }])).toEqual([
      { value: "medium", label: "2 to 10 hours" },
    ]);
  });
});

describe("course length for display", () => {
  it("formats minutes", () => {
    expect(formatMinutes(0)).toBe("");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(90)).toBe("1h 30m");
    expect(formatMinutes(600)).toBe("10h");
  });
  it("prefers the server's effective minutes, then the instructor's hours", () => {
    expect(courseDuration({ durationMinutes: 720, durationHours: 12 })).toBe("12h");
    expect(courseDuration({ durationMinutes: 36 })).toBe("36m"); // lessons only
    expect(courseDuration({ durationHours: 1.5 })).toBe("1h 30m"); // plain course list
    expect(courseDuration({ durationMinutes: 0, durationHours: 0 })).toBe("");
    expect(courseDuration(undefined)).toBe("");
  });
});

describe("department", () => {
  it("reads the name only from a populated department", () => {
    expect(departmentName({ department: { _id: "1", name: "Computer Science" } })).toBe("Computer Science");
    expect(departmentName({ department: "64b7f0c2a1b2c3d4e5f60718" })).toBe("");
    expect(departmentName({})).toBe("");
  });
  it("reads the id from either shape, for edit forms", () => {
    expect(departmentId({ _id: "abc", name: "X" })).toBe("abc");
    expect(departmentId("abc")).toBe("abc");
    expect(departmentId(null)).toBe("");
    expect(departmentId(undefined)).toBe("");
  });
});
