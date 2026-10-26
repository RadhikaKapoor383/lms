"use client";

import { useState } from "react";
import { useGetCourseMaterialsQuery } from "@/redux/features/materials/materialsApi";
import { downloadMaterial, formatFileSize } from "@/utils/downloadMaterial";
import { materialsForLesson } from "@/utils/materialGroups";

// The files an instructor attached to one lesson, shown under that lesson.
// Nothing is shown when the lesson has none.
export default function LessonFiles({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { data } = useGetCourseMaterialsQuery(courseId);
  const files = materialsForLesson(data?.materials || [], lessonId);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  if (files.length === 0) return null;

  const handleDownload = async (m: any) => {
    setError("");
    setBusyId(m._id);
    try {
      await downloadMaterial(courseId, m);
    } catch (err: any) {
      setError(err?.message || "Could not download the file");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="mt-6" aria-label="Files for this lesson">
      <h2 className="text-xs font-medium uppercase tracking-wide text-ink/50 dark:text-parchment/50">
        Files for this lesson
      </h2>
      <ul className="mt-2 space-y-2">
        {files.map((m: any) => (
          <li key={m._id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink dark:text-parchment">
              {m.title}{" "}
              <span className="text-ink/50 dark:text-parchment/50">
                · {m.ext.toUpperCase()} · {formatFileSize(m.size)}
              </span>
            </span>
            <button
              onClick={() => handleDownload(m)}
              disabled={busyId === m._id}
              className="shrink-0 text-mustard-dark hover:underline disabled:opacity-60 dark:text-mustard"
            >
              {busyId === m._id ? "Preparing..." : "Download"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm text-clay">{error}</p>}
    </section>
  );
}
