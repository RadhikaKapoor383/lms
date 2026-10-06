"use client";

import Link from "next/link";
import { Tile } from "./analytics";
import { useGetInstructorDashboardQuery } from "@/redux/features/dashboard/dashboardApi";
import { timeAgo } from "@/utils/notifications";

const ACTIONS = [
  { label: "Create course", href: "/instructor/create-course" },
  { label: "Announcement", href: "/instructor/announcements" },
  { label: "Discussions", href: "/instructor/discussions" },
  { label: "Reviews", href: "/instructor/reviews" },
  { label: "Analytics", href: "/instructor/analytics" },
];

// The numbers and to-do lists at the top of the instructor's home page.
export default function InstructorInsights() {
  const { data } = useGetInstructorDashboardQuery(undefined, { refetchOnMountOrArgChange: true });
  const cards = data?.cards;

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-3">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-full border border-parchment-dark px-4 py-1.5 text-sm text-ink hover:border-mustard dark:border-ink-light dark:text-parchment"
          >
            {a.label}
          </Link>
        ))}
      </div>

      {cards && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Tile label="Courses" value={cards.courses} />
            <Tile label="Active (published)" value={cards.activeCourses} />
            <Tile label="Pending approval" value={cards.pendingCourses} />
            <Tile label="Students" value={cards.students} />
            <Tile label="Completion rate" value={`${cards.completionRate}%`} />
            <Tile label="To grade" value={cards.pendingToGrade} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <section className="border border-parchment-dark p-5 dark:border-ink-light">
              <h2 className="font-display text-lg text-ink dark:text-parchment">Waiting to be graded</h2>
              <div className="mt-3 divide-y divide-parchment-dark text-sm dark:divide-ink-light">
                {data.pendingToGrade.length === 0 && <p className="py-2 text-ink/60 dark:text-parchment/60">All caught up.</p>}
                {data.pendingToGrade.map((s: any) => (
                  <Link
                    key={s._id}
                    href={`/instructor/assignments/${s.assignmentId}/submissions`}
                    className="block py-2 hover:opacity-80"
                  >
                    <p className="text-ink dark:text-parchment">
                      {s.student}
                      {s.isLate && <span className="ml-2 text-xs text-clay">late</span>}
                    </p>
                    <p className="text-ink/60 dark:text-parchment/60">
                      {s.assignment} · {timeAgo(s.submittedAt)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="border border-parchment-dark p-5 dark:border-ink-light">
              <h2 className="font-display text-lg text-ink dark:text-parchment">Deadlines (next 14 days)</h2>
              <div className="mt-3 divide-y divide-parchment-dark text-sm dark:divide-ink-light">
                {data.upcomingDeadlines.length === 0 && <p className="py-2 text-ink/60 dark:text-parchment/60">None coming up.</p>}
                {data.upcomingDeadlines.map((a: any) => (
                  <div key={a._id} className="py-2">
                    <p className="text-ink dark:text-parchment">{a.title}</p>
                    <p className="text-ink/60 dark:text-parchment/60">
                      {a.course} · {new Date(a.deadline).toLocaleDateString()} · {a.submitted} submitted
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-parchment-dark p-5 dark:border-ink-light">
              <h2 className="font-display text-lg text-ink dark:text-parchment">Recent student activity</h2>
              <div className="mt-3 divide-y divide-parchment-dark text-sm dark:divide-ink-light">
                {data.recentActivity.length === 0 && <p className="py-2 text-ink/60 dark:text-parchment/60">Nothing yet.</p>}
                {data.recentActivity.map((a: any, i: number) => (
                  <div key={i} className="py-2">
                    <p className="text-ink dark:text-parchment">
                      {a.student || "A student"} {a.text}
                    </p>
                    <p className="text-ink/60 dark:text-parchment/60">{timeAgo(a.at)}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
