"use client";

import Link from "next/link";
import { useState } from "react";
import {
  useCreateDiscussionMutation,
  useGetCourseDiscussionsQuery,
} from "@/redux/features/discussions/discussionsApi";
import { timeAgo } from "@/utils/timeAgo";
import { useCan } from "@/hooks/useCan";

// Under a lesson: the course discussions about that lesson, and a quick way to
// start one. (This replaced the old per-lesson "Ask a question".)
export default function LessonDiscussions({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { data, isLoading } = useGetCourseDiscussionsQuery({ courseId, lessonId });
  const [createDiscussion, { isLoading: isPosting }] = useCreateDiscussionMutation();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [posted, setPosted] = useState(false);

  const threads: any[] = data?.discussions || [];
  const can = useCan();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPosted(false);
    if (!title.trim() || !body.trim()) return;
    try {
      await createDiscussion({ courseId, lessonId, title: title.trim(), body: body.trim() }).unwrap();
      setTitle("");
      setBody("");
      setPosted(true);
    } catch (err: any) {
      setError(err?.data?.message || "Could not post your question");
    }
  };

  return (
    <section className="mt-10 border-t border-parchment-dark pt-6 dark:border-ink-light" aria-label="Questions about this lesson">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl text-ink dark:text-parchment">Questions about this lesson</h2>
        <Link
          href={`/course-access/${courseId}/discussions`}
          className="text-sm text-mustard-dark hover:underline dark:text-mustard"
        >
          All course discussions →
        </Link>
      </div>

      {!isLoading && threads.length > 0 && (
        <ul className="mt-4 divide-y divide-parchment-dark dark:divide-ink-light">
          {threads.map((t) => (
            <li key={t._id} className="py-3">
              <Link
                href={`/course-access/${courseId}/discussions/${t._id}`}
                className="font-medium text-ink hover:underline dark:text-parchment"
              >
                {t.title}
              </Link>
              <p className="text-xs text-ink/60 dark:text-parchment/60">
                {t.authorName} · {t.replyCount} {t.replyCount === 1 ? "reply" : "replies"}
                {t.answered ? " · answered by staff" : ""} · {timeAgo(t.lastActivityAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {!isLoading && threads.length === 0 && (
        <p className="mt-3 text-sm text-ink/60 dark:text-parchment/60">No questions about this lesson yet.</p>
      )}

      {can("discussion.post") && (
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={150}
          placeholder="Your question in a few words"
          aria-label="Question title"
          className="w-full border border-parchment-dark bg-transparent px-3 py-2 outline-none focus:border-mustard dark:border-ink-light"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={5000}
          placeholder="What's unclear about this lesson?"
          aria-label="Question details"
          className="w-full border border-parchment-dark bg-transparent p-3 outline-none focus:border-mustard dark:border-ink-light"
        />
        {error && <p role="alert" className="text-sm text-clay">{error}</p>}
        {posted && (
          <p role="status" className="text-sm text-ink-light dark:text-mustard">
            Posted. Your instructor is notified, and replies show up in the discussion.
          </p>
        )}
        <button
          type="submit"
          disabled={isPosting || !title.trim() || !body.trim()}
          className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
        >
          {isPosting ? "Posting..." : "Ask about this lesson"}
        </button>
      </form>
      )}
    </section>
  );
}
