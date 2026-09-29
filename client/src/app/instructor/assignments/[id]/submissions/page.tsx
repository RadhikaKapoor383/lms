"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Loader from "@/components/Loader";
import {
  useGetAssignmentSubmissionsQuery,
  useGradeSubmissionMutation,
} from "@/redux/features/assignments/assignmentsApi";

function GradeRow({ assignmentId, submission }: { assignmentId: string; submission: any }) {
  const [gradeSubmission, { isLoading }] = useGradeSubmissionMutation();
  const [marks, setMarks] = useState(submission.marks ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [error, setError] = useState("");

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await gradeSubmission({
        assignmentId,
        studentId: submission.student._id,
        marks: Number(marks),
        feedback,
      }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not save the grade");
    }
  };

  return (
    <div className="py-5">
      <div className="flex items-center gap-3">
        <p className="font-medium text-ink dark:text-parchment">{submission.student?.name}</p>
        {submission.isLate && (
          <span className="rounded-full bg-clay/20 px-2.5 py-0.5 text-xs text-clay">Late</span>
        )}
        {submission.marks !== undefined && submission.marks !== null && (
          <span className="rounded-full bg-mustard/30 px-2.5 py-0.5 text-xs text-mustard-dark">
            Graded: {submission.marks}
          </span>
        )}
      </div>
      <p className="text-sm text-ink/60 dark:text-parchment/60">
        Submitted {new Date(submission.submittedAt).toLocaleString()}
      </p>

      {submission.submissionText && (
        <p className="mt-2 whitespace-pre-wrap text-ink/80 dark:text-parchment/80">
          {submission.submissionText}
        </p>
      )}
      {submission.fileUrl && (
        <a
          href={submission.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-sm text-mustard-dark underline dark:text-mustard"
        >
          View submitted file
        </a>
      )}

      <form onSubmit={handleGrade} className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-ink/60 dark:text-parchment/60">Marks</label>
          <input
            type="number"
            required
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            className="w-24 border border-parchment-dark bg-transparent px-3 py-1.5 outline-none focus:border-mustard dark:border-ink-light"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-ink/60 dark:text-parchment/60">Feedback</label>
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full border border-parchment-dark bg-transparent px-3 py-1.5 outline-none focus:border-mustard dark:border-ink-light"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full bg-mustard px-4 py-1.5 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
        >
          {isLoading ? "Saving..." : "Save grade"}
        </button>
      </form>
      {error && <p className="mt-1 text-sm text-clay">{error}</p>}
    </div>
  );
}

export default function AssignmentSubmissionsPage() {
  const params = useParams();
  const assignmentId = params?.id as string;

  const { data, isLoading, isError } = useGetAssignmentSubmissionsQuery(assignmentId);
  const submissions = data?.submissions || [];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Submissions</h1>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load submissions.</p>}
      {!isLoading && !isError && submissions.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No submissions yet.</p>
      )}

      <div className="mt-6 divide-y divide-parchment-dark dark:divide-ink-light">
        {submissions.map((s: any) => (
          <GradeRow key={s._id} assignmentId={assignmentId} submission={s} />
        ))}
      </div>
    </div>
  );
}
