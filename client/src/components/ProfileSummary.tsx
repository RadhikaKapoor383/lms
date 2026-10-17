"use client";

import Link from "next/link";
import {
  useGetInstructorDashboardQuery,
  useGetStudentDashboardQuery,
} from "@/redux/features/dashboard/dashboardApi";

// The part of the profile page that depends on who you are:
//   student     what you are learning (courses, progress, certificates)
//   instructor  what you teach (courses, students, how they are doing)
//   admin       a pointer to the admin area
// It uses the same dashboard numbers as the dashboards, so they always agree.

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="border border-parchment-dark p-4 dark:border-ink-light">
    <p className="font-display text-2xl text-ink dark:text-parchment">{value}</p>
    <p className="text-xs text-ink/60 dark:text-parchment/60">{label}</p>
  </div>
);

const Title = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-display text-2xl text-ink dark:text-parchment">{children}</h2>
);

const linkClass = "text-sm text-mustard-dark hover:underline dark:text-mustard";

function StudentSummary() {
  const { data, isLoading } = useGetStudentDashboardQuery(undefined);
  const c = data?.cards;
  return (
    <section className="mt-10">
      <Title>Your learning</Title>
      {isLoading && <p className="mt-4 text-ink/60 dark:text-parchment/60">Loading...</p>}
      {c && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Enrolled courses" value={c.courses} />
            <Stat label="Completed" value={c.completed} />
            <Stat label="Overall progress" value={`${Math.round(c.overallProgress)}%`} />
            <Stat label="Certificates" value={c.certificates} />
          </div>
          <div className="mt-4 flex gap-6">
            <Link href="/my-courses" className={linkClass}>My courses</Link>
            <Link href="/my-certificates" className={linkClass}>My certificates</Link>
          </div>
        </>
      )}
    </section>
  );
}

function InstructorSummary() {
  const { data, isLoading } = useGetInstructorDashboardQuery(undefined);
  const c = data?.cards;
  return (
    <section className="mt-10">
      <Title>Your teaching</Title>
      {isLoading && <p className="mt-4 text-ink/60 dark:text-parchment/60">Loading...</p>}
      {c && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Courses" value={c.courses} />
            <Stat label="Published" value={c.activeCourses} />
            <Stat label="Students" value={c.students} />
            <Stat label="Completion rate" value={`${Math.round(c.completionRate)}%`} />
          </div>
          <div className="mt-4 flex flex-wrap gap-6">
            <Link href="/instructor/students" className={linkClass}>Students</Link>
            <Link href="/instructor/assignments" className={linkClass}>
              Assignments{c.pendingToGrade ? ` (${c.pendingToGrade} to grade)` : ""}
            </Link>
            <Link href="/instructor/reviews" className={linkClass}>Reviews</Link>
          </div>
        </>
      )}
    </section>
  );
}

function AdminSummary() {
  return (
    <section className="mt-10">
      <Title>Administrator</Title>
      <p className="mt-4 text-ink/70 dark:text-parchment/70">
        You manage the whole platform: courses, people, approvals and settings.
      </p>
      <div className="mt-4 flex gap-6">
        <Link href="/admin" className={linkClass}>Admin dashboard</Link>
        <Link href="/admin/activity-log" className={linkClass}>Activity log</Link>
      </div>
    </section>
  );
}

export default function ProfileSummary({ role }: { role?: string }) {
  if (role === "student") return <StudentSummary />;
  if (role === "instructor") return <InstructorSummary />;
  if (role === "admin") return <AdminSummary />;
  return null;
}
