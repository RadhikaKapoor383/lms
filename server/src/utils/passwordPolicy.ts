// One place that decides what a valid new password is, used by registration,
// "change password" and "reset password".
//
// Minimum 6 matches the model and the client forms. Raise MIN_LENGTH here (and
// in client/src/utils/validationSchemas.ts) to tighten it everywhere at once.
//
// The maximum is 72 BYTES because bcrypt silently ignores everything after the
// 72nd byte: without a cap, two long passwords that differ only past that point
// would be treated as the same password.

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_BYTES = 72;

// Returns an error message, or null when the password is acceptable.
export const validatePassword = (password: unknown): string | null => {
  if (typeof password !== "string") return "Please enter a password";
  if (password.trim().length === 0) return "Password can't be blank";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    return `Password is too long (at most ${MAX_PASSWORD_BYTES} bytes)`;
  }
  return null;
};
