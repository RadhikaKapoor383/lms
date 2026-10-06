"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Loader from "@/components/Loader";
import { useGetInstructorDetailQuery } from "@/redux/features/admin/adminApi";
import { timeAgo } from "@/utils/notifications";

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="border border-parchment-dark p-4 dark:border-ink-light">
    <p className="font-display text-2xl text-ink dark:text-parchment">{value}</p>
    <p className="text-xs uppercase tracking-wide text-ink/50 dark:text-parchment/50">{label}</p>
  </div>
);

export default function AdminInstructorDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data, isLoading, isError } = useGetInstructorDetailQuery(id);

  const instructor = data?.instructor;
  const summary = data?.summary;
  const engagement = data?.engagement;
  const courses: any[] = data?.courses || [];
  const activity: any[] = data?.recentActivity || [];

  return (
    <div>
      <Link href="/admin/instructors" className="text-sm text-mustard-dark hover:underline dark:text-mustard">
        ← All instructors
      </Link>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load this instructor.</p>}

      {instructor && summary && (
        <>
          <div className="mt-4">
            <h1 className="font-display text-3xl text-ink dark:text-parchment">
              {instructor.name}
              {!instructor.isActive && (
                <span className="ml-3 rounded-full bg-clay/20 px-2.5 py-0.5 align-middle text-xs font-normal text-clay">
                  Deactivated
                </span>
              )}
            </h1>
            <p className="text-ink/60 dark:text-parchment/60">
              {instructor.email} · joined {new Date(instructor.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Courses" value={summary.courses} />
            <Stat label="Published" value={summary.published} />
            <Stat label="Pending approval" value={summary.pending} />
            <Stat label="Drafts" value={summary.draft} />
            <Stat label="Students" value={summary.students} />
            <Stat label="Completion rate" value={`${summary.completionRate}%`} />
            <Stat label="Active students (30 days)" value={engagement.activeStudents30d} />
            <Stat label="Lessons completed (30 days)" value={engagement.lessonsCompleted30d} />
          </div>

          <h2 className="mt-12 font-display text-2xl text-ink dark:text-parchment">Courses</h2>
          {courses.length === 0 ? (
            <p className="mt-3 text-ink/60 dark:text-parchment/60">No courses yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-parchment-dark dark:divide-ink-light">
              {courses.map((c) => (
                <div key={c._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-ink dark:text-parchment">{c.name}</p>
                    <p className="text-sm text-ink/60 dark:text-parchment/60">
                      {c.status} · {c.students} student{c.students === 1 ? "" : "s"} · {c.completionRate}% completed
                      {c.ratings ? ` · ★ ${c.ratings}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/admin/edit-course/${c._id}`}
                    className="text-sm text-mustard-dark hover:underline dark:text-mustard"
                  >
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}

          <h2 className="mt-12 font-display text-2xl text-ink dark:text-parchment">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="mt-3 text-ink/60 dark:text-parchment/60">Nothing logged yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-parchment-dark dark:divide-ink-light">
              {activity.map((a) => (
                <div key={a._id} className="flex justify-between gap-4 py-3 text-sm">
                  <p className="text-ink dark:text-parchment">{a.targetLabel}</p>
                  <p className="shrink-0 text-ink/50 dark:text-parchment/50">{timeAgo(a.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
