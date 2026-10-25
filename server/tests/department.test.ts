import { describe, expect, it } from "vitest";
import {
  cleanDepartmentName,
  departmentForNewCourse,
  exactNamePattern,
  readDepartmentInput,
} from "../src/services/department.service";
import { pickCourseFields } from "../src/services/courseFields.service";

const DEPT = "64b7f0c2a1b2c3d4e5f60718";
const OWN = "64b7f0c2a1b2c3d4e5f60719";

describe("department names", () => {
  it("trims and collapses spaces", () => {
    expect(cleanDepartmentName("  Computer   Science ")).toEqual({ name: "Computer Science" });
  });
  it("refuses empty, non-text and over-long names", () => {
    expect(cleanDepartmentName("   ")).toEqual({ error: "Department name is required" });
    expect(cleanDepartmentName(undefined)).toEqual({ error: "Department name is required" });
    expect(cleanDepartmentName({ $gt: "" })).toEqual({ error: "Department name is required" });
    expect("error" in cleanDepartmentName("x".repeat(81))).toBe(true);
    expect(cleanDepartmentName("x".repeat(80))).toEqual({ name: "x".repeat(80) });
  });
  it("matches an existing name regardless of case, and treats regex characters literally", () => {
    expect(exactNamePattern("Arts & Design").test("arts & design")).toBe(true);
    expect(exactNamePattern("Arts & Design").test("Arts & Design School")).toBe(false);
    expect(exactNamePattern("C++ (Systems)").test("c++ (systems)")).toBe(true);
    expect(exactNamePattern(".*").test("Anything")).toBe(false);
  });
});

describe("department value from the course form", () => {
  it("tells 'not sent', 'none' and an id apart", () => {
    expect(readDepartmentInput(undefined)).toBeUndefined();
    expect(readDepartmentInput("")).toBeNull();
    expect(readDepartmentInput(null)).toBeNull();
    expect(readDepartmentInput(DEPT)).toBe(DEPT);
    expect(readDepartmentInput({ _id: DEPT, name: "CS" })).toBe(DEPT);
  });
  it("pickCourseFields keeps the department and turns empty into null", () => {
    expect(pickCourseFields({ name: "a", department: DEPT }, false)).toEqual({ name: "a", department: DEPT });
    expect(pickCourseFields({ name: "a", department: "" }, false)).toEqual({ name: "a", department: null });
    expect(pickCourseFields({ name: "a" }, false)).toEqual({ name: "a" });
  });
});

describe("department of a new course", () => {
  it("an instructor who leaves it empty gets their own department", () => {
    expect(departmentForNewCourse(null, "instructor", OWN)).toBe(OWN);
    expect(departmentForNewCourse(undefined, "instructor", OWN)).toBe(OWN);
  });
  it("an instructor's explicit choice wins over their own department", () => {
    expect(departmentForNewCourse(DEPT, "instructor", OWN)).toBe(DEPT);
  });
  it("an instructor without a department gets none", () => {
    expect(departmentForNewCourse(null, "instructor", null)).toBeNull();
    expect(departmentForNewCourse(null, "instructor", undefined)).toBeNull();
  });
  it("an admin's empty choice stays empty", () => {
    expect(departmentForNewCourse(null, "admin", OWN)).toBeNull();
    expect(departmentForNewCourse(DEPT, "admin", null)).toBe(DEPT);
  });
});
