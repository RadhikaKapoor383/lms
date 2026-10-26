"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import Loader from "@/components/Loader";
import {
  useDeleteMaterialMutation,
  useGetCourseMaterialsQuery,
  useSetMaterialLessonMutation,
  useUploadMaterialMutation,
} from "@/redux/features/materials/materialsApi";
import { useGetCourseForEditQuery } from "@/redux/features/courses/coursesApi";
import { downloadMaterial, formatFileSize } from "@/utils/downloadMaterial";
import { groupMaterialsByLesson } from "@/utils/materialGroups";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx";

export default function CourseMaterialsPage() {
  const params = useParams();
  const courseId = params?.id as string;

  // the edit view has the lessons with their ids (admins can open this page too)
  const { data: courseData } = useGetCourseForEditQuery(courseId);
  const course = courseData?.course;
  const lessons: { _id: string; title: string }[] = course?.courseData || [];

  const { data, isLoading, isError } = useGetCourseMaterialsQuery(courseId);
  const [uploadMaterial, { isLoading: isUploading }] = useUploadMaterialMutation();
  const [deleteMaterial] = useDeleteMaterialMutation();
  const [setMaterialLesson] = useSetMaterialLessonMutation();

  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const materials = data?.materials || [];
  const groups = groupMaterialsByLesson(materials, lessons);

  const lessonOptions = (
    <>
      <option value="">Whole course</option>
      {lessons.map((l, i) => (
        <option key={l._id} value={l._id}>
          Lesson {i + 1}: {l.title}
        </option>
      ))}
    </>
  );

  const handleMove = async (m: any, target: string) => {
    setError("");
    try {
      await setMaterialLesson({ courseId, materialId: m._id, lessonId: target }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not move the file");
    }
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] || null;
    setError("");
    if (picked && picked.size > MAX_BYTES) {
      setError("That file is larger than 10 MB.");
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(picked);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError("");
    const formData = new FormData();
    if (title.trim()) formData.append("title", title.trim());
    if (lessonId) formData.append("lessonId", lessonId);
    formData.append("file", file);
    try {
      await uploadMaterial({ courseId, formData }).unwrap();
      setTitle("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (err: any) {
      setError(err?.data?.message || "Could not upload the file");
    }
  };

  const handleDelete = async (m: any) => {
    if (!window.confirm(`Delete "${m.title}"? Students will no longer be able to download it.`)) return;
    setError("");
    try {
      await deleteMaterial({ courseId, materialId: m._id }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not delete the file");
    }
  };

  const handleDownload = async (m: any) => {
    setError("");
    try {
      await downloadMaterial(courseId, m);
    } catch (err: any) {
      setError(err?.message || "Could not download the file");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">
        Materials{course ? ` — ${course.name}` : ""}
      </h1>
      <p className="mt-2 text-sm text-ink/60 dark:text-parchment/60">
        PDF, Word, PowerPoint or Excel files up to 10 MB. Only people enrolled in this course can download them.
      </p>

      <form onSubmit={handleUpload} className="mt-6 max-w-lg space-y-4 border border-parchment-dark p-5 dark:border-ink-light">
        <div>
          <label htmlFor="material-file" className="block text-sm font-medium text-ink dark:text-parchment">
            File
          </label>
          <input
            id="material-file"
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            required
            onChange={handlePick}
            className="mt-1 block w-full text-sm text-ink dark:text-parchment"
          />
        </div>
        <div>
          <label htmlFor="material-title" className="block text-sm font-medium text-ink dark:text-parchment">
            Title (optional)
          </label>
          <input
            id="material-title"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Defaults to the file name"
            className="mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
          />
        </div>
        <div>
          <label htmlFor="material-lesson" className="block text-sm font-medium text-ink dark:text-parchment">
            Attach to
          </label>
          <select
            id="material-lesson"
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
            className="mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 text-ink outline-none focus:border-mustard dark:border-ink-light dark:text-parchment"
          >
            {lessonOptions}
          </select>
          <p className="mt-1 text-xs text-ink/60 dark:text-parchment/60">
            A lesson&apos;s files also show under that lesson for students.
          </p>
        </div>
        <button
          type="submit"
          disabled={isUploading || !file}
          className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-clay">{error}</p>}

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load materials.</p>}
      {!isLoading && !isError && materials.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No materials yet.</p>
      )}

      {groups.map((group) => (
        <section key={group.lessonId || "course"} className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink/50 dark:text-parchment/50">
            {group.title}
          </h2>
          <div className="mt-2 divide-y divide-parchment-dark dark:divide-ink-light">
            {group.materials.map((m: any) => (
              <div key={m._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-ink dark:text-parchment">{m.title}</p>
                  <p className="text-sm text-ink/60 dark:text-parchment/60">
                    {m.ext.toUpperCase()} · {formatFileSize(m.size)} · {new Date(m.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <select
                    aria-label={`Attach ${m.title} to`}
                    value={m.lesson && lessons.some((l) => l._id === String(m.lesson)) ? String(m.lesson) : ""}
                    onChange={(e) => handleMove(m, e.target.value)}
                    className="max-w-[14rem] border border-parchment-dark bg-transparent px-2 py-1 text-sm text-ink dark:border-ink-light dark:text-parchment"
                  >
                    {lessonOptions}
                  </select>
                  <button
                    onClick={() => handleDownload(m)}
                    className="text-sm text-mustard-dark hover:underline dark:text-mustard"
                  >
                    Download
                  </button>
                  <button onClick={() => handleDelete(m)} className="text-sm text-clay hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
