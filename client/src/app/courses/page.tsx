import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CourseList from "@/components/CourseList";

export default function CoursesPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="font-display text-4xl text-ink dark:text-parchment">
          All courses
        </h1>
        <p className="mt-2 max-w-prose text-ink/70 dark:text-parchment/70">
          Every path currently open for enrollment.
        </p>
        <div className="mt-10">
          <CourseList />
        </div>
      </main>
      <Footer />
    </>
  );
}
