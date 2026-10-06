"use client";

import Loader from "@/components/Loader";
import { BarCard, CoursePerformanceTable, Tile } from "@/components/analytics";
import { useGetInstructorAnalyticsQuery } from "@/redux/features/dashboard/dashboardApi";

export default function InstructorAnalyticsPage() {
  const { data, isLoading, isError } = useGetInstructorAnalyticsQuery(undefined, { refetchOnMountOrArgChange: true });

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Analytics</h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        How students are doing in your courses. Drop-off means joined over 30 days ago, not finished, and no lesson completed in the last 30 days.
      </p>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load analytics.</p>}

      {data && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Tile label="Students" value={data.students} />
            <Tile
              label="Active (30 days)"
              value={`${data.engagement.activeRate}%`}
              hint={`${data.engagement.activeLearners} of ${data.engagement.learners}`}
            />
            <Tile label="Completion rate" value={`${data.completion.completionRate}%`} />
            <Tile label="Drop-off rate" value={`${data.completion.dropOffRate}%`} hint={`${data.completion.stalled} stalled`} />
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

          <div className="mt-8">
            <BarCard title="Lessons completed by your students (8 weeks)" data={data.weeklyLessons} />
          </div>

          <h2 className="mt-10 font-display text-2xl text-ink dark:text-parchment">By course</h2>
          <div className="mt-4">
            <CoursePerformanceTable courses={data.courses} />
          </div>
        </>
      )}
    </div>
  );
}
