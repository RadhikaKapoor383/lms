"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import { useGetInstructorCoursesQuery } from "@/redux/features/courses/coursesApi";
import { useGetInstructorStudentsQuery } from "@/redux/features/instructor/instructorListsApi";
import { timeAgo } from "@/utils/timeAgo";

const PAGE_SIZE = 20;

export default function InstructorStudentsPage() {
  const { data: coursesData } = useGetInstructorCoursesQuery(undefined);
  const courses: any[] = coursesData?.courses || [];

  const [search, setSearch] = useState("");
  const [q, setQ] = useState(""); // the search, once you stop typing
  const [courseId, setCourseId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  // wait until you pause typing before asking the server
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  // a new search or filter starts again from the first page
  useEffect(() => setPage(1), [q, courseId, status]);

  const { data, isLoading, isFetching, isError } = useGetInstructorStudentsQuery(
    { page, limit: PAGE_SIZE, q, courseId, status },
    { refetchOnMountOrArgChange: true }
  );
  const rows: any[] = data?.students || [];
  const summary = data?.summary;
  const pages: number = data?.pages || 1;

  const field =
    "border border-parchment-dark bg-transparent px-3 py-2 text-sm outline-none focus:border-mustard dark:border-ink-light";

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Students</h1>
      <p className="mt-2 text-sm text-ink/60 dark:text-parchment/60">Everyone enrolled in your courses.</p>

      {summary && (
        <div className="mt-6 grid grid-cols-3 gap-4 sm:max-w-xl">
          {[
            ["Students", summary.students],
            ["Enrolments", summary.enrolments],
            ["Completed", summary.completed],
          ].map(([label, value]) => (
            <div key={label as string} className="border border-parchment-dark p-4 dark:border-ink-light">
              <p className="text-2xl font-display text-ink dark:text-parchment">{value}</p>
              <p className="text-xs text-ink/60 dark:text-parchment/60">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search students"
          maxLength={100}
          className={`${field} w-64`}
        />
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} aria-label="Filter by course" className={field}>
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={field}>
          <option value="">Any status</option>
          <option value="active">In progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-clay">Couldn&apos;t load your students.</p>}
      {!isLoading && !isError && rows.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          {q || courseId || status ? "No students match that." : "No one is enrolled in your courses yet."}
        </p>
      )}

      {rows.length > 0 && (
        <div className={`mt-6 overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-parchment-dark text-ink/60 dark:border-ink-light dark:text-parchment/60">
              <tr>
                <th className="py-2 pr-4 font-medium">Student</th>
                <th className="py-2 pr-4 font-medium">Course</th>
                <th className="py-2 pr-4 font-medium">Progress</th>
                <th className="py-2 pr-4 font-medium">Enrolled</th>
                <th className="py-2 pr-4 font-medium">Last active</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-parchment-dark dark:divide-ink-light">
              {rows.map((r) => {
                const pct = Math.min(100, Math.max(0, Math.round(r.completionPercentage)));
                return (
                  <tr key={r.enrollmentId} className="text-ink dark:text-parchment">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{r.student.name}</p>
                      <p className="text-xs text-ink/60 dark:text-parchment/60">{r.student.email}</p>
                    </td>
                    <td className="py-3 pr-4">{r.course.name}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-1.5 w-24 rounded-full bg-parchment-dark dark:bg-ink"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${r.student.name} progress`}
                        >
                          <div className="h-1.5 rounded-full bg-mustard" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs">{r.status === "completed" ? "Done" : `${pct}%`}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-ink/70 dark:text-parchment/70">
                      {new Date(r.enrolledAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 text-ink/70 dark:text-parchment/70">
                      {r.lastActivityAt ? timeAgo(r.lastActivityAt) : "No activity yet"}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/instructor/courses/${r.course._id}/students`}
                        className="text-mustard-dark hover:underline dark:text-mustard"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center gap-4 text-sm text-ink dark:text-parchment">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border border-parchment-dark px-3 py-1 disabled:opacity-40 dark:border-ink-light"
          >
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="rounded border border-parchment-dark px-3 py-1 disabled:opacity-40 dark:border-ink-light"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
