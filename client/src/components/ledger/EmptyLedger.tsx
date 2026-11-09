import Link from "next/link";

// "No entries yet": a few blank ruled lines, like an unused page of the ledger.
export default function EmptyLedger({
  title = "No entries yet",
  text,
  ctaLabel,
  ctaHref,
}: {
  title?: string;
  text: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="relative overflow-hidden border border-parchment-dark bg-[#FBF8EF] px-8 py-8 before:absolute before:inset-y-0 before:left-8 before:w-[5px] before:border-x before:border-clay/40 dark:border-ink-light dark:bg-ink-light/30">
      <div className="relative pl-8">
        <h2 className="font-display text-2xl text-ink dark:text-parchment">{title}</h2>
        <p className="mt-2 max-w-prose text-sm text-ink/65 dark:text-parchment/65">{text}</p>
        <div aria-hidden="true" className="mt-6">
          {[48, 70, 28].map((w) => (
            <div key={w} className="relative h-9 border-b border-dashed border-ink/20 dark:border-parchment/20">
              <span
                className="absolute bottom-3 left-0 h-2 rounded-full bg-ink/[0.07] dark:bg-parchment/10"
                style={{ width: `${w}%` }}
              />
            </div>
          ))}
        </div>
        {ctaLabel && ctaHref && (
          <Link
            href={ctaHref}
            className="mt-6 inline-block rounded-full bg-mustard px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-mustard-dark"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
