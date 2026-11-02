"use client";

import { useEffect, useState } from "react";

const NAME = "Ledger";
const SEEN_KEY = "ledger:splash-seen";
const SHOW_MS = 2800; // how long the splash plays before it opens
const REDUCED_MS = 600; // much shorter for people who prefer reduced motion
const EXIT_MS = 900; // curtain opening (300ms content fade + 700ms slide, overlapped)

// Entries that get "ticked off" like lines in a ledger (purely decorative)
const ENTRIES = [
  { text: "Courses indexed", at: 1100 },
  { text: "Paths put in order", at: 1550 },
  { text: "Certificates ready", at: 2000 },
];

type Phase = "show" | "leaving" | "gone";

export default function SplashScreen() {
  // Starts as "show" on the server too, so the overlay is in the first paint
  // and the page never flashes before the splash.
  const [phase, setPhase] = useState<Phase>("show");
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // storage can be blocked - just show the splash
    }
    if (seen) {
      setPhase("gone");
      return;
    }

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const showFor = reduced ? REDUCED_MS : SHOW_MS;
    const startedAt = Date.now();

    // percentage counter, eased so it feels like real loading
    const counter = setInterval(() => {
      const t = Math.min(1, (Date.now() - startedAt) / showFor);
      setProgress(Math.round(t * t * (3 - 2 * t) * 100));
    }, 40);

    const leaveTimer = setTimeout(() => {
      clearInterval(counter);
      setProgress(100);
      setPhase("leaving");
    }, showFor);

    const goneTimer = setTimeout(() => {
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // ignore
      }
      setPhase("gone");
    }, showFor + EXIT_MS);

    return () => {
      clearInterval(counter);
      clearTimeout(leaveTimer);
      clearTimeout(goneTimer);
    };
  }, []);

  // Lock page scroll while the splash is on screen
  useEffect(() => {
    if (phase === "gone") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  if (phase === "gone") return null;

  const leaving = phase === "leaving";

  return (
    <div
      data-splash={phase}
      role="status"
      aria-label={`Loading ${NAME}`}
      className="fixed inset-0 z-[100] overflow-hidden text-parchment"
    >
      {/* Two curtain halves - they slide apart at the end to reveal the page */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1/2 bg-ink transition-transform duration-700 ease-[cubic-bezier(0.77,0,0.18,1)] ${
          leaving ? "-translate-y-full delay-200" : ""
        }`}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 h-1/2 bg-ink transition-transform duration-700 ease-[cubic-bezier(0.77,0,0.18,1)] ${
          leaving ? "translate-y-full delay-200" : ""
        }`}
      />

      <div
        className={`relative z-10 flex h-full flex-col items-center justify-center px-6 transition-opacity duration-300 ${
          leaving ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Ledger paper: ruled lines draw across, plus a mustard margin line */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {/* the lines fade out in the middle so they never strike through the text */}
          <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_28%,transparent_72%,black)]">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="absolute left-0 right-0 h-px origin-left animate-line-grow bg-parchment/[0.07]"
                style={{
                  top: `${((i + 1) * 100) / 15}%`,
                  animationDelay: `${i * 70}ms`,
                  animationDuration: "1.2s",
                }}
              />
            ))}
          </div>
          <span
            className="absolute inset-y-0 left-[8%] w-px origin-top animate-line-grow-y bg-mustard/40 md:left-[18%]"
            style={{ animationDelay: "400ms" }}
          />
        </div>

        {/* The name + an accounting-style double underline ("the total") */}
        <div aria-hidden="true" className="relative inline-flex flex-col items-stretch">
          <div className="flex items-end font-display text-6xl font-semibold tracking-tight md:text-8xl">
            {NAME.split("").map((letter, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.15em] leading-none">
                <span
                  className="inline-block animate-letter-rise"
                  style={{ animationDelay: `${400 + i * 90}ms` }}
                >
                  {letter}
                </span>
              </span>
            ))}
            <span className="inline-block pb-[0.15em] leading-none">
              <span
                className="inline-block animate-dot-pop text-mustard"
                style={{ animationDelay: `${400 + NAME.length * 90}ms` }}
              >
                .
              </span>
            </span>
          </div>
          <span
            className="mt-1 block h-px origin-left animate-line-grow bg-mustard"
            style={{ animationDelay: "1100ms", animationDuration: "0.8s" }}
          />
          <span
            className="mt-1 block h-px origin-left animate-line-grow bg-mustard"
            style={{ animationDelay: "1250ms", animationDuration: "0.8s" }}
          />
        </div>

        {/* Entries ticking off one by one */}
        <ul aria-hidden="true" className="mt-10 w-64 space-y-3 text-sm text-parchment/70">
          {ENTRIES.map((entry) => (
            <li
              key={entry.text}
              className="flex animate-letter-in items-center gap-3"
              style={{ animationDelay: `${entry.at}ms` }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0 text-mustard"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" className="opacity-30" />
                <path
                  d="M7 12.5l3.2 3.2L17 9"
                  className="animate-tick [stroke-dasharray:24]"
                  style={{ animationDelay: `${entry.at + 200}ms` }}
                />
              </svg>
              <span>{entry.text}</span>
            </li>
          ))}
        </ul>

        {/* Progress line + counter */}
        <div aria-hidden="true" className="absolute inset-x-6 bottom-8 mx-auto max-w-md">
          <div className="flex items-baseline justify-between text-xs uppercase tracking-[0.25em] text-parchment/50">
            <span>Setting up your catalog</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="mt-2 h-0.5 bg-parchment/15">
            <div
              className="h-full bg-mustard transition-[width] duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
