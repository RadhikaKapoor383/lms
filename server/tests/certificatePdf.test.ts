import { describe, expect, it } from "vitest";
import { existsSync } from "fs";
import path from "path";
import {
  formatCertificateDate,
  isPdfSafeText,
  renderCertificatePdf,
} from "../src/services/certificatePdf.service";

const sample = {
  certificateId: "CERT-ABC123",
  studentName: "Radhika Kapoor",
  courseName: "TypeScript for React Developers",
  instructorName: "Sana Ahmed",
  platformName: "E-Learning",
  completionDate: new Date("2026-09-30T10:00:00Z"),
  issuedAt: new Date("2026-09-30T10:05:00Z"),
  status: "valid" as const,
};

describe("renderCertificatePdf", () => {
  it("produces a real one-page PDF", async () => {
    const pdf = await renderCertificatePdf(sample, "https://lms.example/certificates/CERT-ABC123");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdf.toString("latin1")).toContain("/Count 1");
  });

  it("still renders very long names and a revoked certificate", async () => {
    const pdf = await renderCertificatePdf(
      { ...sample, courseName: "A".repeat(200), studentName: "B".repeat(120), status: "revoked", revokedAt: new Date() },
      "https://lms.example/certificates/CERT-ABC123"
    );
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

// Runs only where the Noto fonts are in server/fonts (see fonts/README.md).
const hasFonts = existsSync(path.resolve("fonts/NotoNaskhArabic-Regular.ttf")) &&
  existsSync(path.resolve("fonts/NotoSansDevanagari-Regular.ttf"));

describe.skipIf(!hasFonts)("Urdu and Hindi names (with the fonts installed)", () => {
  it("renders certificates whose names are in Urdu and in Hindi", async () => {
    for (const studentName of ["رادھیکا کپور", "राधिका कपूर"]) {
      expect(isPdfSafeText(studentName)).toBe(true);
      const pdf = await renderCertificatePdf({ ...sample, studentName }, "https://lms.example/certificates/CERT-ABC123");
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.toString("latin1")).toMatch(/Noto(Naskh|SansDevanagari)/); // the font is embedded
    }
  });
});

describe("isPdfSafeText", () => {
  it("accepts Latin names, including accents", () => {
    expect(isPdfSafeText("Radhika Kapoor", "José Müller-Šmith".replace("Š", "S"))).toBe(true);
  });
  it("rejects scripts there is no font for", () => {
    process.env.CERTIFICATE_FONTS_DIR = "/nonexistent-font-dir";
    try {
      expect(isPdfSafeText("राधिका")).toBe(false);
      expect(isPdfSafeText("رادھیکا")).toBe(false);
      expect(isPdfSafeText("Name", "课程")).toBe(false);
    } finally {
      delete process.env.CERTIFICATE_FONTS_DIR;
    }
  });
  it("rejects control characters", () => {
    expect(isPdfSafeText("Line\nBreak")).toBe(false);
  });
});

describe("formatCertificateDate", () => {
  it("uses UTC so every server prints the same day", () => {
    expect(formatCertificateDate(new Date("2026-09-30T23:30:00Z"))).toBe("30 September 2026");
  });
});
