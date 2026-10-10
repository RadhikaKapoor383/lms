import crypto from "crypto";

// Rules for lesson materials (the files an instructor attaches to a course),
// kept free of Express / Cloudinary so they can be tested directly.
//
// A file is accepted only if BOTH its extension is on the list AND its first
// bytes match what that kind of file really starts with. Checking the name
// alone would let someone upload a script and just call it "notes.pdf".

export const MAX_MATERIAL_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_MATERIALS_PER_COURSE = 100;
export const MAX_TITLE_LENGTH = 120;

const PDF = Buffer.from("%PDF-");
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // .docx / .pptx / .xlsx are zip files
const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // old .doc / .ppt / .xls

const TYPES: Record<string, { mime: string; magic: Buffer }> = {
  pdf: { mime: "application/pdf", magic: PDF },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    magic: ZIP,
  },
  pptx: {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    magic: ZIP,
  },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    magic: ZIP,
  },
  doc: { mime: "application/msword", magic: OLE },
  ppt: { mime: "application/vnd.ms-powerpoint", magic: OLE },
  xls: { mime: "application/vnd.ms-excel", magic: OLE },
};

export const ALLOWED_EXTENSIONS = Object.keys(TYPES);

const startsWith = (buffer: Buffer, magic: Buffer) =>
  buffer.length >= magic.length && buffer.subarray(0, magic.length).equals(magic);

export const getExtension = (fileName: string): string => {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
};

// A name that is safe to show and to put in a download header: no folders, no
// control characters, not too long.
export const safeDisplayName = (name: unknown, fallback = "file"): string => {
  if (typeof name !== "string") return fallback;
  const base = name.split(/[\\/]/).pop() || "";
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\x00-\x1f\x7f"<>|:*?]/g, "").trim();
  return cleaned.slice(0, MAX_TITLE_LENGTH) || fallback;
};

export type MaterialCheck =
  | { ok: true; ext: string; mimeType: string }
  | { ok: false; error: string };

export const checkMaterialFile = (buffer: Buffer, originalName: string): MaterialCheck => {
  if (!buffer || buffer.length === 0) return { ok: false, error: "The file is empty" };
  if (buffer.length > MAX_MATERIAL_BYTES) {
    return { ok: false, error: `The file is too large (maximum ${MAX_MATERIAL_BYTES / 1024 / 1024} MB)` };
  }

  const ext = getExtension(originalName);
  const type = TYPES[ext];
  if (!type) {
    return { ok: false, error: `Allowed file types: ${ALLOWED_EXTENSIONS.join(", ")}` };
  }
  if (!startsWith(buffer, type.magic)) {
    return { ok: false, error: `This file doesn't look like a real .${ext} file` };
  }
  return { ok: true, ext, mimeType: type.mime };
};

// The stored name is random on purpose: nothing the uploader typed ends up in
// the storage path.
export const buildPublicId = (courseId: string, ext: string): string =>
  `lms/materials/${courseId}/${crypto.randomBytes(16).toString("hex")}.${ext}`;

// Content-Disposition that also works for names with non-English letters
// (RFC 5987), while the plain filename stays ASCII-only.
export const attachmentHeader = (fileName: string): string => {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};
