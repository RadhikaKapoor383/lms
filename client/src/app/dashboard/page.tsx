"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import RoleProtected from "@/components/RoleProtected";
import { useGetMyEnrollmentsQuery } from "@/redux/features/enrollment/enrollmentApi";
import { useGetMyAssignmentsQuery } from "@/redux/features/assignments/assignmentsApi";
import { useAppSelector } from "@/hooks/redux";

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-parchment-dark dark:bg-ink">
      <div
        className="h-1.5 rounded-full bg-mustard"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function StudentDashboardContent() {
  const { user } = useAppSelector((state) => state.auth);
  const { data, isLoading, isError } = useGetMyEnrollmentsQuery(undefined);
  const enrollments = data?.enrollments || [];

  const { data: assignmentsData } = useGetMyAssignmentsQuery(undefined);
  const upcomingDeadlines = (assignmentsData?.assignments || [])
    .filter((a: any) => !a.mySubmission && new Date(a.deadline) > new Date())
    .slice(0, 5);

  const inProgress = enrollments.filter(
    (e: any) => e.status === "active" && e.completionPercentage < 100
  ).length;
  const completed = enrollments.filter((e: any) => e.status === "completed").length;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-4xl text-ink dark:text-parchment">
          Welcome back, {user?.name}
        </h1>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="border border-parchment-dark p-5 dark:border-ink-light">
            <p className="text-sm uppercase tracking-wide text-ink/50 dark:text-parchment/50">
              Enrolled courses
            </p>
            <p className="mt-2 font-display text-3xl text-ink dark:text-parchment">
              {enrollments.length}
            </p>
          </div>
          <div className="border border-parchment-dark p-5 dark:border-ink-light">
            <p className="text-sm uppercase tracking-wide text-ink/50 dark:text-parchment/50">
              In progress
            </p>
            <p className="mt-2 font-display text-3xl text-ink dark:text-parchment">
              {inProgress}
            </p>
          </div>
          <div className="border border-parchment-dark p-5 dark:border-ink-light">
            <p className="text-sm uppercase tracking-wide text-ink/50 dark:text-parchment/50">
              Completed
            </p>
            <p className="mt-2 font-display text-3xl text-ink dark:text-parchment">
              {completed}
            </p>
          </div>
        </div>

        {upcomingDeadlines.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-2xl text-ink dark:text-parchment">
              Upcoming deadlines
            </h2>
            <div className="mt-4 divide-y divide-parchment-dark dark:divide-ink-light">
              {upcomingDeadlines.map((a: any) => (
                <Link
                  key={a._id}
                  href={`/course-access/${a.course._id}/assignments`}
                  className="flex items-center justify-between py-3 hover:opacity-90"
                >
                  <div>
                    <p className="text-ink dark:text-parchment">{a.title}</p>
                    <p className="text-sm text-ink/60 dark:text-parchment/60">{a.course?.name}</p>
                  </div>
                  <span className="text-sm text-ink/50 dark:text-parchment/50">
                    {new Date(a.deadline).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <h2 className="font-display text-2xl text-ink dark:text-parchment">
            My courses
          </h2>
          <Link href="/courses" className="text-sm text-mustard-dark hover:underline dark:text-mustard">
            Browse more courses
          </Link>
        </div>

        {isLoading && <Loader />}
        {isError && (
          <p className="mt-6 text-ink/60 dark:text-parchment/60">
            Couldn&apos;t load your courses.
          </p>
        )}
        {!isLoading && !isError && enrollments.length === 0 && (
          <p className="mt-6 text-ink/60 dark:text-parchment/60">
            You&apos;re not enrolled in anything yet.{" "}
            <Link href="/courses" className="text-mustard-dark underline dark:text-mustard">
              Find a course
            </Link>
            .
          </p>
        )}

        <div className="mt-6 divide-y divide-parchment-dark dark:divide-ink-light">
          {enrollments.map((e: any) => (
            <Link
              key={e._id}
              href={`/course-access/${e.course._id}`}
              className="block py-5 hover:opacity-90"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink dark:text-parchment">{e.course.name}</p>
                <span className="text-sm text-ink/50 dark:text-parchment/50">
                  {Math.round(e.completionPercentage || 0)}%
                </span>
              </div>
              <p className="text-sm text-ink/60 dark:text-parchment/60">
                {e.course.category?.name} · {e.instructor?.name || "No instructor"}
              </p>
              <ProgressBar percent={e.completionPercentage || 0} />
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function StudentDashboardPage() {
  return (
    <RoleProtected allowedRoles={["student"]}>
      <StudentDashboardContent />
    </RoleProtected>
  );
}
