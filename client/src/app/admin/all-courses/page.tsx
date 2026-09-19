"use client";

import Link from "next/link";
import { useState } from "react";
import Loader from "@/components/Loader";
import {
  useDeleteCourseAdminMutation,
  useGetAdminAllCoursesQuery,
} from "@/redux/features/courses/coursesApi";

export default function AllCoursesPage() {
  const { data, isLoading, isError } = useGetAdminAllCoursesQuery(undefined);
  const [deleteCourse] = useDeleteCourseAdminMutation();
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

      {isLoading && <Loader />}
      {isError && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          Couldn&apos;t load courses.
        </p>
      )}

      {courses.length === 0 && !isLoading && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          No courses yet — create your first one.
        </p>
      )}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {courses.map((course: any) => (
          <div
            key={course._id}
            className="flex items-center justify-between py-4"
          >
            <div>
              <p className="font-medium text-ink dark:text-parchment">{course.name}</p>
              <p className="text-sm text-ink/60 dark:text-parchment/60">
                ${course.price} · {course.purchased || 0} enrolled · {course.tags}
              </p>
            </div>
            <div className="flex items-center gap-4">
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