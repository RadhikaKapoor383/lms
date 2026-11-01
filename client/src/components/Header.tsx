"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
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
  const pathname = usePathname();

  // Close the phone menu whenever the page changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While the phone menu is open: Escape closes it, the page behind can't scroll,
  // and growing the window to desktop width closes it too.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);
  // staggered entrance for the items inside the phone menu
  const stagger = (i: number) => ({ transitionDelay: open ? `${200 + i * 80}ms` : "0ms" });
  const itemMotion = open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0";

  // Each role gets its own entry point: admin, instructor area, or student dashboard
  const roleLink = !hide.includes("role") && user?.role && roleHome[user.role as Role]
    ? { href: roleHome[user.role as Role], label: roleLabel[user.role as Role] }
    : null;

  const visibleNavLinks = hide.includes("courses")
    ? navLinks.filter((link) => link.href !== "/courses")
    : navLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-light bg-ink text-parchment">
      <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Ledger<span className="text-mustard">.</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {visibleNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`relative text-sm transition after:absolute after:-bottom-1 after:left-0 after:h-px after:bg-mustard after:transition-all after:duration-300 hover:text-mustard hover:after:w-full ${
                isActive(link.href)
                  ? "text-mustard after:w-full"
                  : "text-parchment/80 after:w-0"
              }`}
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
            type="button"
            className="relative -mr-2 h-11 w-11 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(!open)}
          >
            {/* three lines that morph into a cross */}
            <span
              className={`absolute left-3 h-0.5 w-5 bg-parchment transition-all duration-300 ${
                open ? "top-[21px] rotate-45" : "top-[14px]"
              }`}
            />
            <span
              className={`absolute right-3 top-[21px] h-0.5 bg-parchment transition-all duration-300 ${
                open ? "w-0 opacity-0" : "w-3"
              }`}
            />
            <span
              className={`absolute left-3 h-0.5 w-5 bg-parchment transition-all duration-300 ${
                open ? "top-[21px] -rotate-45" : "top-[28px]"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Phone menu: opens as a circle growing out of the button */}
      <div
        id="mobile-menu"
        aria-hidden={!open}
        className={`fixed inset-0 z-0 overflow-y-auto bg-ink pt-24 transition-[clip-path,visibility] duration-500 ease-[cubic-bezier(0.77,0,0.18,1)] md:hidden ${
          open
            ? "visible [clip-path:circle(150%_at_calc(100%_-_2.5rem)_2.25rem)]"
            : "invisible [clip-path:circle(0%_at_calc(100%_-_2.5rem)_2.25rem)]"
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-40 h-64 w-64 animate-float rounded-full bg-mustard/10 blur-3xl"
        />
        <nav aria-label="Mobile" className="relative mx-auto flex max-w-6xl flex-col px-6 pb-12">
          <p
            className={`text-xs uppercase tracking-[0.25em] text-parchment/40 transition duration-500 ${itemMotion}`}
            style={stagger(0)}
          >
            Navigate
          </p>
          {visibleNavLinks.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`group flex items-baseline gap-4 border-b border-parchment/10 py-4 font-display text-4xl transition duration-500 ${itemMotion} ${
                isActive(link.href) ? "text-mustard" : "text-parchment"
              }`}
              style={stagger(i + 1)}
            >
              <span className="font-body text-sm tabular-nums text-parchment/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              {link.label}
              <span className="ml-auto -translate-x-2 text-2xl text-mustard opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                &rarr;
              </span>
            </Link>
          ))}

          <div
            className={`mt-10 space-y-3 transition duration-500 ${itemMotion}`}
            style={stagger(visibleNavLinks.length + 1)}
          >
            {user ? (
              <>
                <p className="text-sm text-parchment/60">
                  Signed in as <span className="text-parchment">{user.name}</span>
                </p>
                {roleLink && (
                  <Link
                    href={roleLink.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-full border border-mustard px-6 py-3 text-center font-medium text-mustard transition hover:bg-mustard hover:text-ink"
                  >
                    {roleLink.label}
                  </Link>
                )}
                {!hide.includes("profile") && (
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="block rounded-full border border-parchment/30 px-6 py-3 text-center font-medium text-parchment transition hover:border-mustard hover:text-mustard"
                  >
                    Your profile
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    logout(undefined);
                  }}
                  className="w-full rounded-full bg-mustard px-6 py-3 font-medium text-ink transition hover:bg-mustard-dark"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-full bg-mustard px-6 py-3 text-center font-medium text-ink transition hover:bg-mustard-dark"
                >
                  Log in
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setOpen(false)}
                  className="block rounded-full border border-parchment/30 px-6 py-3 text-center font-medium text-parchment transition hover:border-mustard hover:text-mustard"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}