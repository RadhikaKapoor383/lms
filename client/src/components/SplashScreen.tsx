"use client";

import { useEffect, useState } from "react";

const NAME = "Ledger";
const TAGLINE = "Learn something worth keeping";
const SEEN_KEY = "ledger:splash-seen";
const SHOW_MS = 2400; // how long the splash stays fully visible
const REDUCED_MS = 600; // shorter for people who prefer reduced motion
const FADE_MS = 500; // fade-out duration (matches duration-500 below)

type Phase = "show" | "leaving" | "gone";

export default function SplashScreen() {
  // Starts as "show" on the server too, so the overlay is in the first paint
  // and the page never flashes before the splash.
  const [phase, setPhase] = useState<Phase>("show");

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

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const showFor = reduced ? REDUCED_MS : SHOW_MS;

    const leaveTimer = setTimeout(() => setPhase("leaving"), showFor);
    const goneTimer = setTimeout(() => {
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // ignore
      }
      setPhase("gone");
    }, showFor + FADE_MS);

    return () => {
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

  return (
    <div
      data-splash={phase}
      role="status"
      aria-label={`Loading ${NAME}`}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink text-parchment transition-opacity duration-500 ${
        phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div
        aria-hidden="true"
        className="flex items-baseline font-display text-6xl font-semibold tracking-tight md:text-8xl"
      >
        {NAME.split("").map((letter, i) => (
          <span
            key={i}
            className="inline-block animate-letter-in"
            style={{ animationDelay: `${300 + i * 120}ms` }}
          >
            {letter}
          </span>
        ))}
        <span
          className="inline-block animate-dot-pop text-mustard"
          style={{ animationDelay: `${300 + NAME.length * 120}ms` }}
        >
          .
        </span>
      </div>

      <p
        aria-hidden="true"
        className="mt-5 animate-letter-in text-sm uppercase tracking-[0.25em] text-parchment/60"
        style={{ animationDelay: "1500ms" }}
      >
        {TAGLINE}
      </p>

      <div
        aria-hidden="true"
        className="mt-10 h-px w-48 origin-left animate-line-grow bg-mustard"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}
