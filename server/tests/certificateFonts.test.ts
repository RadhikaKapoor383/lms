import { describe, expect, it } from "vitest";
import path from "path";
import { availableFonts, canDrawAll, scriptOf } from "../src/services/certificateFonts.service";

describe("which script a certificate text is in", () => {
  it("Latin, with accents, digits and punctuation", () => {
    expect(scriptOf("Radhika Kapoor")).toBe("latin");
    expect(scriptOf("José Müller, Jr. (2026)")).toBe("latin");
  });
  it("Urdu / Arabic script, with spaces, digits and zero-width joiners", () => {
    expect(scriptOf("رادھیکا کپور")).toBe("arabic");
    expect(scriptOf("علی ۲۰۲۶")).toBe("arabic");
    expect(scriptOf("نسخ‌علی")).toBe("arabic");
  });
  it("Hindi / Devanagari", () => {
    expect(scriptOf("राधिका कपूर")).toBe("devanagari");
    expect(scriptOf("क्षत्रिय‍")).toBe("devanagari");
  });
  it("mixed scripts, scripts with no font, and control characters can't be drawn with one font", () => {
    expect(scriptOf("Ali علی")).toBeNull();
    expect(scriptOf("राधिका رادھیکا")).toBeNull();
    expect(scriptOf("课程")).toBeNull();
    expect(scriptOf("Line\nBreak")).toBeNull();
  });
});

describe("available fonts", () => {
  const dir = "/fonts";
  const has = (...files: string[]) => (p: string) => files.map((f) => path.join(dir, f)).includes(p);

  it("finds a script's files; a missing bold uses the regular file", () => {
    expect(availableFonts(dir, has("NotoNaskhArabic-Regular.ttf"))).toEqual({
      arabic: { regular: path.join(dir, "NotoNaskhArabic-Regular.ttf"), bold: path.join(dir, "NotoNaskhArabic-Regular.ttf") },
    });
  });
  it("a script with only a bold file has no font", () => {
    expect(availableFonts(dir, has("NotoSansDevanagari-Bold.ttf"))).toEqual({});
  });
  it("can draw a text only when its script's font is there", () => {
    const arabicOnly = availableFonts(dir, has("NotoNaskhArabic-Regular.ttf"));
    expect(canDrawAll(["Radhika", "رادھیکا"], arabicOnly)).toBe(true);
    expect(canDrawAll(["राधिका"], arabicOnly)).toBe(false);
    expect(canDrawAll(["Ali علی"], arabicOnly)).toBe(false);
    expect(canDrawAll(["Radhika"], {})).toBe(true);
  });
});
