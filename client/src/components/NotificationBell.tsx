"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  useGetMyNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/redux/features/notifications/notificationsApi";
import { safeLink, timeAgo } from "@/utils/notifications";

// Rendered in the header for logged-in users only (see Header.tsx), so the
// query never fires for visitors. It re-checks every minute, which is plenty
// for "new assignment" style updates without a websocket.
export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useGetMyNotificationsQuery(undefined, { pollingInterval: 60000 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const notifications: any[] = (data?.notifications || []).slice(0, 8);
  const unreadCount: number = data?.unreadCount || 0;

  // close when clicking anywhere outside the dropdown
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleOpenNotification = (n: any) => {
    if (n.status === "unread") markRead(n._id);
    const link = safeLink(n.link);
    setOpen(false);
    if (link) router.push(link);
  };

  return (
    <div ref={ref} className="relative">
      <button
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="relative rounded-full border border-parchment/30 p-2 text-parchment/80 hover:border-mustard hover:text-mustard"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-mustard px-1 text-[10px] font-semibold text-ink">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[85vw] border border-parchment-dark bg-parchment text-ink shadow-lg dark:border-ink-light dark:bg-ink dark:text-parchment">
          <div className="flex items-center justify-between border-b border-parchment-dark px-4 py-3 dark:border-ink-light">
            <p className="font-display text-lg">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead(undefined)}
                className="text-xs text-mustard-dark hover:underline dark:text-mustard"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-sm text-ink/60 dark:text-parchment/60">
                You&apos;re all caught up.
              </p>
            )}
            {notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => handleOpenNotification(n)}
                className="flex w-full gap-3 border-b border-parchment-dark px-4 py-3 text-left last:border-b-0 hover:bg-parchment-dark/40 dark:border-ink-light dark:hover:bg-ink-light"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.status === "unread" ? "bg-mustard" : "bg-transparent"
                  }`}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{n.title}</span>
                  <span className="block text-sm text-ink/70 dark:text-parchment/70">{n.message}</span>
                  <span className="mt-1 block text-xs text-ink/40 dark:text-parchment/40">
                    {timeAgo(n.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-parchment-dark px-4 py-3 text-center text-sm text-mustard-dark hover:underline dark:border-ink-light dark:text-mustard"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
