import { ReactNode } from "react";

// A page of ruled paper for full-page messages (404, errors): a margin line on
// the left, the content to its right.
export default function PaperNotice({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <div className="relative overflow-hidden border border-parchment-dark bg-[#FBF8EF] px-10 py-12 shadow-[0_18px_40px_-26px_rgba(15,46,43,0.45)] before:absolute before:inset-y-0 before:left-10 before:w-[5px] before:border-x before:border-clay/40 dark:border-ink-light dark:bg-ink-light/30 dark:shadow-none">
        <div className="relative pl-10">{children}</div>
      </div>
    </main>
  );
}
