import { InputHTMLAttributes, ReactNode } from "react";

// Shared look for every input on the login / sign-up forms
export const authInputClass =
  "w-full rounded-lg border border-parchment-dark bg-white/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink/30 focus:border-mustard focus:ring-4 focus:ring-mustard/20 dark:border-ink-light dark:bg-ink-light/30 dark:text-parchment dark:placeholder:text-parchment/30";

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const MailIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export const UserIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

export const LockIcon = () => (
  <svg {...iconProps}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string;
}

// Label + input with a left icon + error message. The label is linked to the
// input with htmlFor, so screen readers (and the e2e tests) can find it by text.
export default function AuthField({ id, label, icon, error, className = "", ...props }: AuthFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm text-ink/70 dark:text-parchment/70">
        {label}
      </label>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink/40 dark:text-parchment/40">
          {icon}
        </span>
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          {...props}
          className={`${authInputClass} pl-11 ${className}`}
        />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-clay">
          {error}
        </p>
      )}
    </div>
  );
}
