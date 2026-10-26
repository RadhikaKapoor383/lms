import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import {
  NOTHING_DENIED, PERMISSIONS, allowedKeysFor, describePermissions, getPermission, isAllowed, parsePermissionUpdate,
} from "../src/services/permissions.service";

describe("role permissions", () => {
  it("everything is allowed until an admin switches something off", () => {
    for (const p of PERMISSIONS) expect(isAllowed(p.role, p.key, NOTHING_DENIED), p.key).toBe(true);
  });
  it("a switched-off permission stops only that role", () => {
    const denied = { instructor: ["quiz.manage"], student: ["review.write"] };
    expect(isAllowed("instructor", "quiz.manage", denied)).toBe(false);
    expect(isAllowed("instructor", "assignment.manage", denied)).toBe(true);
    expect(isAllowed("student", "review.write", denied)).toBe(false);
    // a student switch never stops an instructor, and the other way round
    expect(isAllowed("instructor", "review.write", denied)).toBe(true);
    expect(isAllowed("student", "quiz.manage", denied)).toBe(true);
  });
  it("admins can always do everything", () => {
    const all = { instructor: PERMISSIONS.filter((p) => p.role === "instructor").map((p) => p.key), student: PERMISSIONS.filter((p) => p.role === "student").map((p) => p.key) };
    for (const p of PERMISSIONS) expect(isAllowed("admin", p.key, all)).toBe(true);
  });
  it("reads the admin page's switches", () => {
    expect(parsePermissionUpdate({ instructor: { "quiz.manage": false, "course.create": true } })).toEqual({
      denied: { instructor: ["quiz.manage"], student: [] },
    });
  });
  it("refuses unknown keys, keys of the other role, non-booleans and bad shapes", () => {
    expect(parsePermissionUpdate({ instructor: { "make.coffee": false } })).toEqual({ error: "Unknown instructor permission: make.coffee" });
    expect(parsePermissionUpdate({ student: { "quiz.manage": false } })).toEqual({ error: "Unknown student permission: quiz.manage" });
    expect(parsePermissionUpdate({ instructor: { "quiz.manage": "no" } })).toEqual({ error: "quiz.manage must be true or false" });
    expect(parsePermissionUpdate({ instructor: ["quiz.manage"] })).toEqual({ error: "Permissions for instructor must be an object" });
    expect("error" in parsePermissionUpdate(null)).toBe(true);
  });
  it("describes every permission for the admin page and lists what one role may use", () => {
    const denied = { instructor: ["quiz.manage"], student: [] };
    const rows = describePermissions(denied);
    expect(rows).toHaveLength(PERMISSIONS.length);
    expect(rows.find((r) => r.key === "quiz.manage")!.allowed).toBe(false);
    expect(allowedKeysFor("instructor", denied)).not.toContain("quiz.manage");
    expect(allowedKeysFor("instructor", denied)).toContain("course.create");
    expect(allowedKeysFor("student", denied)).not.toContain("course.create");
  });
  it("keys are unique and every key used in a route exists", () => {
    expect(new Set(PERMISSIONS.map((p) => p.key)).size).toBe(PERMISSIONS.length);
    const dir = path.resolve("src/routes"); // tests run from server/
    const used = new Set<string>();
    for (const f of readdirSync(dir)) {
      for (const m of readFileSync(path.join(dir, f), "utf8").matchAll(/requirePermission\("([^"]+)"\)/g)) used.add(m[1]);
    }
    for (const key of used) expect(getPermission(key), key).toBeDefined();
    // and every permission is enforced somewhere (a switch that does nothing would mislead admins)
    for (const p of PERMISSIONS) expect(used.has(p.key), `${p.key} is not used by any route`).toBe(true);
  });
});
