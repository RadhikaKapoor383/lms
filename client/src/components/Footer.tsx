export default function Footer() {
  return (
    <footer className="border-t border-parchment-dark bg-parchment py-10 dark:border-ink-light dark:bg-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 text-sm text-ink/70 dark:text-parchment/70 md:flex-row md:items-center md:justify-between">
        <p className="font-display text-lg text-ink dark:text-parchment">
          Ledger<span className="text-mustard">.</span>
        </p>
        <p>&copy; {new Date().getFullYear()} Ledger. Learn something worth keeping.</p>
      </div>
    </footer>
  );
}
