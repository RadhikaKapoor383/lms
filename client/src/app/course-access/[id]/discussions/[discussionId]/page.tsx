"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import { useAppSelector } from "@/hooks/redux";
import {
  useAddDiscussionReplyMutation,
  useDeleteDiscussionMutation,
  useDeleteDiscussionReplyMutation,
  useGetDiscussionQuery,
  useSetDiscussionPinnedMutation,
} from "@/redux/features/discussions/discussionsApi";
import { timeAgo } from "@/utils/notifications";

const RoleBadge = ({ role }: { role: string }) =>
  role === "student" ? null : (
    <span className="ml-2 rounded-full bg-ink-light px-2 py-0.5 text-xs capitalize text-parchment">
      {role}
    </span>
  );

export default function DiscussionThreadPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;
  const discussionId = params?.discussionId as string;

  const { user } = useAppSelector((state) => state.auth);
  const { data, isLoading, isError } = useGetDiscussionQuery(discussionId);
  const [addReply, { isLoading: isReplying }] = useAddDiscussionReplyMutation();
  const [setPinned] = useSetDiscussionPinnedMutation();
  const [deleteDiscussion] = useDeleteDiscussionMutation();
  const [deleteReply] = useDeleteDiscussionReplyMutation();

  const discussion = data?.discussion;
  const canModerate: boolean = data?.canModerate || false;
  const isThreadAuthor = discussion && String(discussion.author) === String(user?._id);

  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setError("");
    try {
      await action();
    } catch (err: any) {
      setError(err?.data?.message || fallback);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await run(async () => {
      await addReply({ discussionId, body: reply }).unwrap();
      setReply("");
    }, "Could not post your reply");
  };

  const handleDeleteThread = async () => {
    if (!window.confirm("Delete this discussion and all its replies?")) return;
    await run(async () => {
      await deleteDiscussion(discussionId).unwrap();
      router.push(`/course-access/${courseId}/discussions`);
    }, "Could not delete the discussion");
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href={`/course-access/${courseId}/discussions`}
          className="text-sm text-mustard-dark hover:underline dark:text-mustard"
        >
          ← All discussions
        </Link>

        {isLoading && <Loader />}
        {isError && (
          <p className="mt-8 text-ink/60 dark:text-parchment/60">
            Couldn&apos;t load this discussion. It may have been removed.
          </p>
        )}

        {discussion && (
          <>
            <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                {discussion.pinned && (
                  <span className="mb-2 inline-block rounded-full bg-mustard px-2.5 py-0.5 text-xs font-medium text-ink">
                    Pinned
                  </span>
                )}
                <h1 className="font-display text-3xl text-ink dark:text-parchment">
                  {discussion.title}
                </h1>
                <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
                  {discussion.authorName}
                  <RoleBadge role={discussion.authorRole} /> · {timeAgo(discussion.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {canModerate && (
                  <button
                    onClick={() =>
                      run(
                        () => setPinned({ discussionId, pinned: !discussion.pinned }).unwrap(),
                        "Could not change the pin"
                      )
                    }
                    className="text-mustard-dark hover:underline dark:text-mustard"
                  >
                    {discussion.pinned ? "Unpin" : "Pin"}
                  </button>
                )}
                {(canModerate || isThreadAuthor) && (
                  <button onClick={handleDeleteThread} className="text-clay hover:underline">
                    Delete
                  </button>
                )}
              </div>
            </div>

            <p className="mt-6 whitespace-pre-line text-ink/80 dark:text-parchment/80">
              {discussion.body}
            </p>

            {error && <p className="mt-4 text-sm text-clay">{error}</p>}

            <h2 className="mt-10 font-display text-xl text-ink dark:text-parchment">
              {discussion.replies.length} {discussion.replies.length === 1 ? "reply" : "replies"}
            </h2>

            <div className="mt-4 divide-y divide-parchment-dark dark:divide-ink-light">
              {discussion.replies.map((r: any) => (
                <div key={r._id} className="flex items-start justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-ink dark:text-parchment">
                      {r.authorName}
                      <RoleBadge role={r.authorRole} />
                      <span className="ml-2 font-normal text-ink/50 dark:text-parchment/50">
                        {timeAgo(r.createdAt)}
                      </span>
                    </p>
                    <p className="mt-1 whitespace-pre-line text-ink/80 dark:text-parchment/80">
                      {r.body}
                    </p>
                  </div>
                  {(canModerate || String(r.author) === String(user?._id)) && (
                    <button
                      onClick={() =>
                        window.confirm("Delete this reply?") &&
                        run(
                          () => deleteReply({ discussionId, replyId: r._id }).unwrap(),
                          "Could not delete the reply"
                        )
                      }
                      className="shrink-0 text-sm text-clay hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleReply} className="mt-6 space-y-3">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                maxLength={3000}
                rows={3}
                placeholder="Write a reply…"
                className="w-full border border-parchment-dark bg-transparent p-3 outline-none focus:border-mustard dark:border-ink-light"
              />
              <button
                type="submit"
                disabled={isReplying}
                className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
              >
                {isReplying ? "Posting…" : "Reply"}
              </button>
            </form>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
