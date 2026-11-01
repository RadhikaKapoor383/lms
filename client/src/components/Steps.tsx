import Reveal from "@/components/Reveal";

export interface Step {
  title: string;
  description: string;
}

interface StepsProps {
  eyebrow: string;
  heading: string;
  steps: Step[];
}

export default function Steps({ eyebrow, heading, steps }: StepsProps) {
  return (
    <section className="border-y border-parchment-dark bg-parchment-dark/40 dark:border-ink-light dark:bg-ink-light/30">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <p className="text-sm uppercase tracking-wide text-mustard-dark dark:text-mustard">
            {eyebrow}
          </p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl text-ink dark:text-parchment md:text-4xl">
            {heading}
          </h2>
        </Reveal>

        <ol className="mt-12 grid gap-10 md:grid-flow-col md:auto-cols-fr md:gap-8">
          {steps.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 150}>
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg text-mustard dark:bg-mustard dark:text-ink">
                    {i + 1}
                  </span>
                  {/* connector line between steps (desktop only) */}
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="hidden h-px flex-1 bg-ink/20 md:block dark:bg-parchment/20"
                    />
                  )}
                </div>
                <h3 className="mt-5 font-display text-xl text-ink dark:text-parchment">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink/70 dark:text-parchment/70">
                  {step.description}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
