import { describe, expect, it } from "vitest";
import { parseHttpsUrl } from "../src/utils/safeUrl";

describe("parseHttpsUrl", () => {
  it("accepts normal https links", () => {
    expect(parseHttpsUrl("https://drive.google.com/file/d/abc/view")).toBe("https://drive.google.com/file/d/abc/view");
    expect(parseHttpsUrl("  https://example.com/a?b=1  ")).toBe("https://example.com/a?b=1");
  });
  it("rejects dangerous or unusable schemes", () => {
    expect(parseHttpsUrl("javascript:alert(1)")).toBeNull();
    expect(parseHttpsUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(parseHttpsUrl("file:///etc/passwd")).toBeNull();
    expect(parseHttpsUrl("http://example.com")).toBeNull();
    expect(parseHttpsUrl("ftp://example.com/x")).toBeNull();
  });
  it("rejects embedded credentials, single-label hosts, junk and non-strings", () => {
    expect(parseHttpsUrl("https://user:pass@example.com")).toBeNull();
    expect(parseHttpsUrl("https://localhost/x")).toBeNull();
    expect(parseHttpsUrl("not a url")).toBeNull();
    expect(parseHttpsUrl("")).toBeNull();
    expect(parseHttpsUrl(null)).toBeNull();
    expect(parseHttpsUrl({ toString: () => "https://example.com" })).toBeNull();
  });
  it("rejects very long links", () => {
    expect(parseHttpsUrl("https://example.com/" + "a".repeat(2100))).toBeNull();
  });
});
