import { describe, expect, it } from "vitest";
import { pickCourseFields } from "../src/services/courseFields.service";

const body = {
  name: "Intro", price: 10, durationHours: 5,
  status: "Published", instructor: "someone", ratings: 5, purchased: 999,
  reviews: [{ rating: 5 }], enrollmentCodeHash: "x", _id: "y", courseData: [],
};

describe("pickCourseFields", () => {
  it("keeps editable fields and drops everything else for an instructor", () => {
    const out = pickCourseFields(body, false);
    expect(out).toEqual({ name: "Intro", price: 10, durationHours: 5 });
  });
  it("lets an admin also set status and instructor, but never ratings/purchased/reviews", () => {
    const out = pickCourseFields(body, true);
    expect(out.status).toBe("Published");
    expect(out.instructor).toBe("someone");
    expect(out).not.toHaveProperty("ratings");
    expect(out).not.toHaveProperty("purchased");
    expect(out).not.toHaveProperty("reviews");
    expect(out).not.toHaveProperty("enrollmentCodeHash");
  });
  it("treats an empty duration as not set", () => {
    expect(pickCourseFields({ name: "a", durationHours: "" }, false)).toEqual({ name: "a" });
  });
  it("handles a missing body", () => {
    expect(pickCourseFields(undefined, false)).toEqual({});
  });
});
