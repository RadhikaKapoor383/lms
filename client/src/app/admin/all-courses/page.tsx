"use client";

import Link from "next/link";
import { useState } from "react";
import Loader from "@/components/Loader";
import { COURSE_STATUSES } from "@/components/CourseForm";
import {
  useDeleteCourseAdminMutation,
  useGetAdminAllCoursesQuery,
  useUpdateCourseStatusMutation,
} from "@/redux/features/courses/coursesApi";

const statusBadgeClass: Record<string, string> = {
  Draft: "bg-parchment-dark text-ink/70",
  "Pending Approval": "bg-mustard/30 text-mustard-dark",
  Published: "bg-ink-light text-parchment",
  Rejected: "bg-clay/20 text-clay",
  Archived: "bg-parchment-dark text-ink/40",
};

const tabs = ["All", ...COURSE_STATUSES];

export default function AllCoursesPage() {
  const [activeTab, setActiveTab] = useState("All");
  const { data, isLoading, isError } = useGetAdminAllCoursesQuery(
    activeTab === "All" ? undefined : activeTab
  );
  const [deleteCourse] = useDeleteCourseAdminMutation();
  const [updateStatus] = useUpdateCourseStatusMutation();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const courses = data?.courses || [];

  const handleDelete = async (id: string) => {
    await deleteCourse(id);
    setConfirmId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink dark:text-parchment">
          All courses
        </h1>
        <Link
          href="/admin/create-course"
          className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark"
        >
          + New course
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-parchment-dark pb-4 dark:border-ink-light">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              activeTab === tab
                ? "bg-ink text-parchment dark:bg-parchment dark:text-ink"
                : "text-ink/60 hover:bg-parchment-dark/50 dark:text-parchment/60 dark:hover:bg-ink-light"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading && <Loader />}
      {isError && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          Couldn&apos;t load courses.
        </p>
      )}

      {courses.length === 0 && !isLoading && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          No courses in this view.
        </p>
      )}

      <div className="mt-4 divide-y divide-parchment-dark dark:divide-ink-light">
        {courses.map((course: any) => (
          <div
            key={course._id}
            className="flex items-center justify-between py-4"
          >
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
                ${course.price} · {course.purchased || 0} enrolled · {course.category?.name || "No category"} ·{" "}
                {course.instructor?.name ? `by ${course.instructor.name}` : "No instructor assigned"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={course.status}
                onChange={(e) => {
                  const status = e.target.value;
                  if (status === "Rejected") {
                    // the reason goes to the instructor in their notification;
                    // Cancel (null) aborts the change
                    const reason = window.prompt("Reason for rejecting (the instructor will see this):");
                    if (reason === null) return;
                    updateStatus({ id: course._id, status, reason });
                    return;
                  }
                  updateStatus({ id: course._id, status });
                }}
                className="border border-parchment-dark bg-transparent px-2 py-1 text-sm dark:border-ink-light"
              >
                {COURSE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <Link
                href={`/admin/edit-course/${course._id}`}
                className="text-sm text-mustard-dark hover:underline dark:text-mustard"
              >
                Edit
              </Link>
              {confirmId === course._id ? (
                <>
                  <button
                    onClick={() => handleDelete(course._id)}
                    className="text-sm text-clay"
                  >
                    Confirm delete
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-sm text-ink/50 dark:text-parchment/50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmId(course._id)}
                  className="text-sm text-clay hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}