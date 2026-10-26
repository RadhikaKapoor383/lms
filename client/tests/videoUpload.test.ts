import { describe, expect, it } from "vitest";
import { pieces, uploadVideoInPieces } from "../src/utils/videoUpload";

const ticket = {
  url: "https://api.cloudinary.com/v1_1/demo/video/upload",
  apiKey: "key",
  publicId: "lms/videos/c1/abcdef",
  timestamp: 1700000000,
  type: "authenticated",
  signature: "sig",
  maxBytes: 1000,
  chunkBytes: 400,
};
const blob = (size: number) => new Blob([new Uint8Array(size)]);

describe("chunked video upload", () => {
  it("splits a file into pieces", () => {
    expect(pieces(1000, 400)).toEqual([[0, 400], [400, 800], [800, 1000]]);
    expect(pieces(400, 400)).toEqual([[0, 400]]);
    expect(pieces(0, 400)).toEqual([]);
  });

  it("sends every piece with the signed fields, one upload id and its byte range", async () => {
    const calls: { headers: Record<string, string>; fields: Record<string, string>; size: number }[] = [];
    const progress: number[] = [];
    const out = await uploadVideoInPieces(
      blob(900),
      ticket,
      async (_url, form, headers, onProgress) => {
        const file = form.get("file") as Blob;
        const fields: Record<string, string> = {};
        for (const k of ["api_key", "timestamp", "public_id", "type", "signature"]) fields[k] = String(form.get(k));
        calls.push({ headers, fields, size: file.size });
        onProgress(file.size);
        return { status: 200, body: { public_id: ticket.publicId } };
      },
      (f) => progress.push(f)
    );
    expect(out).toEqual({ publicId: ticket.publicId });
    expect(calls.map((c) => c.headers["Content-Range"])).toEqual(["bytes 0-399/900", "bytes 400-799/900", "bytes 800-899/900"]);
    expect(new Set(calls.map((c) => c.headers["X-Unique-Upload-Id"])).size).toBe(1);
    expect(calls.map((c) => c.size)).toEqual([400, 400, 100]);
    expect(calls[0].fields).toEqual({ api_key: "key", timestamp: "1700000000", public_id: ticket.publicId, type: "authenticated", signature: "sig" });
    expect(progress[progress.length - 1]).toBe(1);
    expect(progress.every((p, i) => i === 0 || p >= progress[i - 1])).toBe(true);
  });

  it("refuses a file over the limit before sending anything", async () => {
    let sent = 0;
    await expect(uploadVideoInPieces(blob(1001), ticket, async () => { sent++; return { status: 200, body: {} }; })).rejects.toThrow(/larger than/);
    expect(sent).toBe(0);
  });

  it("stops at the first failed piece with storage's reason", async () => {
    let sent = 0;
    const err = await uploadVideoInPieces(blob(900), ticket, async () => {
      sent++;
      return sent === 2 ? { status: 400, body: { error: { message: "Invalid Signature" } } } : { status: 200, body: {} };
    }).catch((e) => e);
    expect(err.message).toBe("Invalid Signature");
    expect(sent).toBe(2);
  });
});
