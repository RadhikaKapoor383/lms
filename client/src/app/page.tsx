import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import CourseList from "@/components/CourseList";
import AnnouncementBar from "@/components/AnnouncementBar";
import FeatureGrid, { type Feature } from "@/components/FeatureGrid";
import Steps, { type Step } from "@/components/Steps";
import FinalCta from "@/components/FinalCta";
import Marquee from "@/components/Marquee";
import ProgressPreview from "@/components/ProgressPreview";
import FaqTeaser from "@/components/FaqTeaser";
import Reveal from "@/components/Reveal";

const features: Feature[] = [
  {
    title: "Complete paths",
    description:
      "Every course runs start to finish — lessons, quizzes and assignments in a clear order, so you always know what's next.",
  },
  {
    title: "Learn in context",
    description:
      "Ask questions right inside a lesson. Discussions stay attached to the exact thing you're stuck on.",
  },
  {
    title: "Honest progress",
    description:
      "Your progress page shows what you've actually finished, not just what you've opened.",
  },
  {
    title: "Certificates that count",
    description:
      "Finish a course and earn a certificate you can open, download and share with anyone.",
  },
];

const steps: Step[] = [
  {
    title: "Pick a path",
    description: "Browse the catalog by category and choose one course that fits your goal.",
  },
  {
    title: "Learn step by step",
    description: "Work through lessons, quizzes and assignments at your own pace.",
  },
  {
    title: "Earn your certificate",
    description: "Complete the course and get a certificate to show for it.",
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <AnnouncementBar />
      <main>
        <Hero />
        <Marquee />

        <FeatureGrid
          eyebrow="Why Ledger"
          heading="Built for finishing, not for scrolling."
          intro="Less noise, more structure. Everything on the platform is designed to get you from the first lesson to the last."
          features={features}
        />

        <ProgressPreview />

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <Reveal>
            <h2 className="font-display text-3xl text-ink dark:text-parchment">
              Recently added
            </h2>
            <p className="mt-2 max-w-prose text-ink/70 dark:text-parchment/70">
              Pulled straight from the catalog — no algorithm deciding what you should want.
            </p>
          </Reveal>
          <div className="mt-8">
            <CourseList />
          </div>
        </section>

        <Steps eyebrow="How it works" heading="Three steps from curious to certified." steps={steps} />

        <FaqTeaser />

        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
