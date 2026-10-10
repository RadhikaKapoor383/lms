import http from "http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// The upload middleware pulls in the rate limiter, which would try to reach Redis.
vi.mock("../src/utils/redis", () => ({ redis: {} }));

import { receiveMaterialFile } from "../src/controllers/material.controller";

// A real (tiny) server, so multer reads a genuine multipart request.
let server: http.Server;
let base = "";

beforeAll(async () => {
  const app = express();
  app.post("/up", receiveMaterialFile, (req, res) => {
    res.json({ name: req.file?.originalname, size: req.file?.size, title: req.body?.title });
  });
  // same shape as the app's error handler
  app.use((err: any, _req: any, res: any, _next: any) => res.status(err.statusCode || 500).json({ message: err.message }));
  await new Promise<void>((r) => (server = app.listen(0, r)));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

const send = (parts: (form: FormData) => void) => {
  const form = new FormData();
  parts(form);
  return fetch(`${base}/up`, { method: "POST", body: form });
};

describe("receiveMaterialFile", () => {
  it("reads a file and the text fields", async () => {
    const res = await send((f) => {
      f.append("title", "Week 1 slides");
      f.append("file", new Blob(["%PDF-1.7 hello"]), "week1.pdf");
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "week1.pdf", size: 14, title: "Week 1 slides" });
  });

  it("turns a file over 10 MB into a clear 400", async () => {
    const res = await send((f) => f.append("file", new Blob([Buffer.alloc(10 * 1024 * 1024 + 1024)]), "big.pdf"));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/too large/);
  });

  it("rejects a file sent under the wrong field name", async () => {
    const res = await send((f) => f.append("document", new Blob(["%PDF-"]), "a.pdf"));
    expect(res.status).toBe(400);
  });

  it("rejects more than one file", async () => {
    const res = await send((f) => {
      f.append("file", new Blob(["%PDF-"]), "a.pdf");
      f.append("file", new Blob(["%PDF-"]), "b.pdf");
    });
    expect(res.status).toBe(400);
  });
});
