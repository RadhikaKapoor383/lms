"use client";

import Reveal from "@/components/Reveal";
import { useInView } from "@/hooks/useInView";

// A sample card so visitors can see what a dashboard feels like.
// The bar fills and the ticks draw themselves once it scrolls into view.
const lessons = [
  { title: "Getting set up", done: true },
  { title: "Core ideas, step by step", done: true },
  { title: "Your first small project", done: true },
  { title: "Quiz: check your understanding", done: false, current: true },
  { title: "Final assignment", done: false },
];

const bullets = [
  "Pick up exactly where you stopped",
  "Every finished lesson is ticked off for you",
  "Your certificate unlocks when the course is complete",
];

export default function ProgressPreview() {
  const [ref, inView] = useInView<HTMLDivElement>(0.35);
  const doneCount = lessons.filter((l) => l.done).length;
  const percent = Math.round((doneCount / lessons.length) * 100);

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2">
      <Reveal>
        <p className="text-sm uppercase tracking-wide text-mustard-dark dark:text-mustard">
          Your dashboard
        </p>
        <h2 className="mt-2 font-display text-3xl text-ink dark:text-parchment md:text-4xl">
          See exactly where you left off.
        </h2>
        <p className="mt-3 max-w-prose text-ink/70 dark:text-parchment/70">
          No guessing which lesson comes next. Ledger keeps a plain, honest record of
          what you&apos;ve finished in every course.
        </p>
        <ul className="mt-6 space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-ink/80 dark:text-parchment/80">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-mustard" />
              {b}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={150}>
        <div
          ref={ref}
          className="border border-parchment-dark bg-white/50 p-6 shadow-sm dark:border-ink-light dark:bg-ink-light/30"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50 dark:text-parchment/50">
                Sample course
              </p>
              <h3 className="mt-1 font-display text-xl text-ink dark:text-parchment">
                Web basics, start to finish
              </h3>
            </div>
            <span className="rounded-full bg-mustard/20 px-3 py-1 text-xs font-medium text-mustard-dark dark:text-mustard">
              Preview
            </span>
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-sm text-ink/70 dark:text-parchment/70">
              <span>
                {doneCount} of {lessons.length} lessons
              </span>
              <span className="tabular-nums">{percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-parchment-dark dark:bg-ink-light">
              <div
                className="h-full rounded-full bg-mustard transition-[width] duration-[1600ms] ease-out"
                style={{ width: inView ? `${percent}%` : "0%" }}
              />
            </div>
          </div>

          <ul className="mt-6 space-y-3">
            {lessons.map((lesson, i) => (
              <li
                key={lesson.title}
                className={`flex items-center gap-3 text-sm ${
                  lesson.done || lesson.current
                    ? "text-ink dark:text-parchment"
                    : "text-ink/40 dark:text-parchment/40"
                }`}
              >
                {lesson.done ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 shrink-0 text-mustard-dark dark:text-mustard"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" className="opacity-30" />
                    <path
                      d="M7 12.5l3.2 3.2L17 9"
                      className={`[stroke-dasharray:24] ${
                        inView ? "animate-tick" : "[stroke-dashoffset:24]"
                      }`}
                      style={{ animationDelay: `${300 + i * 350}ms` }}
                    />
                  </svg>
                ) : lesson.current ? (
                  <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                    <span className="absolute h-3 w-3 animate-ping rounded-full bg-mustard/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-mustard" />
                  </span>
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full border border-current" />
                  </span>
                )}
                <span className={lesson.done ? "line-through decoration-ink/20 dark:decoration-parchment/20" : ""}>
                  {lesson.title}
                </span>
                {lesson.current && (
                  <span className="ml-auto text-xs text-mustard-dark dark:text-mustard">Up next</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
