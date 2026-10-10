import { describe, expect, it } from "vitest";
import {
  MAX_MATERIAL_BYTES,
  attachmentHeader,
  buildPublicId,
  checkMaterialFile,
  getExtension,
  safeDisplayName,
} from "../src/services/materialFile.service";

const pdf = Buffer.from("%PDF-1.7\n...rest of file");
const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("....")]);
const ole = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.from("....")]);

describe("checkMaterialFile", () => {
  it("accepts real files of each allowed kind", () => {
    expect(checkMaterialFile(pdf, "notes.pdf")).toEqual({ ok: true, ext: "pdf", mimeType: "application/pdf" });
    expect(checkMaterialFile(zip, "slides.PPTX")).toMatchObject({ ok: true, ext: "pptx" });
    expect(checkMaterialFile(zip, "essay.docx")).toMatchObject({ ok: true, ext: "docx" });
    expect(checkMaterialFile(zip, "marks.xlsx")).toMatchObject({ ok: true, ext: "xlsx" });
    expect(checkMaterialFile(ole, "old.doc")).toMatchObject({ ok: true, ext: "doc" });
  });

  it("rejects a file whose content does not match its extension", () => {
    expect(checkMaterialFile(Buffer.from("<script>alert(1)</script>"), "notes.pdf")).toMatchObject({ ok: false });
    expect(checkMaterialFile(pdf, "slides.pptx")).toMatchObject({ ok: false }); // pdf bytes, pptx name
    expect(checkMaterialFile(zip, "old.doc")).toMatchObject({ ok: false }); // zip bytes, doc name
  });

  it("rejects types that aren't on the list, however they're named", () => {
    for (const name of ["run.exe", "page.html", "image.svg", "script.js", "archive.zip", "noext", "x.pdf.exe"]) {
      expect(checkMaterialFile(pdf, name)).toMatchObject({ ok: false });
    }
  });

  it("rejects empty and oversized files", () => {
    expect(checkMaterialFile(Buffer.alloc(0), "a.pdf")).toMatchObject({ ok: false });
    const big = Buffer.concat([pdf, Buffer.alloc(MAX_MATERIAL_BYTES)]);
    expect(checkMaterialFile(big, "a.pdf")).toMatchObject({ ok: false, error: expect.stringContaining("too large") });
  });
});

describe("names", () => {
  it("getExtension is lowercase and takes the last part", () => {
    expect(getExtension("Report.Final.PDF")).toBe("pdf");
    expect(getExtension("noext")).toBe("");
  });

  it("safeDisplayName strips folders, control characters and quotes", () => {
    expect(safeDisplayName("../../etc/passwd")).toBe("passwd");
    expect(safeDisplayName("C:\\Users\\me\\notes.pdf")).toBe("notes.pdf");
    expect(safeDisplayName('a"b\r\nc.pdf')).toBe("abc.pdf");
    expect(safeDisplayName("   ", "fallback")).toBe("fallback");
    expect(safeDisplayName({ x: 1 }, "fallback")).toBe("fallback");
    expect(safeDisplayName("x".repeat(500)).length).toBe(120);
  });

  it("storage ids are random, under the course, and never contain the uploader's name", () => {
    const a = buildPublicId("course1", "pdf");
    const b = buildPublicId("course1", "pdf");
    expect(a).toMatch(/^lms\/materials\/course1\/[0-9a-f]{32}\.pdf$/);
    expect(a).not.toBe(b);
  });

  it("attachmentHeader keeps a plain ASCII filename and an encoded full one", () => {
    const h = attachmentHeader("Résumé guide.pdf");
    expect(h).toContain('filename="R_sum_ guide.pdf"');
    expect(h).toContain("filename*=UTF-8''R%C3%A9sum%C3%A9%20guide.pdf");
    expect(attachmentHeader('evil".pdf')).not.toContain('evil"');
  });
});
