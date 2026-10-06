"use client";

import Link from "next/link";
import { useState } from "react";
import Loader from "@/components/Loader";
import { COURSE_STATUSES } from "@/components/CourseForm";
import {
  useAssignCourseInstructorMutation,
  useGetInstructorsQuery,
} from "@/redux/features/admin/adminApi";
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

  // Only active instructors can be given a course.
  const { data: instructorData } = useGetInstructorsQuery(undefined);
  const activeInstructors: any[] = (instructorData?.instructors || []).filter((i: any) => i.isActive);
  const [assignInstructor] = useAssignCourseInstructorMutation();
  const [assignError, setAssignError] = useState("");

  const handleAssign = async (courseId: string, instructorId: string) => {
    if (!instructorId) return;
    setAssignError("");
    try {
      await assignInstructor({ courseId, instructorId }).unwrap();
    } catch (err: any) {
      setAssignError(err?.data?.message || "Could not assign the instructor");
    }
  };

  // Text search runs on the list already loaded for the chosen status tab.
  const [search, setSearch] = useState("");
  const needle = search.trim().toLowerCase();
  const courses = (data?.courses || []).filter(
    (c: any) =>
      !needle ||
      c.name?.toLowerCase().includes(needle) ||
      c.instructor?.name?.toLowerCase().includes(needle)
  );

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

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by course or instructor…"
        aria-label="Search courses"
        className="mt-6 w-full max-w-sm border border-parchment-dark bg-transparent px-3 py-2 text-sm outline-none focus:border-mustard dark:border-ink-light"
      />

      <div className="mt-4 flex flex-wrap gap-2 border-b border-parchment-dark pb-4 dark:border-ink-light">
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

      {assignError && <p className="mt-4 text-sm text-clay">{assignError}</p>}

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
                aria-label="Instructor"
                value={course.instructor?._id || ""}
                onChange={(e) => handleAssign(course._id, e.target.value)}
                className="max-w-[10rem] border border-parchment-dark bg-transparent px-2 py-1 text-sm dark:border-ink-light"
              >
                {!course.instructor?._id && (
                  <option value="" disabled>
                    Assign instructor…
                  </option>
                )}
                {activeInstructors.map((i: any) => (
                  <option key={i._id} value={i._id}>
                    {i.name}
                  </option>
                ))}
                {/* keep the current owner visible even if they were deactivated */}
                {course.instructor?._id &&
                  !activeInstructors.some((i: any) => i._id === course.instructor._id) && (
                    <option value={course.instructor._id} disabled>
                      {course.instructor.name} (deactivated)
                    </option>
                  )}
              </select>

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