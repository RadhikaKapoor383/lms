"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import RoleProtected from "@/components/RoleProtected";
import { BarCard, ProgressBar, Tile } from "@/components/analytics";
import { useGetStudentAnalyticsQuery } from "@/redux/features/dashboard/dashboardApi";

function ProgressContent() {
  const { data, isLoading, isError } = useGetStudentAnalyticsQuery(undefined, { refetchOnMountOrArgChange: true });

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-4xl text-ink dark:text-parchment">My progress</h1>
        <p className="mt-2 text-ink/60 dark:text-parchment/60">Your learning at a glance.</p>

        {isLoading && <Loader />}
        {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load your progress.</p>}

        {data && (
          <>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Tile label="Courses" value={data.summary.coursesEnrolled} />
              <Tile label="Completed" value={data.summary.coursesCompleted} />
              <Tile label="Average progress" value={`${data.summary.averageProgress}%`} />
              <Tile label="Lessons finished" value={data.summary.lessonsCompleted} />
              <Tile
                label="Quiz average"
                value={data.quiz.takers ? `${data.quiz.averagePercentage}%` : "—"}
                hint={data.quiz.takers ? `${data.quiz.passRate}% passed` : "none taken yet"}
              />
              <Tile
                label="Assignment average"
                value={data.assignment.graded ? `${data.assignment.averagePercentage}%` : "—"}
                hint={`${data.assignment.pendingGrading} awaiting grading`}
              />
              <Tile label="Late submissions" value={data.assignment.submissions ? `${data.assignment.lateRate}%` : "—"} />
              <Tile label="Quiz attempts" value={data.quiz.attempts} />
            </div>

            <div className="mt-8">
              <BarCard title="Lessons you finished (8 weeks)" data={data.weeklyLessons} />
            </div>

            <h2 className="mt-10 font-display text-2xl text-ink dark:text-parchment">Courses</h2>
            {data.courses.length === 0 ? (
              <p className="mt-3 text-ink/60 dark:text-parchment/60">
                You&apos;re not enrolled in anything yet.{" "}
                <Link href="/courses" className="text-mustard-dark underline dark:text-mustard">
                  Browse courses
                </Link>
              </p>
            ) : (
              <div className="mt-4 divide-y divide-parchment-dark dark:divide-ink-light">
                {data.courses.map((c: any) => (
                  <Link key={c.courseId} href={`/course-access/${c.courseId}`} className="block py-4 hover:opacity-90">
                    <div className="flex justify-between gap-4">
                      <p className="font-medium text-ink dark:text-parchment">{c.name}</p>
                      <p className="shrink-0 text-sm text-ink/60 dark:text-parchment/60">
                        {c.status === "completed" ? "Completed" : `${c.completionPercentage}%`}
                      </p>
                    </div>
                    <ProgressBar percent={c.completionPercentage} />
                    <p className="mt-1 text-xs text-ink/50 dark:text-parchment/50">
                      {c.lastActivity ? `Last lesson ${new Date(c.lastActivity).toLocaleDateString()}` : "Not started"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function ProgressPage() {
  return (
    <RoleProtected allowedRoles={["student"]}>
      <ProgressContent />
    </RoleProtected>
  );
}
