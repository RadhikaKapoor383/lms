// Shown while the ledger loads: the same ruled rows, with a soft pulse.
export default function LedgerSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading entries"
      className="relative animate-pulse overflow-hidden border border-parchment-dark bg-[#FBF8EF] before:absolute before:inset-y-0 before:left-[62px] before:w-[5px] before:border-x before:border-clay/30 dark:border-ink-light dark:bg-ink-light/30 md:before:left-[112px]"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex h-16 items-center gap-4 border-b border-ink/10 px-4 dark:border-parchment/10">
          <span className="h-3 w-10 rounded-full bg-ink/10 dark:bg-parchment/15 md:w-16" />
          <span className="ml-5 h-3 flex-1 rounded-full bg-ink/10 dark:bg-parchment/15 md:ml-10" style={{ maxWidth: `${70 - i * 8}%` }} />
          <span className="h-4 w-6 rounded-full bg-ink/10 dark:bg-parchment/15" />
        </div>
      ))}
    </div>
  );
}
