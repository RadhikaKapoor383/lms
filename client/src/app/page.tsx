import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import CourseList from "@/components/CourseList";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-3xl text-ink dark:text-parchment">
            Recently added
          </h2>
          <p className="mt-2 max-w-prose text-ink/70 dark:text-parchment/70">
            Pulled straight from the catalog — no algorithm deciding what you should want.
          </p>
          <div className="mt-8">
            <CourseList />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
