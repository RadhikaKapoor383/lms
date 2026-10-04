"use client";

import { useState } from "react";
import Loader from "@/components/Loader";
import StarRating from "@/components/StarRating";
import {
  useGetInstructorReviewsQuery,
  useReplyToReviewMutation,
} from "@/redux/features/reviews/reviewsApi";
import { timeAgo } from "@/utils/notifications";

export default function InstructorReviewsPage() {
  const { data, isLoading, isError } = useGetInstructorReviewsQuery(undefined);
  const reviews: any[] = data?.reviews || [];
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [reply, { isLoading: isReplying }] = useReplyToReviewMutation();

  const average = reviews.length
    ? Math.round((reviews.reduce((t, r) => t + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const handleReply = async (review: any) => {
    setError("");
    if (!text.trim()) return;
    try {
      await reply({ courseId: review.courseId, reviewId: review._id, comment: text }).unwrap();
      setReplyTo(null);
      setText("");
    } catch (err: any) {
      setError(err?.data?.message || "Could not post your reply");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Reviews</h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        What students say about your courses.
        {reviews.length > 0 && ` ${reviews.length} review${reviews.length === 1 ? "" : "s"}, average ${average}/5.`}
      </p>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load reviews.</p>}
      {!isLoading && !isError && reviews.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No reviews on your courses yet.</p>
      )}
      {error && <p className="mt-4 text-sm text-clay">{error}</p>}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {reviews.map((r) => (
          <div key={r._id} className="py-5">
            <div className="flex flex-wrap items-center gap-3">
              <StarRating value={r.rating} />
              <p className="font-medium text-ink dark:text-parchment">{r.user?.name || "Student"}</p>
              <p className="text-sm text-ink/50 dark:text-parchment/50">
                {r.courseName}
                {r.createdAt ? ` · ${timeAgo(r.createdAt)}` : ""}
              </p>
            </div>
            {r.comment && (
              <p className="mt-2 whitespace-pre-line text-ink/80 dark:text-parchment/80">{r.comment}</p>
            )}

            {r.commentReplies.map((c: any, i: number) => (
              <p
                key={i}
                className="mt-3 border-l-2 border-mustard pl-3 text-sm text-ink/70 dark:text-parchment/70"
              >
                <span className="font-medium">{c.user?.name}:</span> {c.comment}
              </p>
            ))}

            {replyTo === r._id ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2000}
                  rows={2}
                  placeholder="Write a public reply…"
                  className="w-full border border-parchment-dark bg-transparent p-3 text-sm outline-none focus:border-mustard dark:border-ink-light"
                />
                <div className="flex gap-3 text-sm">
                  <button
                    onClick={() => handleReply(r)}
                    disabled={isReplying}
                    className="rounded-full bg-mustard px-4 py-1.5 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
                  >
                    {isReplying ? "Posting…" : "Post reply"}
                  </button>
                  <button
                    onClick={() => {
                      setReplyTo(null);
                      setText("");
                    }}
                    className="text-ink/60 hover:underline dark:text-parchment/60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setReplyTo(r._id);
                  setText("");
                }}
                className="mt-3 text-sm text-mustard-dark hover:underline dark:text-mustard"
              >
                Reply
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
