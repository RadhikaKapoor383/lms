"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useAppSelector } from "@/hooks/redux";
import { useLazyLogOutQuery } from "@/redux/features/auth/authApi";
import { Role, roleHome, roleLabel } from "@/types/role";
import NotificationBell from "./NotificationBell";

const navLinks = [
  { label: "Courses", href: "/courses" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
];

// Pages with a sidebar already list some of these links, so showing them in the
// navbar too would be a duplicate. A page can hide the navbar's copy:
//   "role"    the "Admin" / "Instructor" / "My learning" link (the sidebar's
//             first item is the same dashboard)
//   "profile" your name, which links to your profile
//   "courses" the public "Courses" link (a student's sidebar has Browse Courses)
export type HeaderHidable = "role" | "profile" | "courses";

export default function Header({ hide = [] }: { hide?: HeaderHidable[] }) {
  const { theme, setTheme } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const [logout] = useLazyLogOutQuery();
  const [open, setOpen] = useState(false);

  // Each role gets its own entry point: admin, instructor area, or student dashboard
  const roleLink = !hide.includes("role") && user?.role && roleHome[user.role as Role]
    ? { href: roleHome[user.role as Role], label: roleLabel[user.role as Role] }
    : null;

  const visibleNavLinks = hide.includes("courses")
    ? navLinks.filter((link) => link.href !== "/courses")
    : navLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-light bg-ink text-parchment">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Ledger<span className="text-mustard">.</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {visibleNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-parchment/80 transition hover:text-mustard"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {user && <NotificationBell />}
          <button
            aria-label="Toggle color theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full border border-parchment/30 px-3 py-1 text-xs text-parchment/80 hover:border-mustard hover:text-mustard"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>

          {user ? (
            <div className="hidden items-center gap-3 md:flex">
              {roleLink && (
                <Link href={roleLink.href} className="text-sm text-mustard hover:underline">
                  {roleLink.label}
                </Link>
              )}
              {hide.includes("profile") ? (
                <span className="text-sm text-parchment/80">{user.name}</span>
              ) : (
                <Link href="/profile" className="text-sm text-parchment/80 hover:text-mustard">
                  {user.name}
                </Link>
              )}
              <button
                onClick={() => logout(undefined)}
                className="rounded-full bg-mustard px-4 py-1.5 text-sm font-medium text-ink hover:bg-mustard-dark"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-full bg-mustard px-4 py-1.5 text-sm font-medium text-ink hover:bg-mustard-dark md:inline-block"
            >
              Log in
            </Link>
          )}

          <button
            className="md:hidden"
            aria-label="Toggle menu"
            onClick={() => setOpen(!open)}
          >
            <span className="block h-0.5 w-6 bg-parchment" />
            <span className="mt-1.5 block h-0.5 w-6 bg-parchment" />
            <span className="mt-1.5 block h-0.5 w-6 bg-parchment" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-light px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {visibleNavLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-parchment/80">
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                {roleLink && (
                  <Link href={roleLink.href} className="text-mustard">
                    {roleLink.label}
                  </Link>
                )}
                <button onClick={() => logout(undefined)} className="text-left text-mustard">
                  Log out
                </button>
              </>
            ) : (
              <Link href="/login" className="text-mustard">
                Log in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}