"use client";

import Loader from "@/components/Loader";
import { BarCard, CoursePerformanceTable, Tile } from "@/components/analytics";
import { useGetAdminAnalyticsQuery } from "@/redux/features/dashboard/dashboardApi";

export default function AdminAnalyticsPage() {
  const { data, isLoading, isError } = useGetAdminAnalyticsQuery(undefined, { refetchOnMountOrArgChange: true });

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Analytics</h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        Months are calendar months, weeks start on Monday (UTC). Drop-off means students who joined over 30 days ago, haven&apos;t finished, and haven&apos;t completed a lesson in the last 30 days.
      </p>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load analytics.</p>}

      {data && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Tile label="Enrollments" value={data.completion.enrolled} />
            <Tile label="Completion rate" value={`${data.completion.completionRate}%`} />
            <Tile label="Drop-off rate" value={`${data.completion.dropOffRate}%`} hint={`${data.completion.stalled} stalled`} />
            <Tile
              label="Active learners (30 days)"
              value={`${data.engagement.activeRate}%`}
              hint={`${data.engagement.activeLearners} of ${data.engagement.learners}`}
            />
            <Tile
              label="Quiz average"
              value={data.quiz.takers ? `${data.quiz.averagePercentage}%` : "—"}
              hint={data.quiz.takers ? `${data.quiz.passRate}% pass rate` : "no quizzes taken"}
            />
            <Tile
              label="Assignment average"
              value={data.assignment.graded ? `${data.assignment.averagePercentage}%` : "—"}
              hint={`${data.assignment.pendingGrading} awaiting grading`}
            />
            <Tile label="Late submissions" value={`${data.assignment.lateRate}%`} />
            <Tile label="Quiz attempts" value={data.quiz.attempts} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <BarCard title="Student registrations (12 months)" data={data.registrations} />
            <BarCard title="Enrollments (12 months)" data={data.enrollmentsByMonth} />
            <BarCard title="Courses created (12 months)" data={data.courseCreation} />
            <BarCard title="Lessons completed (8 weeks)" data={data.weeklyLessons} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="border border-parchment-dark p-5 dark:border-ink-light">
              <h2 className="font-display text-xl text-ink dark:text-parchment">Popular courses</h2>
              <div className="mt-3 divide-y divide-parchment-dark text-sm dark:divide-ink-light">
                {data.popularCourses.length === 0 && <p className="py-3 text-ink/60 dark:text-parchment/60">No enrollments yet.</p>}
                {data.popularCourses.map((c: any) => (
                  <div key={c._id} className="flex justify-between py-3 text-ink dark:text-parchment">
                    <span>{c.name}</span>
                    <span className="text-ink/60 dark:text-parchment/60">{c.enrolled} enrolled</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-parchment-dark p-5 dark:border-ink-light">
              <h2 className="font-display text-xl text-ink dark:text-parchment">Instructor activity (30 days)</h2>
              <div className="mt-3 divide-y divide-parchment-dark text-sm dark:divide-ink-light">
                {data.instructorActivity.length === 0 && <p className="py-3 text-ink/60 dark:text-parchment/60">Nothing logged.</p>}
                {data.instructorActivity.map((i: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-3 text-ink dark:text-parchment">
                    <span>{i.name}</span>
                    <span className="text-ink/60 dark:text-parchment/60">{i.actions} actions</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <h2 className="mt-10 font-display text-2xl text-ink dark:text-parchment">Biggest courses</h2>
          <div className="mt-4">
            <CoursePerformanceTable courses={data.courses} />
          </div>
        </>
      )}
    </div>
  );
}
