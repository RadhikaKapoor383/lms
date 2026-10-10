"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import { useGetCourseMaterialsQuery } from "@/redux/features/materials/materialsApi";
import { downloadMaterial, formatFileSize } from "@/utils/downloadMaterial";

export default function CourseMaterialsStudentPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const { data, isLoading, isError } = useGetCourseMaterialsQuery(courseId);
  const materials = data?.materials || [];

  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

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
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ink dark:text-parchment">Materials</h1>
          <Link
            href={`/course-access/${courseId}`}
            className="text-sm text-mustard-dark hover:underline dark:text-mustard"
          >
            Back to lessons
          </Link>
        </div>

        {error && <p className="mt-4 text-sm text-clay">{error}</p>}

        {isLoading && <Loader />}
        {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load materials.</p>}
        {!isLoading && !isError && materials.length === 0 && (
          <p className="mt-6 text-ink/60 dark:text-parchment/60">No materials for this course yet.</p>
        )}

        <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
          {materials.map((m: any) => (
            <div key={m._id} className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-ink dark:text-parchment">{m.title}</p>
                <p className="text-sm text-ink/60 dark:text-parchment/60">
                  {m.ext.toUpperCase()} · {formatFileSize(m.size)}
                </p>
              </div>
              <button
                onClick={() => handleDownload(m)}
                disabled={busyId === m._id}
                className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
              >
                {busyId === m._id ? "Preparing..." : "Download"}
              </button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
