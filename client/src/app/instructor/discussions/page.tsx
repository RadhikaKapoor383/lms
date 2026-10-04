"use client";

import Link from "next/link";
import Loader from "@/components/Loader";
import { useGetInstructorDiscussionsQuery } from "@/redux/features/discussions/discussionsApi";
import { timeAgo } from "@/utils/notifications";

export default function InstructorDiscussionsPage() {
  const { data, isLoading, isError } = useGetInstructorDiscussionsQuery(undefined);
  const discussions: any[] = data?.discussions || [];
  const unanswered = discussions.filter((d) => !d.answered).length;

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Discussions</h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        Threads from all your courses. Ones nobody on staff has answered come first
        {discussions.length > 0 ? ` (${unanswered} waiting)` : ""}.
      </p>

      {isLoading && <Loader />}
      {isError && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load discussions.</p>
      )}
      {!isLoading && !isError && discussions.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No discussions in your courses yet.</p>
      )}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {discussions.map((d) => (
          <Link
            key={d._id}
            href={`/course-access/${d.course}/discussions/${d._id}`}
            className="block py-4 hover:opacity-90"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-ink dark:text-parchment">{d.title}</p>
              {d.answered ? (
                <span className="rounded-full bg-ink-light px-2.5 py-0.5 text-xs text-parchment">
                  Answered
                </span>
              ) : (
                <span className="rounded-full bg-clay/20 px-2.5 py-0.5 text-xs text-clay">
                  Needs a reply
                </span>
              )}
              {d.pinned && (
                <span className="rounded-full bg-mustard px-2.5 py-0.5 text-xs font-medium text-ink">
                  Pinned
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink/70 dark:text-parchment/70">{d.preview}</p>
            <p className="mt-2 text-xs text-ink/50 dark:text-parchment/50">
              {d.courseName} · {d.authorName} · {d.replyCount}{" "}
              {d.replyCount === 1 ? "reply" : "replies"} · active {timeAgo(d.lastActivityAt)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
