"use client";

import Link from "next/link";
import { LedgerEntry } from "@/types/ledger";
import { KIND_LABEL, formatEntryDate, groupByMonth } from "@/utils/ledger";

// Same columns on every row. On a phone the course and "posted" columns fold away.
const ROW = "grid grid-cols-[62px_1fr_auto] md:grid-cols-[112px_1fr_190px_76px_110px]";

// The ledger itself: dated entries in ruled rows, grouped by month, with a
// double-underlined subtotal for each finished month and a running total on the right.
export default function LedgerTable({
  entries,
  totalEntries,
  onShowMore,
}: {
  entries: LedgerEntry[];
  totalEntries: number;
  onShowMore?: () => void;
}) {
  const groups = groupByMonth(entries);
  const hidden = totalEntries - entries.length;

  return (
    <section
      aria-label="Your ledger"
      className="relative border border-parchment-dark bg-[#FBF8EF] shadow-[0_18px_40px_-26px_rgba(15,46,43,0.45)] before:pointer-events-none before:absolute before:inset-y-0 before:left-[62px] before:w-[5px] before:border-x before:border-clay/50 dark:border-ink-light dark:bg-ink-light/30 dark:shadow-none md:before:left-[112px]"
    >
      <div
        aria-hidden="true"
        className={`${ROW} hidden h-11 items-center border-b border-ink/35 text-[11px] tracking-[0.16em] text-ink/55 dark:border-parchment/30 dark:text-parchment/55 md:grid`}
      >
        <span className="pl-6">DATE</span>
        <span className="pl-8">ENTRY</span>
        <span>COURSE</span>
        <span className="text-right">POSTED</span>
        <span className="pr-6 text-right">TOTAL</span>
      </div>

      {groups.map((group, g) => {
        // the oldest month on screen may be cut short while earlier entries are still hidden
        const partial = g === groups.length - 1 && hidden > 0;
        return (
          <div key={group.key}>
            <h3 className="relative z-10 border-b border-ink/15 bg-[#F1EEE3] px-4 py-2.5 text-xs font-semibold tracking-[0.18em] text-mustard-dark dark:border-parchment/15 dark:bg-ink dark:text-mustard md:px-6">
              {group.label}
            </h3>
            <ol>
              {group.entries.map((entry, i) => {
                const isCert = entry.kind === "certificate";
                return (
                  <li
                    key={`${entry.at}-${i}`}
                    className={`${ROW} items-center border-b border-ink/10 py-3 dark:border-parchment/10 md:min-h-[66px] ${
                      isCert ? "bg-clay/[0.07]" : ""
                    }`}
                  >
                    <time
                      dateTime={entry.at}
                      className="pl-3 text-xs tabular-nums text-ink/60 dark:text-parchment/60 md:pl-6 md:text-sm"
                    >
                      {formatEntryDate(entry.at)}
                    </time>
                    <div className="min-w-0 px-4 md:pl-8">
                      <p
                        className={`text-[10px] uppercase tracking-[0.12em] md:text-[11px] ${
                          isCert ? "font-semibold text-clay" : "text-ink/50 dark:text-parchment/50"
                        }`}
                      >
                        {KIND_LABEL[entry.kind]}
                      </p>
                      <p className="font-display text-[15px] font-medium leading-snug text-ink dark:text-parchment md:text-lg">
                        {isCert && entry.certificateId ? (
                          <Link href={`/certificates/${entry.certificateId}`} className="hover:underline">
                            {entry.title}
                          </Link>
                        ) : (
                          entry.title
                        )}
                        {entry.detail && (
                          <span className="ml-2 rounded-full border border-ink/25 px-2 py-px font-body text-xs font-normal text-ink/65 dark:border-parchment/30 dark:text-parchment/65">
                            {entry.detail}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ink/55 dark:text-parchment/55 md:hidden">{entry.courseName}</p>
                    </div>
                    <p className="hidden text-sm text-ink/65 dark:text-parchment/65 md:block">{entry.courseName}</p>
                    <p
                      className="hidden text-right font-semibold text-mustard-dark dark:text-mustard md:block"
                      aria-label={entry.counts ? "adds one" : "recognition"}
                    >
                      {entry.counts ? "+1" : "★"}
                    </p>
                    <p
                      className="pr-3 text-right font-display text-xl font-medium tabular-nums text-ink dark:text-parchment md:pr-6 md:text-2xl"
                      aria-label={`total ${entry.total}`}
                    >
                      {entry.total}
                    </p>
                  </li>
                );
              })}
            </ol>
            {!partial && (
              <div className={`${ROW} h-14 items-center border-b border-ink/15 dark:border-parchment/15`}>
                <span className="col-start-2 pl-4 text-[11px] tracking-[0.16em] text-ink/55 dark:text-parchment/55 md:pl-8">
                  {group.label.split(" ")[0]} TOTAL
                </span>
                <span className="col-start-3 pr-3 text-right md:col-start-5 md:pr-6">
                  <span className="inline-block border-b-[5px] border-double border-ink/75 pb-0.5 font-display text-xl font-semibold text-ink dark:border-parchment/70 dark:text-parchment">
                    +{group.added}
                  </span>
                </span>
              </div>
            )}
          </div>
        );
      })}

      {hidden > 0 && onShowMore && (
        <button
          type="button"
          onClick={onShowMore}
          className="relative z-10 flex h-14 w-full items-center justify-center text-sm font-medium text-mustard-dark transition hover:bg-mustard/10 dark:text-mustard"
        >
          Show earlier entries ({hidden}) &darr;
        </button>
      )}
    </section>
  );
}
