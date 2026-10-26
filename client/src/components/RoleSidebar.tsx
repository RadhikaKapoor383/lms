"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type SidebarLink = { label: string; href: string };

// The admin and instructor sidebars. On a wide screen it is a column on the
// left; on a phone it folds into a "Menu" button above the page (same pattern
// as the student sidebar) and closes again after you pick a page.
export default function RoleSidebar({
  title,
  links,
  homeHref,
  menuId,
}: {
  title: string;
  links: SidebarLink[];
  homeHref: string; // matched exactly, so it isn't "active" on every page below it
  menuId: string;
}) {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <aside className="shrink-0 border-b border-parchment-dark py-4 dark:border-ink-light md:w-56 md:border-b-0 md:border-r md:py-8 md:pr-6">
      <div className="flex items-center justify-between">
        <p className="px-3 font-display text-lg text-ink dark:text-parchment">{title}</p>
        <button
          type="button"
          className="rounded border border-parchment-dark px-3 py-1 text-sm text-ink dark:border-ink-light dark:text-parchment md:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <nav
        id={menuId}
        aria-label={title}
        className={`${open ? "flex" : "hidden"} mt-4 flex-col gap-1 md:mt-6 md:flex`}
      >
        {links.map((link) => {
          const active = link.href === homeHref ? pathname === homeHref : pathname.startsWith(link.href);
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
