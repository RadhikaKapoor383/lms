"use client";

import Link from "next/link";
import { useState } from "react";
import Loader from "@/components/Loader";
import { useGetReportsQuery, useResolveReportMutation } from "@/redux/features/admin/adminApi";
import { timeAgo } from "@/utils/notifications";

const TABS = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  abuse: "Abuse or harassment",
  inappropriate: "Inappropriate",
  other: "Other",
};

export default function AdminReportsPage() {
  const [tab, setTab] = useState("open");
  const { data, isLoading, isError } = useGetReportsQuery(tab);
  const [resolveReport, { isLoading: isResolving }] = useResolveReportMutation();
  const [error, setError] = useState("");
  const reports: any[] = data?.reports || [];

  const close = async (id: string, status: "resolved" | "dismissed") => {
    const note = window.prompt(
      status === "resolved" ? "Note about what you did (optional):" : "Why no action is needed (optional):"
    );
    if (note === null) return; // Cancel
    setError("");
    try {
      await resolveReport({ id, status, note }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not close the report");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Flagged content</h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        Discussion posts users have flagged. Open the thread to delete the post if it needs to go, then mark the report resolved.
      </p>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-parchment-dark pb-4 dark:border-ink-light">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === t.value
                ? "bg-ink text-parchment dark:bg-parchment dark:text-ink"
                : "text-ink/60 hover:bg-parchment-dark/50 dark:text-parchment/60 dark:hover:bg-ink-light"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load reports.</p>}
      {!isLoading && !isError && reports.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No reports here.</p>
      )}
      {error && <p className="mt-4 text-sm text-clay">{error}</p>}

      <div className="mt-4 divide-y divide-parchment-dark dark:divide-ink-light">
        {reports.map((r) => (
          <div key={r._id} className="py-5">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-clay/20 px-2.5 py-0.5 text-clay">
                {REASON_LABEL[r.reason] || r.reason}
              </span>
              <span className="text-ink/60 dark:text-parchment/60">
                {r.targetType === "reply" ? "Reply" : "Thread"} by {r.contentAuthorName} · reported by{" "}
                {r.reporterName} · {timeAgo(r.createdAt)}
              </span>
              {r.status !== "open" && (
                <span className="rounded-full bg-ink-light px-2.5 py-0.5 capitalize text-parchment">
                  {r.status}
                </span>
              )}
            </div>

            <p className="mt-3 whitespace-pre-line border-l-2 border-parchment-dark pl-3 text-ink/80 dark:border-ink-light dark:text-parchment/80">
              {r.excerpt}
            </p>
            {r.details && (
              <p className="mt-2 text-sm text-ink/60 dark:text-parchment/60">Reporter says: {r.details}</p>
            )}
            {r.resolutionNote && (
              <p className="mt-2 text-sm text-ink/60 dark:text-parchment/60">Moderator note: {r.resolutionNote}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              {r.contentStillExists ? (
                <Link
                  href={`/course-access/${r.course}/discussions/${r.discussion}`}
                  className="text-mustard-dark hover:underline dark:text-mustard"
                >
                  Open thread
                </Link>
              ) : (
                <span className="text-ink/50 dark:text-parchment/50">Post already removed</span>
              )}
              {r.status === "open" && (
                <>
                  <button
                    onClick={() => close(r._id, "resolved")}
                    disabled={isResolving}
                    className="rounded-full bg-mustard px-4 py-1 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
                  >
                    Mark resolved
                  </button>
                  <button
                    onClick={() => close(r._id, "dismissed")}
                    disabled={isResolving}
                    className="text-ink/60 hover:underline disabled:opacity-60 dark:text-parchment/60"
                  >
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
