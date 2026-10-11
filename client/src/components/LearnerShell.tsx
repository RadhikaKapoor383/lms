"use client";

import Header from "./Header";
import Footer from "./Footer";
import StudentSidebar from "./StudentSidebar";
import { useAppSelector } from "@/hooks/redux";

// The frame around the learner pages (dashboard, courses, lessons, profile...).
//   student            -> navbar + the student sidebar + page + footer
//   anyone else/visitor -> navbar + page + footer, exactly as before
// (admins and instructors also open some of these pages, e.g. a course or their
// profile, and they keep their own sidebars in their own areas.)
export default function LearnerShell({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((state) => state.auth.user);

  if (user?.role !== "student") {
    return (
      <>
        <Header />
        {children}
        <Footer />
      </>
    );
  }

  return (
    <>
      {/* the sidebar already has Dashboard, Browse courses and Profile */}
      <Header hide={["role", "profile", "courses"]} />
      <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col px-6 md:flex-row">
        <StudentSidebar />
        <div className="min-w-0 flex-1 md:pl-4">{children}</div>
      </div>
      <Footer />
    </>
  );
}
