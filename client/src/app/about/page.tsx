import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeatureGrid, { type Feature } from "@/components/FeatureGrid";
import Steps, { type Step } from "@/components/Steps";
import FinalCta from "@/components/FinalCta";
import Reveal from "@/components/Reveal";

const principles: Feature[] = [
  {
    title: "Finish what you start",
    description:
      "A half-watched playlist teaches very little. We build around completion, because that's where the learning sticks.",
  },
  {
    title: "Structure over scroll",
    description:
      "Courses are ordered paths, not endless feeds. Nothing is there to keep you busy — only to move you forward.",
  },
  {
    title: "Progress you can trust",
    description:
      "We track what you've really completed, so the numbers on your dashboard mean something.",
  },
  {
    title: "Credit where it's due",
    description:
      "When you finish, you get a certificate that proves it — and instructors get real insight into how their courses perform.",
  },
];

const steps: Step[] = [
  {
    title: "Browse",
    description: "Explore the catalog by category and read what each course covers before you commit.",
  },
  {
    title: "Enroll",
    description: "Join the course you've picked and it appears in your dashboard right away.",
  },
  {
    title: "Learn",
    description: "Move through lessons, quizzes and assignments, and ask questions in lesson discussions.",
  },
  {
    title: "Certify",
    description: "Meet the completion rules and your certificate is issued, ready to share.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        {/* Intro */}
        <section className="mx-auto max-w-4xl px-6 pb-8 pt-20">
          <p className="animate-fade-up text-sm uppercase tracking-wide text-mustard-dark dark:text-mustard">
            About Ledger
          </p>
          <h1
            className="mt-4 animate-fade-up font-display text-4xl leading-tight text-ink dark:text-parchment md:text-6xl"
            style={{ animationDelay: "150ms" }}
          >
            A learning catalog built around finishing.
          </h1>
          <p
            className="mt-6 max-w-prose animate-fade-up text-lg text-ink/80 dark:text-parchment/80"
            style={{ animationDelay: "300ms" }}
          >
            Ledger is a focused place to learn practical skills — programming,
            digital marketing, design and more — through complete, structured
            courses instead of an endless pile of tutorials.
          </p>
        </section>

        {/* Why it exists */}
        <section className="mx-auto grid max-w-4xl gap-10 px-6 py-12 md:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-3xl text-ink dark:text-parchment">
              Why Ledger exists
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <div className="space-y-4 text-ink/80 dark:text-parchment/80">
              <p>
                Most of us have a long list of courses we started and never
                finished. The problem is rarely motivation — it's that the
                material was scattered, unstructured, and easy to drop.
              </p>
              <p>
                Ledger takes the opposite approach: fewer courses, each one a
                complete path with a clear beginning, middle and end. The
                name says it — a ledger keeps an honest record of what's
                actually been done.
              </p>
            </div>
          </Reveal>
        </section>

        <FeatureGrid
          eyebrow="What we believe"
          heading="Four ideas behind every course."
          features={principles}
        />

        <Steps eyebrow="How it works" heading="From first click to certificate." steps={steps} />

        {/* For instructors */}
        <section className="mx-auto max-w-4xl px-6 py-16">
          <Reveal>
            <div className="border border-parchment-dark p-8 dark:border-ink-light md:p-10">
              <p className="text-sm uppercase tracking-wide text-mustard-dark dark:text-mustard">
                For instructors
              </p>
              <h2 className="mt-2 font-display text-3xl text-ink dark:text-parchment">
                Teach on Ledger
              </h2>
              <p className="mt-4 max-w-prose text-ink/80 dark:text-parchment/80">
                Build a course with lessons, videos, files, quizzes and
                assignments. Submitted courses are reviewed before they go
                live, so learners can trust what's in the catalog — and your
                dashboard shows how your students are doing.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-full border border-ink/30 px-6 py-3 font-medium text-ink transition hover:border-mustard hover:text-mustard-dark dark:border-parchment/30 dark:text-parchment dark:hover:text-mustard"
              >
                Instructor login
              </Link>
            </div>
          </Reveal>
        </section>

        <FinalCta heading="Ready to finish something" text="Choose a course, follow the path, and keep a record of what you've done." />
      </main>
      <Footer />
    </>
  );
}
