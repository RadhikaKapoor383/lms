import { describe, expect, it } from "vitest";
import { parseSettingsUpdate } from "../src/services/settings.service";

describe("parseSettingsUpdate", () => {
  it("accepts the three switches and a name", () => {
    const r = parseSettingsUpdate({
      platformName: " My LMS ", requireCourseApproval: true,
      allowSelfEnrollment: false, requireStudentApproval: true,
    });
    expect(r).toEqual({
      update: { platformName: "My LMS", requireCourseApproval: true, allowSelfEnrollment: false, requireStudentApproval: true },
    });
  });
  it("rejects non-boolean switches and bad names", () => {
    expect(parseSettingsUpdate({ requireStudentApproval: "yes" })).toHaveProperty("error");
    expect(parseSettingsUpdate({ platformName: "" })).toHaveProperty("error");
    expect(parseSettingsUpdate({ platformName: "x".repeat(61) })).toHaveProperty("error");
  });
  it("ignores unknown keys and refuses an empty update", () => {
    expect(parseSettingsUpdate({ somethingElse: true })).toEqual({ error: "Nothing to update" });
  });
});
