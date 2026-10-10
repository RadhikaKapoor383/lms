import crypto from "crypto";
import jwt from "jsonwebtoken";

// "Prove you own this inbox" codes (sign-up, email change).
//
// The code is mailed to the person and ONLY a keyed hash of it goes into the
// token that is handed back to the browser. A JWT is signed, not encrypted -
// anyone holding it can read its payload - so the real code must never be in
// there. Whoever has the token still can't work out the code without guessing
// (and guesses are rate limited by the caller).

export const CODE_DIGITS = 6;

export const generateCode = (): string =>
  crypto.randomInt(0, 10 ** CODE_DIGITS).toString().padStart(CODE_DIGITS, "0");

const hashCode = (code: string, nonce: string, secret: string): string =>
  crypto.createHmac("sha256", secret).update(`${nonce}:${code}`).digest("hex");

export const createCodeToken = <T extends object>(
  payload: T,
  secret: string,
  expiresIn: jwt.SignOptions["expiresIn"]
): { token: string; code: string } => {
  const code = generateCode();
  const nonce = crypto.randomBytes(16).toString("hex");
  const token = jwt.sign({ ...payload, nonce, codeHash: hashCode(code, nonce, secret) }, secret, {
    expiresIn,
  });
  return { token, code };
};

export type CodeCheck<T> =
  | { ok: true; payload: T }
  | { ok: false; reason: "expired" | "invalid" | "wrong_code" };

export const checkCodeToken = <T extends object>(
  token: string,
  code: string,
  secret: string
): CodeCheck<T> => {
  let decoded: any;
  try {
    decoded = jwt.verify(token, secret);
  } catch (error: any) {
    return { ok: false, reason: error?.name === "TokenExpiredError" ? "expired" : "invalid" };
  }

  if (typeof decoded?.nonce !== "string" || typeof decoded?.codeHash !== "string") {
    return { ok: false, reason: "invalid" }; // e.g. a token from an older version
  }

  const expected = Buffer.from(decoded.codeHash, "hex");
  const given = Buffer.from(hashCode(code.trim(), decoded.nonce, secret), "hex");
  const same = expected.length === given.length && crypto.timingSafeEqual(expected, given);
  if (!same) return { ok: false, reason: "wrong_code" };

  const { nonce: _nonce, codeHash: _codeHash, iat: _iat, exp: _exp, ...payload } = decoded;
  return { ok: true, payload: payload as T };
};
