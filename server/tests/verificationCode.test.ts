import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { CODE_DIGITS, checkCodeToken, createCodeToken, generateCode } from "../src/services/verificationCode.service";

const SECRET = "test-secret";

describe("generateCode", () => {
  it("is always 6 digits, including leading zeros", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCode()).toMatch(new RegExp(`^\\d{${CODE_DIGITS}}$`));
    }
  });
});

describe("code tokens", () => {
  it("never contain the code, and hold the payload", () => {
    const { token, code } = createCodeToken({ userId: "u1", newEmail: "a@b.com" }, SECRET, "5m");
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    expect(JSON.stringify(payload)).not.toContain(code);
    expect(payload.userId).toBe("u1");
  });

  it("accept the right code (even with spaces) and hand back only the payload", () => {
    const { token, code } = createCodeToken({ userId: "u1" }, SECRET, "5m");
    const r = checkCodeToken<{ userId: string }>(token, ` ${code} `, SECRET);
    expect(r).toEqual({ ok: true, payload: { userId: "u1" } });
  });

  it("reject a wrong code", () => {
    const { token, code } = createCodeToken({ userId: "u1" }, SECRET, "5m");
    const wrong = code === "000000" ? "000001" : "000000";
    expect(checkCodeToken(token, wrong, SECRET)).toEqual({ ok: false, reason: "wrong_code" });
  });

  it("reject an expired token", () => {
    const { token, code } = createCodeToken({ userId: "u1" }, SECRET, -10);
    expect(checkCodeToken(token, code, SECRET)).toEqual({ ok: false, reason: "expired" });
  });

  it("reject a token signed with another secret, junk, and tokens without a code hash", () => {
    const { token, code } = createCodeToken({ userId: "u1" }, SECRET, "5m");
    expect(checkCodeToken(token, code, "other-secret")).toEqual({ ok: false, reason: "invalid" });
    expect(checkCodeToken("not.a.token", code, SECRET)).toEqual({ ok: false, reason: "invalid" });
    const old = jwt.sign({ user: { name: "x" }, activationCode: "1234" }, SECRET);
    expect(checkCodeToken(old, "1234", SECRET)).toEqual({ ok: false, reason: "invalid" });
  });

  it("a code from one token does not open another token", () => {
    const a = createCodeToken({ userId: "a" }, SECRET, "5m");
    const b = createCodeToken({ userId: "b" }, SECRET, "5m");
    if (a.code !== b.code) {
      expect(checkCodeToken(b.token, a.code, SECRET).ok).toBe(false);
    }
  });
});
