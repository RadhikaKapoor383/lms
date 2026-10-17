"use client";

import Link from "next/link";
import { useState } from "react";
import Loader from "@/components/Loader";
import { useGetInstructorAssignmentsQuery } from "@/redux/features/instructor/instructorListsApi";

export default function InstructorAssignmentsPage() {
  const { data, isLoading, isError } = useGetInstructorAssignmentsQuery(undefined, { refetchOnMountOrArgChange: true });
  const all: any[] = data?.assignments || [];
  const [onlyToGrade, setOnlyToGrade] = useState(false);
  const rows = onlyToGrade ? all.filter((a) => a.toGrade > 0) : all;
  const now = Date.now();

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Assignments</h1>
      <p className="mt-2 text-sm text-ink/60 dark:text-parchment/60">Every assignment in your courses, latest deadline first.</p>

      {data && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="border border-parchment-dark p-4 dark:border-ink-light">
            <p className="text-2xl font-display text-ink dark:text-parchment">{all.length}</p>
            <p className="text-xs text-ink/60 dark:text-parchment/60">Assignments</p>
          </div>
          <div className="border border-parchment-dark p-4 dark:border-ink-light">
            <p className={`text-2xl font-display ${data.totalToGrade > 0 ? "text-clay" : "text-ink dark:text-parchment"}`}>
              {data.totalToGrade}
            </p>
            <p className="text-xs text-ink/60 dark:text-parchment/60">Waiting for you to grade</p>
          </div>
        </div>
      )}

      <label className="mt-6 flex items-center gap-2 text-sm text-ink dark:text-parchment">
        <input type="checkbox" checked={onlyToGrade} onChange={(e) => setOnlyToGrade(e.target.checked)} />
        Only show assignments that need grading
      </label>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-clay">Couldn&apos;t load your assignments.</p>}
      {!isLoading && !isError && rows.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          {onlyToGrade ? "Nothing is waiting for you to grade." : "You haven't created any assignments yet."}
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-parchment-dark text-ink/60 dark:border-ink-light dark:text-parchment/60">
              <tr>
                <th className="py-2 pr-4 font-medium">Assignment</th>
                <th className="py-2 pr-4 font-medium">Course</th>
                <th className="py-2 pr-4 font-medium">Deadline</th>
                <th className="py-2 pr-4 font-medium">Submitted</th>
                <th className="py-2 pr-4 font-medium">To grade</th>
                <th className="py-2 pr-4 font-medium">Late</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-parchment-dark dark:divide-ink-light">
              {rows.map((a) => {
                const closed = new Date(a.deadline).getTime() < now;
                return (
                  <tr key={a._id} className="text-ink dark:text-parchment">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{a.title}</p>
                      <p className="text-xs text-ink/60 dark:text-parchment/60">{a.maxMarks} marks</p>
                    </td>
                    <td className="py-3 pr-4">{a.course.name}</td>
                    <td className="py-3 pr-4">
                      {new Date(a.deadline).toLocaleDateString()}
                      <span className={`ml-2 text-xs ${closed ? "text-ink/50 dark:text-parchment/50" : "text-mustard-dark dark:text-mustard"}`}>
                        {closed ? "Closed" : "Open"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {a.submitted} / {a.enrolledStudents}
                    </td>
                    <td className={`py-3 pr-4 ${a.toGrade > 0 ? "font-medium text-clay" : ""}`}>{a.toGrade}</td>
                    <td className="py-3 pr-4">{a.late}</td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/instructor/assignments/${a._id}/submissions`}
                        className="text-mustard-dark hover:underline dark:text-mustard"
                      >
                        {a.toGrade > 0 ? "Grade" : "View"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
