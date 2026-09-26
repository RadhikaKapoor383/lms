"use client";

import Loader from "@/components/Loader";
import { useGetAllEnrollmentsAdminQuery } from "@/redux/features/enrollment/enrollmentApi";

const statusBadgeClass: Record<string, string> = {
  active: "bg-ink-light text-parchment",
  completed: "bg-mustard/30 text-mustard-dark",
  revoked: "bg-clay/20 text-clay",
};

export default function AdminEnrollmentsPage() {
  const { data, isLoading, isError } = useGetAllEnrollmentsAdminQuery(undefined);
  const enrollments = data?.enrollments || [];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">
        Enrollments
      </h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        Most recent 200 across the platform.
      </p>

      {isLoading && <Loader />}
      {isError && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          Couldn&apos;t load enrollments.
        </p>
      )}
      {!isLoading && !isError && enrollments.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No enrollments yet.</p>
      )}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {enrollments.map((e: any) => (
          <div key={e._id} className="flex items-center justify-between py-4">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-medium text-ink dark:text-parchment">
                  {e.student?.name || "Unknown"} → {e.course?.name || "Deleted course"}
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
                {e.student?.email} · via {e.method} · {Math.round(e.completionPercentage || 0)}% complete
                {e.instructor?.name ? ` · taught by ${e.instructor.name}` : ""}
              </p>
            </div>
            <span className="text-xs text-ink/40 dark:text-parchment/40">
              {new Date(e.createdAt).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
