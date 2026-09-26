"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Loader from "@/components/Loader";
import {
  useEnrollStudentByInstructorMutation,
  useGetCourseStudentsQuery,
  useUnenrollStudentMutation,
} from "@/redux/features/enrollment/enrollmentApi";
import { useGetInstructorCoursesQuery } from "@/redux/features/courses/coursesApi";

const statusBadgeClass: Record<string, string> = {
  active: "bg-ink-light text-parchment",
  completed: "bg-mustard/30 text-mustard-dark",
  revoked: "bg-clay/20 text-clay",
};

export default function CourseStudentsPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const { data: coursesData } = useGetInstructorCoursesQuery(undefined);
  const course = coursesData?.courses?.find((c: any) => c._id === courseId);

  const { data, isLoading, isError } = useGetCourseStudentsQuery(courseId);
  const [enrollStudent, { isLoading: isEnrolling }] = useEnrollStudentByInstructorMutation();
  const [unenrollStudent] = useUnenrollStudentMutation();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const enrollments = data?.enrollments || [];

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await enrollStudent({ courseId, email }).unwrap();
      setEmail("");
    } catch (err: any) {
      setError(err?.data?.message || "Could not enroll that student");
    }
  };

  const handleRemove = async (studentId: string) => {
    setError("");
    try {
      await unenrollStudent({ courseId, studentId }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not remove that student");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">
        Students{course ? ` — ${course.name}` : ""}
      </h1>

      {course?.enrollmentMode === "manual" && (
        <p className="mt-2 text-sm text-ink/60 dark:text-parchment/60">
          This is a private course — you&apos;re the only way students get in.
        </p>
      )}

      <form onSubmit={handleEnroll} className="mt-8 flex max-w-md gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="student@example.com"
          className="w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
        />
        <button
          type="submit"
          disabled={isEnrolling}
          className="rounded-full bg-mustard px-5 py-2.5 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
        >
          {isEnrolling ? "Adding..." : "Add student"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-clay">{error}</p>}

      {isLoading && <Loader />}
      {isError && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          Couldn&apos;t load the student list.
        </p>
      )}
      {!isLoading && !isError && enrollments.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          No students enrolled yet.
        </p>
      )}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {enrollments.map((e: any) => (
          <div key={e._id} className="flex items-center justify-between py-4">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-medium text-ink dark:text-parchment">
                  {e.student?.name || "Unknown student"}
                </p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    statusBadgeClass[e.status] || "bg-parchment-dark text-ink/70"
                  }`}
                >
                  {e.status}
                </span>
              </div>
              <p className="text-sm text-ink/60 dark:text-parchment/60">
                {e.student?.email} · joined via {e.method} · {Math.round(e.completionPercentage || 0)}% complete
              </p>
            </div>
            {e.status !== "revoked" && (
              <button
                onClick={() => handleRemove(e.student._id)}
                className="text-sm text-clay hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
