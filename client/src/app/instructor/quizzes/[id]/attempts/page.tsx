"use client";

import { useParams } from "next/navigation";
import Loader from "@/components/Loader";
import { useGetQuizAttemptsQuery } from "@/redux/features/quizzes/quizzesApi";

export default function QuizAttemptsPage() {
  const params = useParams();
  const quizId = params?.id as string;

  const { data, isLoading, isError } = useGetQuizAttemptsQuery(quizId);
  const attempts = data?.attempts || [];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Quiz results</h1>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load attempts.</p>}
      {!isLoading && !isError && attempts.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No one has attempted this quiz yet.</p>
      )}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {attempts.map((a: any) => (
          <div key={a._id} className="flex items-center justify-between py-4">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-medium text-ink dark:text-parchment">{a.student?.name}</p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    a.passed
                      ? "bg-mustard/30 text-mustard-dark"
                      : "bg-clay/20 text-clay"
                  }`}
                >
                  {a.passed ? "Passed" : "Failed"}
                </span>
              </div>
              <p className="text-sm text-ink/60 dark:text-parchment/60">
                Attempt {a.attemptNumber} · {new Date(a.submittedAt).toLocaleString()}
              </p>
            </div>
            <span className="font-display text-xl text-ink dark:text-parchment">
              {a.score}/{a.totalMarks} ({Math.round(a.percentage)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
