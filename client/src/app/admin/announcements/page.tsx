"use client";

import { useState } from "react";
import Loader from "@/components/Loader";
import {
  useCreateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useGetAnnouncementsQuery,
} from "@/redux/features/announcements/announcementsApi";

export default function AdminAnnouncementsPage() {
  const { data, isLoading } = useGetAnnouncementsQuery(undefined);
  const [createAnnouncement, { isLoading: isCreating }] =
    useCreateAnnouncementMutation();
  const [deleteAnnouncement] = useDeleteAnnouncementMutation();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const announcements = data?.announcements || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !message.trim()) return;

    try {
      await createAnnouncement({ title, message }).unwrap();
      setTitle("");
      setMessage("");
    } catch (err: any) {
      setError(err?.data?.message || "Could not post announcement");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">
        Announcements
      </h1>
      <p className="mt-1 text-ink/70 dark:text-parchment/70">
        Platform-wide — every visitor sees the latest one on the homepage.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 max-w-lg space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          rows={3}
          className="w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
        />
        {error && <p className="text-sm text-clay">{error}</p>}
        <button
          type="submit"
          disabled={isCreating}
          className="rounded-full bg-mustard px-6 py-2.5 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
        >
          {isCreating ? "Posting..." : "Post announcement"}
        </button>
      </form>

      {isLoading && <Loader />}

      <div className="mt-10 divide-y divide-parchment-dark dark:divide-ink-light">
        {announcements.map((a: any) => (
          <div key={a._id} className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-ink dark:text-parchment">{a.title}</p>
              <p className="text-sm text-ink/70 dark:text-parchment/70">{a.message}</p>
              <p className="mt-1 text-xs text-ink/40 dark:text-parchment/40">
                {new Date(a.createdAt).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => deleteAnnouncement(a._id)}
              className="text-sm text-clay hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}