"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import Loader from "@/components/Loader";
import {
  useCreateAssignmentMutation,
  useDeleteAssignmentMutation,
  useGetCourseAssignmentsQuery,
} from "@/redux/features/assignments/assignmentsApi";
import { useGetInstructorCoursesQuery } from "@/redux/features/courses/coursesApi";

const emptyForm = {
  title: "",
  instructions: "",
  maxMarks: 100,
  deadline: "",
  allowResubmission: false,
};

export default function CourseAssignmentsPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const { data: coursesData } = useGetInstructorCoursesQuery(undefined);
  const course = coursesData?.courses?.find((c: any) => c._id === courseId);

  const { data, isLoading, isError } = useGetCourseAssignmentsQuery(courseId);
  const [createAssignment, { isLoading: isCreating }] = useCreateAssignmentMutation();
  const [deleteAssignment] = useDeleteAssignmentMutation();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const assignments = data?.assignments || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await createAssignment({ courseId, data: form }).unwrap();
      setForm(emptyForm);
      setShowForm(false);
    } catch (err: any) {
      setError(err?.data?.message || "Could not create the assignment");
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      await deleteAssignment(id).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not delete the assignment");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink dark:text-parchment">
          Assignments{course ? ` — ${course.name}` : ""}
        </h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark"
        >
          {showForm ? "Cancel" : "+ New assignment"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-clay">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 max-w-lg space-y-4 border border-parchment-dark p-5 dark:border-ink-light">
          <div>
            <label className="block text-sm font-medium text-ink dark:text-parchment">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink dark:text-parchment">Instructions</label>
            <textarea
              rows={3}
              value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
              className="mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink dark:text-parchment">Max marks</label>
              <input
                type="number"
                min={1}
                required
                value={form.maxMarks}
                onChange={(e) => setForm((f) => ({ ...f, maxMarks: Number(e.target.value) }))}
                className="mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink dark:text-parchment">Deadline</label>
              <input
                type="datetime-local"
                required
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink dark:text-parchment">
            <input
              type="checkbox"
              checked={form.allowResubmission}
              onChange={(e) => setForm((f) => ({ ...f, allowResubmission: e.target.checked }))}
            />
            Allow resubmission
          </label>
          <button
            type="submit"
            disabled={isCreating}
            className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
          >
            {isCreating ? "Creating..." : "Create assignment"}
          </button>
        </form>
      )}

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load assignments.</p>}
      {!isLoading && !isError && assignments.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No assignments yet.</p>
      )}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {assignments.map((a: any) => (
          <div key={a._id} className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-ink dark:text-parchment">{a.title}</p>
              <p className="text-sm text-ink/60 dark:text-parchment/60">
                Due {new Date(a.deadline).toLocaleString()} · {a.maxMarks} marks ·{" "}
                {a.submissionCount} submission{a.submissionCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/instructor/assignments/${a._id}/submissions`}
                className="text-sm text-mustard-dark hover:underline dark:text-mustard"
              >
                Grade
              </Link>
              <button onClick={() => handleDelete(a._id)} className="text-sm text-clay hover:underline">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
