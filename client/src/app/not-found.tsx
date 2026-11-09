import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PaperNotice from "@/components/ledger/PaperNotice";

// Shown for any address that doesn't exist.
export default function NotFound() {
  return (
    <>
      <Header />
      <PaperNotice>
        <p className="font-display text-7xl leading-none text-ink dark:text-parchment">
          <span className="inline-block border-b-[7px] border-double border-ink/70 pb-1 dark:border-parchment/60">404</span>
        </p>
        <h1 className="mt-6 font-display text-3xl text-ink dark:text-parchment">Entry not found</h1>
        <p className="mt-2 max-w-prose text-ink/65 dark:text-parchment/65">
          We couldn&apos;t find a page with that number. It may have moved, or it was never written.
        </p>
        <Link
          href="/courses"
          className="mt-6 inline-block rounded-full bg-mustard px-6 py-3 text-sm font-medium text-ink transition hover:bg-mustard-dark"
        >
          Back to the catalog
        </Link>
      </PaperNotice>
      <Footer />
    </>
  );
}
