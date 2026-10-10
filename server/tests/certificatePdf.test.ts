import { describe, expect, it } from "vitest";
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

describe("isPdfSafeText", () => {
  it("accepts Latin names, including accents", () => {
    expect(isPdfSafeText("Radhika Kapoor", "José Müller-Šmith".replace("Š", "S"))).toBe(true);
  });
  it("rejects scripts the built-in fonts can't draw", () => {
    expect(isPdfSafeText("राधिका")).toBe(false);
    expect(isPdfSafeText("رادھیکا")).toBe(false);
    expect(isPdfSafeText("Name", "课程")).toBe(false);
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
