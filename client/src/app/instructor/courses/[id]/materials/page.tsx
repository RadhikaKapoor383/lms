"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import Loader from "@/components/Loader";
import {
  useDeleteMaterialMutation,
  useGetCourseMaterialsQuery,
  useUploadMaterialMutation,
} from "@/redux/features/materials/materialsApi";
import { useGetInstructorCoursesQuery } from "@/redux/features/courses/coursesApi";
import { downloadMaterial, formatFileSize } from "@/utils/downloadMaterial";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx";

export default function CourseMaterialsPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const { data: coursesData } = useGetInstructorCoursesQuery(undefined);
  const course = coursesData?.courses?.find((c: any) => c._id === courseId);

  const { data, isLoading, isError } = useGetCourseMaterialsQuery(courseId);
  const [uploadMaterial, { isLoading: isUploading }] = useUploadMaterialMutation();
  const [deleteMaterial] = useDeleteMaterialMutation();

  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const materials = data?.materials || [];

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

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {materials.map((m: any) => (
          <div key={m._id} className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-ink dark:text-parchment">{m.title}</p>
              <p className="text-sm text-ink/60 dark:text-parchment/60">
                {m.ext.toUpperCase()} · {formatFileSize(m.size)} · {new Date(m.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
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
    </div>
  );
}
