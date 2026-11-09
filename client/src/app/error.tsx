"use client";

import Link from "next/link";
import PaperNotice from "@/components/ledger/PaperNotice";

// Shown when something breaks while a page is drawing. It stands alone (no
// header) so it still works if the header itself is what failed.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PaperNotice>
      <p role="alert" className="border border-clay/50 bg-clay/10 px-4 py-3 text-clay">
        <span className="block font-display text-xl">That entry didn&apos;t post</span>
        <span className="text-sm">Something went wrong while loading this page.</span>
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-mustard px-6 py-3 text-sm font-medium text-ink transition hover:bg-mustard-dark"
        >
          Try again
        </button>
        <Link href="/" className="text-sm text-mustard-dark underline dark:text-mustard">
          Back to the home page
        </Link>
      </div>
    </PaperNotice>
  );
}
