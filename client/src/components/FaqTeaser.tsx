import Link from "next/link";
import Reveal from "@/components/Reveal";

const faqs = [
  {
    q: "How do I earn a certificate?",
    a: "Finish the course and pass its quizzes to earn a verifiable certificate you can download. Each course page lists exactly what you need to complete.",
  },
  {
    q: "Can I learn at my own pace?",
    a: "Yes. Lessons are laid out in order and your progress is saved, so you can leave and come back to the same spot.",
  },
  {
    q: "Where can I ask a question?",
    a: "Right inside the lesson. Lesson discussions keep your question next to the material it's about, where your instructor can answer.",
  },
  {
    q: "I'm an instructor. How do I publish a course?",
    a: "Create it from your instructor dashboard and submit it. Submitted courses are reviewed before they appear in the catalog.",
  },
];

// Native <details> keeps this accessible (keyboard + screen readers) with no JS.
export default function FaqTeaser() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <Reveal>
        <p className="text-sm uppercase tracking-wide text-mustard-dark dark:text-mustard">
          Quick answers
        </p>
        <h2 className="mt-2 font-display text-3xl text-ink dark:text-parchment md:text-4xl">
          Common questions
        </h2>
      </Reveal>

      <div className="mt-8 divide-y divide-parchment-dark border-y border-parchment-dark dark:divide-ink-light dark:border-ink-light">
        {faqs.map((faq, i) => (
          <Reveal key={faq.q} delay={i * 100}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-lg text-ink transition hover:text-mustard-dark dark:text-parchment dark:hover:text-mustard [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span className="faq-icon shrink-0 text-2xl leading-none text-mustard transition-transform duration-300">
                  +
                </span>
              </summary>
              <p className="pb-5 pr-8 text-ink/70 dark:text-parchment/70">{faq.a}</p>
            </details>
          </Reveal>
        ))}
      </div>

      <Reveal delay={200}>
        <p className="mt-6 text-sm text-ink/70 dark:text-parchment/70">
          More questions?{" "}
          <Link href="/faq" className="text-mustard-dark hover:underline dark:text-mustard">
            Read the full FAQ
          </Link>
        </p>
      </Reveal>
    </section>
  );
}
