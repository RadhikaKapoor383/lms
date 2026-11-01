import Reveal from "@/components/Reveal";

export interface Feature {
  title: string;
  description: string;
}

interface FeatureGridProps {
  eyebrow: string;
  heading: string;
  intro?: string;
  features: Feature[];
}

export default function FeatureGrid({ eyebrow, heading, intro, features }: FeatureGridProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <Reveal>
        <p className="text-sm uppercase tracking-wide text-mustard-dark dark:text-mustard">
          {eyebrow}
        </p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl text-ink dark:text-parchment md:text-4xl">
          {heading}
        </h2>
        {intro && (
          <p className="mt-3 max-w-prose text-ink/70 dark:text-parchment/70">{intro}</p>
        )}
      </Reveal>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, i) => (
          <Reveal key={feature.title} delay={i * 120}>
            <div className="group h-full border border-parchment-dark p-6 transition duration-300 hover:-translate-y-1 hover:border-mustard hover:shadow-lg dark:border-ink-light">
              <span className="font-display text-sm text-mustard-dark dark:text-mustard">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-xl text-ink dark:text-parchment">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70 dark:text-parchment/70">
                {feature.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
