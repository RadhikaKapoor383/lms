"use client";

import { useState } from "react";
import Loader from "@/components/Loader";
import { useGetInstructorCoursesQuery } from "@/redux/features/courses/coursesApi";
import {
  useCreateCourseAnnouncementMutation,
  useDeleteCourseAnnouncementMutation,
  useGetCourseAnnouncementsQuery,
} from "@/redux/features/announcements/announcementsApi";

export default function InstructorAnnouncementsPage() {
  const { data: coursesData, isLoading: loadingCourses } = useGetInstructorCoursesQuery(undefined);
  const courses = coursesData?.courses || [];

  // until the instructor picks one, default to their first course
  const [selectedId, setSelectedId] = useState("");
  const courseId = selectedId || courses[0]?._id || "";

  const { data, isLoading, isError } = useGetCourseAnnouncementsQuery(courseId, { skip: !courseId });
  const announcements = data?.announcements || [];

  const [createAnnouncement, { isLoading: isPosting }] = useCreateCourseAnnouncementMutation();
  const [deleteAnnouncement] = useDeleteCourseAnnouncementMutation();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !message.trim()) {
      setError("Add a title and a message");
      return;
    }
    try {
      await createAnnouncement({ courseId, title, message }).unwrap();
      setTitle("");
      setMessage("");
    } catch (err: any) {
      setError(err?.data?.message || "Could not post the announcement");
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!window.confirm("Delete this announcement?")) return;
    setError("");
    try {
      await deleteAnnouncement({ courseId, announcementId }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not delete the announcement");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Announcements</h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        Posted to one course. Its enrolled students get a notification.
      </p>

      {loadingCourses && <Loader />}
      {!loadingCourses && courses.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          Create a course first - announcements belong to a course.
        </p>
      )}

      {courses.length > 0 && (
        <>
          <select
            value={courseId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-6 border border-parchment-dark bg-transparent px-3 py-2 text-sm dark:border-ink-light"
          >
            {courses.map((c: any) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <form onSubmit={handlePost} className="mt-6 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              placeholder="Title"
              className="w-full border border-parchment-dark bg-transparent px-3 py-2 outline-none focus:border-mustard dark:border-ink-light"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={5000}
              rows={4}
              placeholder="What do your students need to know?"
              className="w-full border border-parchment-dark bg-transparent p-3 outline-none focus:border-mustard dark:border-ink-light"
            />
            {error && <p className="text-sm text-clay">{error}</p>}
            <button
              type="submit"
              disabled={isPosting}
              className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
            >
              {isPosting ? "Posting…" : "Post announcement"}
            </button>
          </form>

          {isLoading && <Loader />}
          {isError && (
            <p className="mt-6 text-ink/60 dark:text-parchment/60">
              Couldn&apos;t load announcements.
            </p>
          )}
          {!isLoading && !isError && announcements.length === 0 && (
            <p className="mt-8 text-ink/60 dark:text-parchment/60">
              Nothing posted for this course yet.
            </p>
          )}

          <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
            {announcements.map((a: any) => (
              <div key={a._id} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="font-medium text-ink dark:text-parchment">{a.title}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink/70 dark:text-parchment/70">
                    {a.message}
                  </p>
                  <p className="mt-2 text-xs text-ink/40 dark:text-parchment/40">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(a._id)}
                  className="shrink-0 text-sm text-clay hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
