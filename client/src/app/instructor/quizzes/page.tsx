"use client";

import Link from "next/link";
import Loader from "@/components/Loader";
import { useGetInstructorQuizzesQuery } from "@/redux/features/instructor/instructorListsApi";

const pct = (v: number | null) => (v === null ? "-" : `${Math.round(v)}%`);

export default function InstructorQuizzesPage() {
  const { data, isLoading, isError } = useGetInstructorQuizzesQuery(undefined, { refetchOnMountOrArgChange: true });
  const quizzes: any[] = data?.quizzes || [];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Quizzes</h1>
      <p className="mt-2 text-sm text-ink/60 dark:text-parchment/60">
        Every quiz in your courses. &quot;Average&quot; uses each student&apos;s best attempt.
      </p>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-clay">Couldn&apos;t load your quizzes.</p>}
      {!isLoading && !isError && quizzes.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">You haven&apos;t created any quizzes yet.</p>
      )}

      {quizzes.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-parchment-dark text-ink/60 dark:border-ink-light dark:text-parchment/60">
              <tr>
                <th className="py-2 pr-4 font-medium">Quiz</th>
                <th className="py-2 pr-4 font-medium">Course</th>
                <th className="py-2 pr-4 font-medium">Questions</th>
                <th className="py-2 pr-4 font-medium">Students</th>
                <th className="py-2 pr-4 font-medium">Attempts</th>
                <th className="py-2 pr-4 font-medium">Average</th>
                <th className="py-2 pr-4 font-medium">Pass rate</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-parchment-dark dark:divide-ink-light">
              {quizzes.map((q) => (
                <tr key={q._id} className="text-ink dark:text-parchment">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{q.title}</p>
                    <p className="text-xs text-ink/60 dark:text-parchment/60">
                      {q.timeLimitMinutes ? `${q.timeLimitMinutes} min` : "No time limit"} · pass at {q.passingScore}% ·{" "}
                      {q.maxAttempts} attempt{q.maxAttempts === 1 ? "" : "s"}
                    </p>
                  </td>
                  <td className="py-3 pr-4">{q.course.name}</td>
                  <td className="py-3 pr-4">{q.questionCount}</td>
                  <td className="py-3 pr-4">{q.studentsAttempted}</td>
                  <td className="py-3 pr-4">
                    {q.attempts}
                    {q.timedOut > 0 && <span className="ml-1 text-xs text-clay">({q.timedOut} timed out)</span>}
                  </td>
                  <td className="py-3 pr-4">{pct(q.averageBestPercentage)}</td>
                  <td className="py-3 pr-4">{pct(q.passRate)}</td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/instructor/quizzes/${q._id}/attempts`}
                      className="text-mustard-dark hover:underline dark:text-mustard"
                    >
                      Attempts
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
