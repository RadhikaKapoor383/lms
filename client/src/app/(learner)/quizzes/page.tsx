"use client";

import Link from "next/link";
import Loader from "@/components/Loader";
import RoleProtected from "@/components/RoleProtected";
import { useGetMyQuizzesQuery } from "@/redux/features/quizzes/quizzesApi";

const STATUS: Record<string, { label: string; className: string }> = {
  passed: { label: "Passed", className: "bg-mustard/20 text-mustard-dark dark:text-mustard" },
  in_progress: { label: "In progress", className: "bg-parchment-dark/60 text-ink dark:bg-ink-light dark:text-parchment" },
  not_started: { label: "Not started", className: "bg-parchment-dark/60 text-ink dark:bg-ink-light dark:text-parchment" },
  no_attempts_left: { label: "No attempts left", className: "bg-clay/20 text-clay" },
};

function QuizzesContent() {
  const { data, isLoading, isError } = useGetMyQuizzesQuery(undefined, { refetchOnMountOrArgChange: true });
  const quizzes: any[] = data?.quizzes || [];

  return (
    <main className="px-2 py-10 md:px-6">
      <h1 className="font-display text-4xl text-ink dark:text-parchment">Quizzes</h1>
      <p className="mt-2 text-ink/60 dark:text-parchment/60">Every quiz in your courses.</p>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load your quizzes.</p>}
      {!isLoading && !isError && quizzes.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No quizzes in your courses yet.</p>
      )}

      <div className="mt-6 divide-y divide-parchment-dark dark:divide-ink-light">
        {quizzes.map((q) => {
          const st = STATUS[q.status] || STATUS.not_started;
          return (
            <Link
              key={q._id}
              href={`/course-access/${q.course?._id}/quizzes/${q._id}`}
              className="flex items-center justify-between gap-4 py-4 hover:opacity-90"
            >
              <div>
                <p className="font-medium text-ink dark:text-parchment">{q.title}</p>
                <p className="text-sm text-ink/60 dark:text-parchment/60">
                  {q.course?.name} · {q.questionCount} question{q.questionCount === 1 ? "" : "s"}
                  {q.timeLimitMinutes ? ` · ${q.timeLimitMinutes} min` : ""} · pass at {q.passingScore}%
                </p>
                <p className="text-sm text-ink/50 dark:text-parchment/50">
                  {q.bestPercentage === null ? "Not attempted yet" : `Best score ${Math.round(q.bestPercentage)}%`} ·{" "}
                  {q.attemptsRemaining} of {q.maxAttempts} attempt{q.maxAttempts === 1 ? "" : "s"} left
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${st.className}`}>{st.label}</span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

export default function QuizzesPage() {
  return (
    <RoleProtected allowedRoles={["student"]}>
      <QuizzesContent />
    </RoleProtected>
  );
}
