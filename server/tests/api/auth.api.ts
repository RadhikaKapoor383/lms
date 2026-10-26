// Refresh-token rotation against the REAL running server and its Redis.
// See tests/api/departments.api.ts for how to run (npm run test:api).

import { describe, expect, it } from "vitest";
import dotenv from "dotenv";
dotenv.config();

const API = process.env.API_URL || "http://localhost:8000/api/v1";
const WHO = { email: process.env.API_ADMIN_EMAIL || "admin@ledger.dev", password: process.env.API_ADMIN_PASSWORD || "admin1234" };

const cookiesOf = (res: Response) =>
  Object.fromEntries(res.headers.getSetCookie().map((c) => c.split(";")[0].split("=")).map(([k, ...v]) => [k, v.join("=")]));

const login = async () => {
  const res = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(WHO) });
  expect(res.status).toBe(200);
  return cookiesOf(res);
};
const refresh = async (refreshToken: string) => {
  const res = await fetch(`${API}/refresh`, { headers: { Cookie: `refresh_token=${refreshToken}` } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, cookies: cookiesOf(res) };
};
const me = (accessToken: string) => fetch(`${API}/me`, { headers: { Cookie: `access_token=${accessToken}` } });

describe("refresh-token rotation", () => {
  it("each refresh hands out a new refresh token", async () => {
    const first = await login();
    const r1 = await refresh(first.refresh_token);
    expect(r1.status).toBe(200);
    expect(r1.cookies.refresh_token).toBeTruthy();
    expect(r1.cookies.refresh_token).not.toBe(first.refresh_token);
    const r2 = await refresh(r1.cookies.refresh_token);
    expect(r2.status).toBe(200);
    expect(r2.cookies.refresh_token).not.toBe(r1.cookies.refresh_token);
  });

  it("two tabs refreshing with the same token at the same moment both succeed", async () => {
    const first = await login();
    const [a, b] = await Promise.all([refresh(first.refresh_token), refresh(first.refresh_token)]);
    expect([a.status, b.status]).toEqual([200, 200]);
  });

  it("a refresh token used again after it was replaced ends the whole login", async () => {
    const first = await login();
    const r1 = await refresh(first.refresh_token);
    const r2 = await refresh(r1.cookies.refresh_token); // first is now two steps old
    expect(r2.status).toBe(200);

    const replay = await refresh(first.refresh_token);
    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe("SESSION_REVOKED");

    // the real user's newest tokens are dead too
    expect((await refresh(r2.cookies.refresh_token)).status).toBe(401);
    expect((await me(r2.cookies.access_token)).status).toBe(401);
  });

  it("a different login of the same person is not affected", async () => {
    const other = await login();
    const victim = await login();
    const v1 = await refresh(victim.refresh_token);
    await refresh(v1.cookies.refresh_token);
    expect((await refresh(victim.refresh_token)).status).toBe(401);
    expect((await refresh(other.refresh_token)).status).toBe(200);
  });
});
