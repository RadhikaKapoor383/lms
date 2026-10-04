"use client";

import { useEffect, useState } from "react";
import StarRating from "./StarRating";
import {
  useAddReviewMutation,
  useGetMyReviewQuery,
} from "@/redux/features/reviews/reviewsApi";

// Shown to an enrolled student at the bottom of the course. One review per
// student: if they already left one, the form is pre-filled and saving edits it.
export default function ReviewForm({ courseId }: { courseId: string }) {
  const { data } = useGetMyReviewQuery(courseId);
  const [addReview, { isLoading }] = useAddReviewMutation();

  const mine = data?.review;
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // fill the form once the existing review arrives
  useEffect(() => {
    if (mine) {
      setRating(mine.rating);
      setReview(mine.comment || "");
    }
  }, [mine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (rating < 1) {
      setError("Pick a star rating first");
      return;
    }
    try {
      const res = await addReview({ courseId, rating, review }).unwrap();
      setMessage(res.updated ? "Your review was updated." : "Thanks for your review!");
    } catch (err: any) {
      setError(err?.data?.message || "Could not save your review");
    }
  };

  return (
    <section className="mt-12 border-t border-parchment-dark pt-8 dark:border-ink-light">
      <h2 className="font-display text-2xl text-ink dark:text-parchment">
        {mine ? "Your review" : "Rate this course"}
      </h2>
      <form onSubmit={handleSubmit} className="mt-4 max-w-xl space-y-3">
        <StarRating value={rating} onChange={setRating} size="text-3xl" />
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="What did you think? (optional)"
          className="w-full border border-parchment-dark bg-transparent p-3 outline-none focus:border-mustard dark:border-ink-light"
        />
        {error && <p className="text-sm text-clay">{error}</p>}
        {message && <p className="text-sm text-ink/70 dark:text-parchment/70">{message}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
        >
          {isLoading ? "Saving…" : mine ? "Update review" : "Submit review"}
        </button>
      </form>
    </section>
  );
}
