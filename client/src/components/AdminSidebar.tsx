"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Overview", href: "/admin" },
  { label: "Create course", href: "/admin/create-course" },
  { label: "All courses", href: "/admin/all-courses" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Announcements", href: "/admin/announcements" },
  { label: "Users", href: "/admin/users" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Notifications", href: "/admin/notifications" },
  { label: "Activity log", href: "/admin/activity-log" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-parchment-dark py-8 pr-6 dark:border-ink-light">
      <p className="px-3 font-display text-lg text-ink dark:text-parchment">
        Admin
      </p>
      <nav className="mt-6 flex flex-col gap-1">
        {links.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded px-3 py-2 text-sm ${
                active
                  ? "bg-mustard text-ink font-medium"
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