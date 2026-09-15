"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAppSelector } from "@/hooks/redux";

export default function ProfilePage() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-16">
        {!user ? (
          <p className="text-ink/70 dark:text-parchment/70">
            You need to be logged in to view this page.
          </p>
        ) : (
          <>
            <h1 className="font-display text-4xl text-ink dark:text-parchment">
              {user.name}
            </h1>
            <p className="mt-2 text-ink/70 dark:text-parchment/70">{user.email}</p>

            <div className="mt-10">
              <h2 className="font-display text-2xl text-ink dark:text-parchment">
                Enrolled courses
              </h2>
              {user.courses?.length ? (
                <ul className="mt-4 space-y-2">
                  {user.courses.map((c: any, i: number) => (
                    <li key={i} className="text-ink/80 dark:text-parchment/80">
                      — Course ID: {c.courseId}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-ink/60 dark:text-parchment/60">
                  You haven&apos;t enrolled in anything yet.
                </p>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
