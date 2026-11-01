import Link from "next/link";

// Small helper so each hero item can enter with its own delay
const enter = (ms: number) => ({ animationDelay: `${ms}ms` });

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink-light bg-ink text-parchment">
      {/* soft floating glow, purely decorative */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 animate-float rounded-full bg-mustard/10 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center">
        <div>
          <p
            className="animate-fade-up text-sm uppercase tracking-wide text-mustard"
            style={enter(0)}
          >
            A catalog, not a firehose
          </p>
          <h1
            className="mt-4 animate-fade-up font-display text-5xl leading-tight md:text-6xl"
            style={enter(150)}
          >
            Learn the things that actually move your work forward.
          </h1>
          <p
            className="mt-6 max-w-prose animate-fade-up text-parchment/80"
            style={enter(300)}
          >
            No infinite scroll of half-finished tutorials. Every course here
            is a complete, structured path — pick one, finish it, and put it
            to use.
          </p>
          <div className="mt-8 flex gap-4 animate-fade-up" style={enter(450)}>
            <Link
              href="/courses"
              className="rounded-full bg-mustard px-6 py-3 font-medium text-ink transition hover:-translate-y-0.5 hover:bg-mustard-dark"
            >
              Browse courses
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-parchment/30 px-6 py-3 font-medium text-parchment transition hover:-translate-y-0.5 hover:border-mustard hover:text-mustard"
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
          ].map((item, i) => (
            <div
              key={item.label}
              className="flex animate-fade-up items-center justify-between border border-parchment/20 px-5 py-4 transition duration-300 hover:translate-x-1 hover:border-mustard"
              style={enter(600 + i * 150)}
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
