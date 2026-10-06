"use client";

import Link from "next/link";
import Loader from "@/components/Loader";
import { Tile } from "@/components/analytics";
import { useGetAdminDashboardQuery } from "@/redux/features/dashboard/dashboardApi";
import { timeAgo } from "@/utils/notifications";

function Section({ title, href, linkLabel, children }: { title: string; href?: string; linkLabel?: string; children: React.ReactNode }) {
  return (
    <section className="border border-parchment-dark p-5 dark:border-ink-light">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-ink dark:text-parchment">{title}</h2>
        {href && (
          <Link href={href} className="text-sm text-mustard-dark hover:underline dark:text-mustard">
            {linkLabel}
          </Link>
        )}
      </div>
      <div className="mt-3 divide-y divide-parchment-dark text-sm dark:divide-ink-light">{children}</div>
    </section>
  );
}

const Empty = ({ text }: { text: string }) => <p className="py-3 text-ink/60 dark:text-parchment/60">{text}</p>;

export default function AdminOverviewPage() {
  const { data, isLoading, isError } = useGetAdminDashboardQuery(undefined, { refetchOnMountOrArgChange: true });
  const cards = data?.cards;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-ink dark:text-parchment">Overview</h1>
        <Link
          href="/admin/analytics"
          className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark"
        >
          Platform analytics
        </Link>
      </div>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load the dashboard.</p>}

      {cards && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Tile label="Students" value={cards.students} hint={`${cards.activeStudents} active`} />
            <Tile label="Instructors" value={cards.instructors} hint={`${cards.activeInstructors} active`} />
            <Tile label="Courses" value={cards.courses} />
            <Tile label="Published" value={cards.published} />
            <Tile label="Pending approval" value={cards.pending} />
            <Tile label="Drafts" value={cards.draft} />
            <Tile label="Enrollments" value={cards.enrollments} />
            <Tile label="Completion rate" value={`${cards.completionRate}%`} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Section title="Pending approvals" href="/admin/course-approvals" linkLabel="Review all">
              {data.pendingApprovals.length === 0 && <Empty text="Nothing waiting." />}
              {data.pendingApprovals.map((c: any) => (
                <div key={c._id} className="flex justify-between gap-4 py-3">
                  <p className="text-ink dark:text-parchment">
                    {c.name}
                    <span className="text-ink/60 dark:text-parchment/60"> · {c.instructor?.name || "no instructor"}</span>
                  </p>
                  <p className="shrink-0 text-ink/50 dark:text-parchment/50">waiting {timeAgo(c.updatedAt).replace(" ago", "")}</p>
                </div>
              ))}
            </Section>

            <Section title="Recent courses" href="/admin/all-courses" linkLabel="All courses">
              {data.recentCourses.length === 0 && <Empty text="No courses yet." />}
              {data.recentCourses.map((c: any) => (
                <div key={c._id} className="flex justify-between gap-4 py-3">
                  <p className="text-ink dark:text-parchment">
                    {c.name}
                    <span className="text-ink/60 dark:text-parchment/60"> · {c.instructor?.name || "no instructor"}</span>
                  </p>
                  <p className="shrink-0 text-ink/50 dark:text-parchment/50">{c.status}</p>
                </div>
              ))}
            </Section>

            <Section title="Recent enrollments" href="/admin/enrollments" linkLabel="All enrollments">
              {data.recentEnrollments.length === 0 && <Empty text="No enrollments yet." />}
              {data.recentEnrollments.map((e: any) => (
                <div key={e._id} className="flex justify-between gap-4 py-3">
                  <p className="text-ink dark:text-parchment">
                    {e.student?.name || "A student"}
                    <span className="text-ink/60 dark:text-parchment/60"> joined {e.course?.name || "a course"}</span>
                  </p>
                  <p className="shrink-0 text-ink/50 dark:text-parchment/50">{timeAgo(e.createdAt)}</p>
                </div>
              ))}
            </Section>

            <Section title="Instructor activity" href="/admin/instructors" linkLabel="Instructors">
              {data.recentInstructorActivity.length === 0 && <Empty text="No instructor activity logged yet." />}
              {data.recentInstructorActivity.map((a: any) => (
                <div key={a._id} className="flex justify-between gap-4 py-3">
                  <p className="text-ink dark:text-parchment">
                    {a.userName}
                    <span className="text-ink/60 dark:text-parchment/60"> · {a.targetLabel}</span>
                  </p>
                  <p className="shrink-0 text-ink/50 dark:text-parchment/50">{timeAgo(a.createdAt)}</p>
                </div>
              ))}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
