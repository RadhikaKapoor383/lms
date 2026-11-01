export interface PasswordStrength {
  /** 0 = nothing typed / too short, 4 = strong */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

// A friendly hint for the sign-up form, not a rule: the only enforced rule is
// still registerSchema (at least 8 characters).
export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return { score: 0, label: "" };
  if (password.length < 8) return { score: 0, label: "Too short" };

  const checks = [
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const passed = checks.filter(Boolean).length;
  const score = Math.max(1, passed) as 1 | 2 | 3 | 4;
  const labels = ["", "Weak", "Okay", "Good", "Strong"];
  return { score, label: labels[score] };
}
