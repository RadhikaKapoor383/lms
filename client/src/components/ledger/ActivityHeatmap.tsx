import { buildActivityGrid } from "@/utils/ledger";

const SHADE = [
  "bg-parchment-dark dark:bg-ink",
  "bg-[#EBCB8A] dark:bg-mustard/40",
  "bg-mustard",
  "bg-mustard-dark",
];

// The last 12 weeks, one square per day. Darker = more entries that day.
export default function ActivityHeatmap({ dates, now }: { dates: string[]; now: Date }) {
  const { columns, total } = buildActivityGrid(dates, now, 12);
  const summary = `${total} ${total === 1 ? "entry" : "entries"} in the last 12 weeks`;

  return (
    <div className="border border-parchment-dark bg-[#FBF8EF] p-5 dark:border-ink-light dark:bg-ink-light/30 md:flex md:items-center md:justify-between md:gap-8">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-ink/55 dark:text-parchment/55">Last 12 weeks</p>
        <div role="img" aria-label={summary} className="mt-4 flex gap-1.5">
          {columns.map((column, w) => (
            <div key={w} className="flex flex-col gap-1.5">
              {column.map((cell) => (
                <span
                  key={cell.key}
                  title={cell.future ? undefined : `${cell.count} on ${cell.key}`}
                  className={`h-3.5 w-3.5 rounded-[3px] ${cell.future ? "bg-transparent" : SHADE[cell.level]}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-ink/55 dark:text-parchment/55 md:mt-0 md:max-w-[15rem] md:text-right">
        {summary}. Each square is a day; darker means more.
      </p>
    </div>
  );
}
