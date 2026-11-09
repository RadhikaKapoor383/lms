import { LedgerTotals } from "@/types/ledger";

// Four totals in a ruled box: double rules above and below, like the head of a ledger.
export default function LedgerSummary({ totals }: { totals: LedgerTotals }) {
  const cells = [
    { label: "Lessons", value: totals.lessons },
    { label: "Quizzes passed", value: totals.quizzes },
    { label: "Assignments", value: totals.assignments },
    { label: "Certificates", value: totals.certificates },
  ];
  return (
    <dl className="grid grid-cols-2 border-y-4 border-double border-ink/50 bg-[#FBF8EF] dark:border-parchment/40 dark:bg-ink-light/30 md:grid-cols-4">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={`flex flex-col justify-center px-5 py-5 md:px-6 md:py-6 ${
            i % 2 === 0 ? "border-r border-ink/10 dark:border-parchment/10" : ""
          } ${i < 2 ? "border-b border-ink/10 dark:border-parchment/10 md:border-b-0" : ""} ${
            i < 3 ? "md:border-r md:border-ink/10 md:dark:border-parchment/10" : "md:border-r-0"
          }`}
        >
          <dd className="font-display text-4xl leading-none text-ink dark:text-parchment md:text-5xl">{c.value}</dd>
          <dt className="mt-2 text-xs uppercase tracking-[0.12em] text-ink/55 dark:text-parchment/55">{c.label}</dt>
        </div>
      ))}
    </dl>
  );
}
