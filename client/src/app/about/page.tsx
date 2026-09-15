import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-4xl text-ink dark:text-parchment">
          How Ledger works
        </h1>
        <p className="mt-6 max-w-prose text-ink/80 dark:text-parchment/80">
          This page is a placeholder — replace it with your own story once
          you've decided what the platform is really for.
        </p>
      </main>
      <Footer />
    </>
  );
}
