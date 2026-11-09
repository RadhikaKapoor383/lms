import CompletedStamp from "./CompletedStamp";

// "Balance": how far along you are, and one button to carry on from the next
// lesson you haven't finished.
export default function ContinueCard({
  percent,
  doneCount,
  total,
  nextTitle,
  onContinue,
}: {
  percent: number;
  doneCount: number;
  total: number;
  nextTitle?: string;
  onContinue: () => void;
}) {
  const safe = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div className="border border-parchment-dark bg-[#FBF8EF] p-5 dark:border-ink-light dark:bg-ink-light/30">
      <p className="text-xs uppercase tracking-[0.12em] text-mustard-dark dark:text-mustard">Balance</p>
      <p className="mt-1 font-display text-5xl leading-none text-ink dark:text-parchment">
        {safe}
        <span className="text-2xl text-mustard-dark dark:text-mustard">%</span>
      </p>
      <div
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-parchment-dark dark:bg-ink"
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Course progress"
      >
        <div className="h-full rounded-full bg-mustard" style={{ width: `${safe}%` }} />
      </div>
      <p className="mt-2 text-sm text-ink/65 dark:text-parchment/65">
        {doneCount} of {total} {total === 1 ? "lesson" : "lessons"} posted
      </p>
      {nextTitle ? (
        <button
          type="button"
          onClick={onContinue}
          className="mt-4 w-full rounded-full bg-mustard px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-mustard-dark"
        >
          Continue: {nextTitle}
        </button>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-3 border-t-[3px] border-double border-ink/30 pt-3 dark:border-parchment/30">
          <p className="text-sm text-ink/70 dark:text-parchment/70">Every lesson is posted.</p>
          <CompletedStamp />
        </div>
      )}
    </div>
  );
}
