import { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface AuthShellProps {
  title: string;
  subtitle: string;
  /** Shown on the dark panel next to the form (desktop only) */
  panelTitle: string;
  panelPoints: string[];
  children: ReactNode;
}

// Split layout shared by login and sign-up: a dark brand panel on the left
// (hidden on phones) and the form on the right.
export default function AuthShell({
  title,
  subtitle,
  panelTitle,
  panelPoints,
  children,
}: AuthShellProps) {
  return (
    <>
      <Header />
      <main className="grid min-h-[calc(100vh-4.5rem)] md:grid-cols-2">
        <aside className="relative hidden flex-col justify-center overflow-hidden bg-ink px-12 py-16 text-parchment md:flex lg:px-20">
          {/* ledger paper lines + soft glow */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className="absolute left-0 right-0 h-px bg-parchment/[0.06]"
                style={{ top: `${((i + 1) * 100) / 11}%` }}
              />
            ))}
            <span className="absolute inset-y-0 left-10 w-px bg-mustard/30" />
            <div className="absolute -bottom-24 -right-24 h-80 w-80 animate-float rounded-full bg-mustard/10 blur-3xl" />
          </div>

          <div className="relative">
            <p className="animate-fade-up font-display text-2xl">
              Ledger<span className="text-mustard">.</span>
            </p>
            <h2
              className="mt-8 animate-fade-up font-display text-4xl leading-tight lg:text-5xl"
              style={{ animationDelay: "150ms" }}
            >
              {panelTitle}
            </h2>
            <ul className="mt-10 space-y-5">
              {panelPoints.map((point, i) => (
                <li
                  key={point}
                  className="flex animate-fade-up items-start gap-3 text-parchment/80"
                  style={{ animationDelay: `${350 + i * 150}ms` }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="mt-0.5 h-5 w-5 shrink-0 text-mustard"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" className="opacity-30" />
                    <path d="M7 12.5l3.2 3.2L17 9" />
                  </svg>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md animate-fade-up">
            <h1 className="font-display text-3xl text-ink dark:text-parchment md:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-ink/70 dark:text-parchment/70">{subtitle}</p>
            {children}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
