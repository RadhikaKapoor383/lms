"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useAppSelector } from "@/hooks/redux";
import { useLazyLogOutQuery } from "@/redux/features/auth/authApi";

const navLinks = [
  { label: "Courses", href: "/courses" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
];

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const [logout] = useLazyLogOutQuery();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-light bg-ink text-parchment">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Ledger<span className="text-mustard">.</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
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
          <button
            aria-label="Toggle color theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full border border-parchment/30 px-3 py-1 text-xs text-parchment/80 hover:border-mustard hover:text-mustard"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>

          {user ? (
            <div className="hidden items-center gap-3 md:flex">
              {user.role === "admin" && (
                <Link href="/admin" className="text-sm text-mustard hover:underline">
                  Admin
                </Link>
              )}
              <Link href="/profile" className="text-sm text-parchment/80 hover:text-mustard">
                {user.name}
              </Link>
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
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-parchment/80">
                {link.label}
              </Link>
            ))}
            {user ? (
              <button onClick={() => logout(undefined)} className="text-left text-mustard">
                Log out
              </button>
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