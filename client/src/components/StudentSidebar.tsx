"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// The student's navigation (the three roles each have their own sidebar).
// Order follows the platform's student menu.
const links = [
  { label: "Dashboard", href: "/dashboard", match: ["/dashboard"] },
  { label: "Browse courses", href: "/courses", match: ["/courses", "/course/"] },
  // while you are inside a course you are still "in" My courses
  { label: "My courses", href: "/my-courses", match: ["/my-courses", "/course-access"] },
  { label: "Assignments", href: "/assignments", match: ["/assignments"] },
  { label: "Quizzes", href: "/quizzes", match: ["/quizzes"] },
  { label: "Progress", href: "/progress", match: ["/progress"] },
  { label: "Certificates", href: "/my-certificates", match: ["/my-certificates"] },
  { label: "Notifications", href: "/notifications", match: ["/notifications"] },
  { label: "Profile", href: "/profile", match: ["/profile"] },
];

export default function StudentSidebar() {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);

  // on a phone the menu folds away after you pick something
  useEffect(() => setOpen(false), [pathname]);

  return (
    <aside className="shrink-0 border-b border-parchment-dark py-4 dark:border-ink-light md:w-56 md:border-b-0 md:border-r md:py-10 md:pr-6">
      <div className="flex items-center justify-between">
        <p className="px-3 font-display text-lg text-ink dark:text-parchment">My learning</p>
        <button
          type="button"
          className="rounded border border-parchment-dark px-3 py-1 text-sm text-ink dark:border-ink-light dark:text-parchment md:hidden"
          aria-expanded={open}
          aria-controls="student-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <nav
        id="student-menu"
        aria-label="Student"
        className={`${open ? "flex" : "hidden"} mt-4 flex-col gap-1 md:mt-6 md:flex`}
      >
        {links.map((link) => {
          const active = link.match.some((m) => pathname === m || pathname.startsWith(m + "/") || pathname.startsWith(m));
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded px-3 py-2 text-sm ${
                active
                  ? "bg-mustard font-medium text-ink"
                  : "text-ink/70 hover:bg-parchment-dark/50 dark:text-parchment/70 dark:hover:bg-ink-light"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
