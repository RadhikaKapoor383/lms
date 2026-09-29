"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import {
  useGetCourseAssignmentsQuery,
  useSubmitAssignmentMutation,
} from "@/redux/features/assignments/assignmentsApi";

function AssignmentCard({ courseId, assignment }: { courseId: string; assignment: any }) {
  const [submitAssignment, { isLoading }] = useSubmitAssignmentMutation();
  const existing = assignment.mySubmission;

  const [submissionText, setSubmissionText] = useState(existing?.submissionText || "");
  const [fileUrl, setFileUrl] = useState(existing?.fileUrl || "");
  const [error, setError] = useState("");

  const isGraded = existing?.marks !== undefined && existing?.marks !== null;
  const canEdit = !existing || assignment.allowResubmission;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await submitAssignment({ assignmentId: assignment._id, submissionText, fileUrl }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not submit");
    }
  };

  return (
    <div className="border border-parchment-dark p-5 dark:border-ink-light">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium text-ink dark:text-parchment">{assignment.title}</p>
        {isGraded && (
          <span className="rounded-full bg-mustard/30 px-2.5 py-0.5 text-xs text-mustard-dark">
            Graded: {existing.marks}/{assignment.maxMarks}
          </span>
        )}
        {existing && !isGraded && (
          <span className="rounded-full bg-ink-light px-2.5 py-0.5 text-xs text-parchment">
            Submitted{existing.isLate ? " (late)" : ""}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        Due {new Date(assignment.deadline).toLocaleString()} · {assignment.maxMarks} marks
      </p>
      {assignment.instructions && (
        <p className="mt-3 text-ink/80 dark:text-parchment/80">{assignment.instructions}</p>
      )}

      {isGraded && existing.feedback && (
        <p className="mt-3 border-l-2 border-mustard pl-3 text-sm text-ink/80 dark:text-parchment/80">
          {existing.feedback}
        </p>
      )}

      {canEdit ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <textarea
            rows={3}
            value={submissionText}
            onChange={(e) => setSubmissionText(e.target.value)}
            placeholder="Write your answer..."
            className="w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
          />
          <input
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="Link to your file (Drive, GitHub...)"
            className="w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
          />
          {error && <p className="text-sm text-clay">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
          >
            {isLoading ? "Submitting..." : existing ? "Resubmit" : "Submit"}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-ink/50 dark:text-parchment/50">
          Already submitted. This assignment doesn&apos;t allow resubmission.
        </p>
      )}
    </div>
  );
}

export default function CourseAssignmentsStudentPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const { data, isLoading, isError } = useGetCourseAssignmentsQuery(courseId);
  const assignments = data?.assignments || [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ink dark:text-parchment">Assignments</h1>
          <Link
            href={`/course-access/${courseId}`}
            className="text-sm text-mustard-dark hover:underline dark:text-mustard"
          >
            Back to lessons
          </Link>
        </div>

        {isLoading && <Loader />}
        {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load assignments.</p>}
        {!isLoading && !isError && assignments.length === 0 && (
          <p className="mt-6 text-ink/60 dark:text-parchment/60">No assignments for this course yet.</p>
        )}

        <div className="mt-8 space-y-4">
          {assignments.map((a: any) => (
            <AssignmentCard key={a._id} courseId={courseId} assignment={a} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
