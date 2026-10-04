"use client";

import { useState } from "react";
import Loader from "@/components/Loader";
import StarRating from "@/components/StarRating";
import {
  useDeleteReviewMutation,
  useGetAdminReviewsQuery,
} from "@/redux/features/reviews/reviewsApi";
import { timeAgo } from "@/utils/notifications";

export default function AdminReviewsPage() {
  const { data, isLoading, isError } = useGetAdminReviewsQuery(undefined);
  const reviews: any[] = data?.reviews || [];
  const [deleteReview] = useDeleteReviewMutation();
  const [error, setError] = useState("");

  const handleDelete = async (review: any) => {
    if (!window.confirm("Remove this review? The student will be notified.")) return;
    setError("");
    try {
      await deleteReview({ courseId: review.courseId, reviewId: review._id }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not remove the review");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Reviews</h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        Newest first. Remove reviews that break the rules; the average rating updates automatically.
      </p>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load reviews.</p>}
      {!isLoading && !isError && reviews.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No reviews yet.</p>
      )}
      {error && <p className="mt-4 text-sm text-clay">{error}</p>}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {reviews.map((r) => (
          <div key={r._id} className="flex items-start justify-between gap-4 py-4">
            <div>
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
              {r.commentReplies.length > 0 && (
                <p className="mt-2 text-xs text-ink/50 dark:text-parchment/50">
                  {r.commentReplies.length} instructor {r.commentReplies.length === 1 ? "reply" : "replies"}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDelete(r)}
              className="shrink-0 text-sm text-clay hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
