"use client";

import Link from "next/link";
import { useState } from "react";
import Loader from "@/components/Loader";
import { useGetCourseApprovalsQuery } from "@/redux/features/admin/adminApi";
import { useUpdateCourseStatusMutation } from "@/redux/features/courses/coursesApi";
import { timeAgo } from "@/utils/notifications";

export default function CourseApprovalsPage() {
  const { data, isLoading, isError } = useGetCourseApprovalsQuery(undefined);
  const [updateStatus, { isLoading: isUpdating }] = useUpdateCourseStatusMutation();
  const [error, setError] = useState("");
  const courses: any[] = data?.courses || [];

  const decide = async (id: string, status: "Published" | "Rejected") => {
    let reason: string | undefined;
    if (status === "Rejected") {
      // the instructor sees this reason in their notification; Cancel aborts
      const answer = window.prompt("Reason for rejecting (the instructor will see this):");
      if (answer === null) return;
      reason = answer;
    }
    setError("");
    try {
      await updateStatus({ id, status, reason }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not update the course");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Course approvals</h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        Courses instructors have submitted for review, longest wait first.
      </p>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load the queue.</p>}
      {!isLoading && !isError && courses.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">Nothing waiting for approval.</p>
      )}
      {error && <p className="mt-4 text-sm text-clay">{error}</p>}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {courses.map((c) => (
          <div key={c._id} className="py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="font-medium text-ink dark:text-parchment">{c.name}</p>
                <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
                  {c.instructor ? `by ${c.instructor.name} (${c.instructor.email})` : "No instructor"} ·{" "}
                  {c.modules} module{c.modules === 1 ? "" : "s"}, {c.lessons} lesson{c.lessons === 1 ? "" : "s"}
                  {c.category ? ` · ${c.category}` : ""}
                  {c.level ? ` · ${c.level}` : ""} · waiting since {timeAgo(c.submittedAt)}
                </p>
                {c.description && (
                  <p className="mt-2 line-clamp-3 text-sm text-ink/80 dark:text-parchment/80">{c.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Link
                  href={`/admin/edit-course/${c._id}`}
                  className="text-mustard-dark hover:underline dark:text-mustard"
                >
                  Review content
                </Link>
                <button
                  onClick={() => decide(c._id, "Rejected")}
                  disabled={isUpdating}
                  className="text-clay hover:underline disabled:opacity-60"
                >
                  Reject
                </button>
                <button
                  onClick={() => decide(c._id, "Published")}
                  disabled={isUpdating}
                  className="rounded-full bg-mustard px-4 py-1.5 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
                >
                  Approve &amp; publish
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
