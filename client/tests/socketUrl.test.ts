import { describe, expect, it } from "vitest";
import { socketOrigin } from "../src/utils/socketUrl";

describe("socket server address", () => {
  it("is the API's origin", () => {
    expect(socketOrigin("http://localhost:8000/api/v1")).toBe("http://localhost:8000");
    expect(socketOrigin("https://api.school.example/api/v1/")).toBe("https://api.school.example");
  });
  it("nothing when the API address is missing or broken", () => {
    expect(socketOrigin(undefined)).toBeNull();
    expect(socketOrigin("not a url")).toBeNull();
  });
});
