"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RoleProtected from "@/components/RoleProtected";
import { useAppSelector } from "@/hooks/redux";

// Student home. Placeholder for now - progress, deadlines, grades and
// certificates get added here in later phases.
export default function StudentDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const enrolled = user?.courses?.length || 0;

  return (
    <RoleProtected allowedRoles={["student"]}>
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-4xl text-ink dark:text-parchment">
          Welcome back, {user?.name}
        </h1>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="border border-parchment-dark p-5 dark:border-ink-light">
            <p className="text-sm uppercase tracking-wide text-ink/50 dark:text-parchment/50">
              Enrolled courses
            </p>
            <p className="mt-2 font-display text-3xl text-ink dark:text-parchment">
              {enrolled}
            </p>
          </div>
        </div>

        <Link
          href="/courses"
          className="mt-8 inline-block rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark"
        >
          Browse courses
        </Link>
      </main>
      <Footer />
    </RoleProtected>
  );
}
