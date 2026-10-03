"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import { useGetCourseQuizzesQuery } from "@/redux/features/quizzes/quizzesApi";

export default function CourseQuizzesStudentPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const { data, isLoading, isError } = useGetCourseQuizzesQuery(courseId);
  const quizzes = data?.quizzes || [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ink dark:text-parchment">Quizzes</h1>
          <Link
            href={`/course-access/${courseId}`}
            className="text-sm text-mustard-dark hover:underline dark:text-mustard"
          >
            Back to lessons
          </Link>
        </div>

        {isLoading && <Loader />}
        {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load quizzes.</p>}
        {!isLoading && !isError && quizzes.length === 0 && (
          <p className="mt-6 text-ink/60 dark:text-parchment/60">No quizzes for this course yet.</p>
        )}

        <div className="mt-8 space-y-4">
          {quizzes.map((q: any) => {
            const attempts = q.attempts || [];
            const attemptsUsed = attempts.length;
            const attemptsLeft = Math.max(0, q.maxAttempts - attemptsUsed);
            const best = attempts.reduce(
              (max: any, a: any) => (!max || a.percentage > max.percentage ? a : max),
              null
            );

            return (
              <div key={q._id} className="border border-parchment-dark p-5 dark:border-ink-light">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-medium text-ink dark:text-parchment">{q.title}</p>
                  {best && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs ${
                        best.passed ? "bg-mustard/30 text-mustard-dark" : "bg-clay/20 text-clay"
                      }`}
                    >
                      Best: {Math.round(best.percentage)}% ({best.passed ? "Passed" : "Failed"})
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
                  {q.passingScore}% to pass · {attemptsUsed}/{q.maxAttempts} attempts used
                  {q.timeLimitMinutes ? ` · ${q.timeLimitMinutes} min limit` : ""}
                </p>

                {attemptsLeft > 0 ? (
                  <Link
                    href={`/course-access/${courseId}/quizzes/${q._id}`}
                    className="mt-3 inline-block rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark"
                  >
                    {attemptsUsed > 0 ? "Retake quiz" : "Start quiz"}
                  </Link>
                ) : (
                  <p className="mt-3 text-sm text-ink/50 dark:text-parchment/50">
                    No attempts remaining.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
