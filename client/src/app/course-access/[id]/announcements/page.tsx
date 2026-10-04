"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import { useGetCourseAnnouncementsQuery } from "@/redux/features/announcements/announcementsApi";

export default function CourseAnnouncementsStudentPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const { data, isLoading, isError } = useGetCourseAnnouncementsQuery(courseId);
  const announcements = data?.announcements || [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ink dark:text-parchment">Announcements</h1>
          <Link
            href={`/course-access/${courseId}`}
            className="text-sm text-mustard-dark hover:underline dark:text-mustard"
          >
            Back to lessons
          </Link>
        </div>

        {isLoading && <Loader />}
        {isError && (
          <p className="mt-6 text-ink/60 dark:text-parchment/60">
            Couldn&apos;t load announcements.
          </p>
        )}
        {!isLoading && !isError && announcements.length === 0 && (
          <p className="mt-6 text-ink/60 dark:text-parchment/60">
            No announcements for this course yet.
          </p>
        )}

        <div className="mt-8 space-y-4">
          {announcements.map((a: any) => (
            <article key={a._id} className="border border-parchment-dark p-5 dark:border-ink-light">
              <h2 className="font-medium text-ink dark:text-parchment">{a.title}</h2>
              <p className="mt-2 whitespace-pre-line text-ink/80 dark:text-parchment/80">
                {a.message}
              </p>
              <p className="mt-3 text-xs text-ink/50 dark:text-parchment/50">
                {a.authorName ? `${a.authorName} · ` : ""}
                {new Date(a.createdAt).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
