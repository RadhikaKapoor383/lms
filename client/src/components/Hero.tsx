import Link from "next/link";

export default function Hero() {
  return (
    <section className="border-b border-ink-light bg-ink text-parchment">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-sm uppercase tracking-wide text-mustard">
            A catalog, not a firehose
          </p>
          <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">
            Learn the things that actually move your work forward.
          </h1>
          <p className="mt-6 max-w-prose text-parchment/80">
            No infinite scroll of half-finished tutorials. Every course here
            is a complete, structured path — pick one, finish it, and put it
            to use.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/courses"
              className="rounded-full bg-mustard px-6 py-3 font-medium text-ink hover:bg-mustard-dark"
            >
              Browse courses
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-parchment/30 px-6 py-3 font-medium text-parchment hover:border-mustard hover:text-mustard"
            >
              How it works
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: "Programming", detail: "12 paths" },
            { label: "Digital Marketing", detail: "6 paths" },
            { label: "Graphic Design", detail: "5 paths" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between border border-parchment/20 px-5 py-4"
            >
              <span className="font-display text-lg">{item.label}</span>
              <span className="text-sm text-parchment/60">{item.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
