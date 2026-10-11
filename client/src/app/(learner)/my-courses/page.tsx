"use client";

import Link from "next/link";
import { useState } from "react";
import Loader from "@/components/Loader";
import RoleProtected from "@/components/RoleProtected";
import { useGetMyEnrollmentsQuery } from "@/redux/features/enrollment/enrollmentApi";

type Filter = "all" | "progress" | "completed";

function MyCoursesContent() {
  const { data, isLoading, isError } = useGetMyEnrollmentsQuery(undefined);
  const [filter, setFilter] = useState<Filter>("all");

  const enrollments: any[] = data?.enrollments || [];
  const isDone = (e: any) => e.status === "completed" || (e.completionPercentage || 0) >= 100;
  const shown = enrollments.filter((e) =>
    filter === "all" ? true : filter === "completed" ? isDone(e) : !isDone(e)
  );

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: `All (${enrollments.length})` },
    { id: "progress", label: `In progress (${enrollments.filter((e) => !isDone(e)).length})` },
    { id: "completed", label: `Completed (${enrollments.filter(isDone).length})` },
  ];

  return (
    <main className="px-2 py-10 md:px-6">
      <h1 className="font-display text-4xl text-ink dark:text-parchment">My courses</h1>
      <p className="mt-2 text-ink/60 dark:text-parchment/60">Everything you&apos;re enrolled in.</p>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter my courses">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={filter === t.id}
            onClick={() => setFilter(t.id)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              filter === t.id
                ? "border-mustard bg-mustard text-ink"
                : "border-parchment-dark text-ink/70 hover:border-mustard dark:border-ink-light dark:text-parchment/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load your courses.</p>}
      {!isLoading && !isError && enrollments.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          You&apos;re not enrolled in anything yet.{" "}
          <Link href="/courses" className="text-mustard-dark underline dark:text-mustard">
            Find a course
          </Link>
          .
        </p>
      )}
      {!isLoading && !isError && enrollments.length > 0 && shown.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">Nothing here yet.</p>
      )}

      <div className="mt-6 divide-y divide-parchment-dark dark:divide-ink-light">
        {shown.map((e) => {
          const percent = Math.min(100, Math.max(0, Math.round(e.completionPercentage || 0)));
          return (
            <Link key={e._id} href={`/course-access/${e.course._id}`} className="block py-5 hover:opacity-90">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium text-ink dark:text-parchment">{e.course.name}</p>
                <span className="shrink-0 text-sm text-ink/50 dark:text-parchment/50">
                  {isDone(e) ? "Completed" : `${percent}%`}
                </span>
              </div>
              <p className="text-sm text-ink/60 dark:text-parchment/60">
                {e.course.category?.name} · {e.instructor?.name || "No instructor"}
              </p>
              <div
                className="mt-2 h-1.5 w-full rounded-full bg-parchment-dark dark:bg-ink"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${e.course.name} progress`}
              >
                <div className="h-1.5 rounded-full bg-mustard" style={{ width: `${percent}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

export default function MyCoursesPage() {
  return (
    <RoleProtected allowedRoles={["student"]}>
      <MyCoursesContent />
    </RoleProtected>
  );
}
