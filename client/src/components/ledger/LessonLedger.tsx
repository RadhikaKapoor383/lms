const TICK = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-mustard-dark dark:text-mustard">
    <circle cx="12" cy="12" r="10" opacity=".3" />
    <path d="M7 12.5l3.2 3.2L17 9" />
  </svg>
);
const NOW = (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" className="fill-mustard" opacity=".25" />
    <circle cx="12" cy="12" r="5" className="fill-mustard" />
  </svg>
);
const TODO = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="opacity-35">
    <circle cx="12" cy="12" r="6" />
  </svg>
);

// The lesson list as a page of the ledger: numbered rows, a margin line, the
// lesson you are on highlighted, and a double-underlined total at the bottom.
// `showProgress` is false when an admin or instructor previews a course (there
// is no progress to show for them).
export default function LessonLedger({
  lessons,
  activeIndex,
  completedIds,
  showProgress,
  onSelect,
}: {
  lessons: { _id: string; title: string }[];
  activeIndex: number;
  completedIds: string[];
  showProgress: boolean;
  onSelect: (index: number) => void;
}) {
  const doneCount = lessons.filter((l) => completedIds.includes(l._id)).length;

  return (
    <div className="relative border border-parchment-dark bg-[#FBF8EF] before:pointer-events-none before:absolute before:inset-y-0 before:left-[44px] before:w-[5px] before:border-x before:border-clay/50 dark:border-ink-light dark:bg-ink-light/30">
      <ul>
        {lessons.map((lesson, i) => {
          const active = i === activeIndex;
          const done = completedIds.includes(lesson._id);
          return (
            <li key={lesson._id}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={active ? "true" : undefined}
                className={`grid min-h-[56px] w-full grid-cols-[44px_1fr_auto] items-center border-b border-ink/10 text-left transition hover:bg-mustard/10 dark:border-parchment/10 ${
                  active ? "bg-mustard/15" : ""
                }`}
              >
                <span className="text-center font-display text-sm text-mustard-dark dark:text-mustard">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`px-4 py-3 font-display text-[15px] leading-snug ${
                    active || done ? "font-medium text-ink dark:text-parchment" : "text-ink/60 dark:text-parchment/60"
                  }`}
                >
                  {lesson.title}
                  {showProgress && done && <span className="sr-only"> (finished)</span>}
                  {active && <span className="sr-only"> (open now)</span>}
                </span>
                <span className="pr-3 text-ink dark:text-parchment">
                  {showProgress ? (done ? TICK : active ? NOW : TODO) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {showProgress && (
        <div className="grid h-14 grid-cols-[44px_1fr_auto] items-center border-t border-ink/35 dark:border-parchment/30">
          <span />
          <span className="px-4 text-[11px] tracking-[0.16em] text-ink/55 dark:text-parchment/55">TOTAL</span>
          <span className="pr-4">
            <span className="inline-block border-b-[5px] border-double border-ink/75 pb-0.5 font-display text-lg font-semibold text-ink dark:border-parchment/70 dark:text-parchment">
              {doneCount} of {lessons.length}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
