"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import {
  useCreateDiscussionMutation,
  useGetCourseDiscussionsQuery,
} from "@/redux/features/discussions/discussionsApi";
import { timeAgo } from "@/utils/notifications";

export default function CourseDiscussionsPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const { data, isLoading, isError } = useGetCourseDiscussionsQuery(courseId);
  const [createDiscussion, { isLoading: isPosting }] = useCreateDiscussionMutation();
  const discussions: any[] = data?.discussions || [];

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !body.trim()) {
      setError("Add a title and a message");
      return;
    }
    try {
      await createDiscussion({ courseId, title, body }).unwrap();
      setTitle("");
      setBody("");
    } catch (err: any) {
      setError(err?.data?.message || "Could not start the discussion");
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ink dark:text-parchment">Discussions</h1>
          <Link
            href={`/course-access/${courseId}`}
            className="text-sm text-mustard-dark hover:underline dark:text-mustard"
          >
            Back to lessons
          </Link>
        </div>
        <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
          Ask a question or start a conversation. Your instructor and classmates can reply.
        </p>

        <form onSubmit={handleCreate} className="mt-6 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
            placeholder="Title"
            className="w-full border border-parchment-dark bg-transparent px-3 py-2 outline-none focus:border-mustard dark:border-ink-light"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="What's on your mind?"
            className="w-full border border-parchment-dark bg-transparent p-3 outline-none focus:border-mustard dark:border-ink-light"
          />
          {error && <p className="text-sm text-clay">{error}</p>}
          <button
            type="submit"
            disabled={isPosting}
            className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
          >
            {isPosting ? "Posting…" : "Start discussion"}
          </button>
        </form>

        {isLoading && <Loader />}
        {isError && (
          <p className="mt-8 text-ink/60 dark:text-parchment/60">Couldn&apos;t load discussions.</p>
        )}
        {!isLoading && !isError && discussions.length === 0 && (
          <p className="mt-8 text-ink/60 dark:text-parchment/60">
            No discussions yet. Be the first to start one.
          </p>
        )}

        <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
          {discussions.map((d) => (
            <Link
              key={d._id}
              href={`/course-access/${courseId}/discussions/${d._id}`}
              className="block py-4 hover:opacity-90"
            >
              <div className="flex flex-wrap items-center gap-2">
                {d.pinned && (
                  <span className="rounded-full bg-mustard px-2.5 py-0.5 text-xs font-medium text-ink">
                    Pinned
                  </span>
                )}
                <p className="font-medium text-ink dark:text-parchment">{d.title}</p>
                {d.answered && (
                  <span className="rounded-full bg-ink-light px-2.5 py-0.5 text-xs text-parchment">
                    Answered
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink/70 dark:text-parchment/70">{d.preview}</p>
              <p className="mt-2 text-xs text-ink/50 dark:text-parchment/50">
                {d.authorName}
                {d.authorRole !== "student" ? ` (${d.authorRole})` : ""} · {d.replyCount}{" "}
                {d.replyCount === 1 ? "reply" : "replies"} · active {timeAgo(d.lastActivityAt)}
              </p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
