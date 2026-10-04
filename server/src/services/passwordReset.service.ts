import crypto from "crypto";

export const RESET_EXPIRE_MINUTES = parseInt(process.env.PASSWORD_RESET_EXPIRE_MINUTES || "30", 10);

// What goes in the email is a random 256-bit token. What goes in the database
// is only its SHA-256, so a leaked database (or backup) can't be used to reset
// anyone's password: the stored value can't be turned back into a working link.
export const hashResetToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString("hex"); // 64 hex characters
  return { token, tokenHash: hashResetToken(token) };
};

// Shape check before touching the database: anything that isn't exactly 64
// hex characters can't be a token we issued.
export const looksLikeResetToken = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export const buildResetUrl = (token: string) => {
  const base = (process.env.ORIGIN || "http://localhost:3000").split(",")[0].trim().replace(/\/$/, "");
  return `${base}/reset-password/${token}`;
};

export const resetExpiryFrom = (now: Date = new Date()) =>
  new Date(now.getTime() + RESET_EXPIRE_MINUTES * 60 * 1000);
