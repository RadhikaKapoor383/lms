"use client";

import Link from "next/link";
import Loader from "@/components/Loader";
import { useState } from "react";
import {
  useGetInstructorCoursesQuery,
  useSubmitCourseForApprovalMutation,
  useWithdrawCourseSubmissionMutation,
} from "@/redux/features/courses/coursesApi";

const statusBadgeClass: Record<string, string> = {
  Draft: "bg-parchment-dark text-ink/70",
  "Pending Approval": "bg-mustard/30 text-mustard-dark",
  Published: "bg-ink-light text-parchment",
  Rejected: "bg-clay/20 text-clay",
  Archived: "bg-parchment-dark text-ink/40",
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-parchment-dark p-5 dark:border-ink-light">
      <p className="text-sm uppercase tracking-wide text-ink/50 dark:text-parchment/50">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-ink dark:text-parchment">
        {value}
      </p>
    </div>
  );
}

export default function InstructorDashboardPage() {
  const { data, isLoading, isError } = useGetInstructorCoursesQuery(undefined);
  const courses = data?.courses || [];

  const [submitForApproval, { isLoading: isSubmitting }] = useSubmitCourseForApprovalMutation();
  const [withdrawSubmission, { isLoading: isWithdrawing }] = useWithdrawCourseSubmissionMutation();
  const [actionError, setActionError] = useState("");

  const runAction = async (action: () => Promise<unknown>, fallback: string) => {
    setActionError("");
    try {
      await action();
    } catch (err: any) {
      setActionError(err?.data?.message || fallback);
    }
  };

  const count = (status: string) =>
    courses.filter((c: any) => c.status === status).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink dark:text-parchment">
          My courses
        </h1>
        <Link
          href="/instructor/create-course"
          className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark"
        >
          + New course
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total courses" value={courses.length} />
        <StatCard label="Published" value={count("Published")} />
        <StatCard label="Drafts" value={count("Draft")} />
      </div>

      {actionError && <p className="mt-4 text-sm text-clay">{actionError}</p>}

      {isLoading && <Loader />}
      {isError && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          Couldn&apos;t load your courses.
        </p>
      )}
      {!isLoading && !isError && courses.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          You haven&apos;t created any courses yet.
        </p>
      )}

      <div className="mt-6 divide-y divide-parchment-dark dark:divide-ink-light">
        {courses.map((course: any) => (
          <div key={course._id} className="flex items-center justify-between py-4">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-medium text-ink dark:text-parchment">{course.name}</p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    statusBadgeClass[course.status] || "bg-parchment-dark text-ink/70"
                  }`}
                >
                  {course.status}
                </span>
              </div>
              <p className="text-sm text-ink/60 dark:text-parchment/60">
                ${course.price} · {course.purchased || 0} enrolled · {course.category?.name || "No category"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {(course.status === "Draft" || course.status === "Rejected") && (
                <button
                  onClick={() =>
                    runAction(
                      () => submitForApproval(course._id).unwrap(),
                      "Could not submit for approval"
                    )
                  }
                  disabled={isSubmitting}
                  className="rounded-full bg-mustard px-3 py-1 text-xs font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
                >
                  {course.status === "Rejected" ? "Resubmit for approval" : "Submit for approval"}
                </button>
              )}
              {course.status === "Pending Approval" && (
                <button
                  onClick={() =>
                    runAction(
                      () => withdrawSubmission(course._id).unwrap(),
                      "Could not withdraw the submission"
                    )
                  }
                  disabled={isWithdrawing}
                  className="text-sm text-clay hover:underline disabled:opacity-60"
                >
                  Withdraw
                </button>
              )}
              <Link
                href={`/instructor/edit-course/${course._id}`}
                className="text-sm text-mustard-dark hover:underline dark:text-mustard"
              >
                Edit
              </Link>
              <Link
                href={`/instructor/courses/${course._id}/students`}
                className="text-sm text-mustard-dark hover:underline dark:text-mustard"
              >
                Students
              </Link>
              <Link
                href={`/instructor/courses/${course._id}/assignments`}
                className="text-sm text-mustard-dark hover:underline dark:text-mustard"
              >
                Assignments
              </Link>
              <Link
                href={`/instructor/courses/${course._id}/quizzes`}
                className="text-sm text-mustard-dark hover:underline dark:text-mustard"
              >
                Quizzes
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
