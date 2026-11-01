import { getPasswordStrength } from "@/utils/passwordStrength";

const barColor = ["bg-clay", "bg-clay", "bg-mustard", "bg-mustard", "bg-emerald-600"];

export default function PasswordStrength({ password }: { password: string }) {
  const { score, label } = getPasswordStrength(password);
  if (!password) return null;

  // "Too short" has score 0 but should still light the first bar in red
  const lit = Math.max(score, 1);

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              n <= lit ? barColor[score] : "bg-parchment-dark dark:bg-ink-light"
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-ink/60 dark:text-parchment/60">
        Password strength: <span className="font-medium">{label}</span>
      </p>
    </div>
  );
}
