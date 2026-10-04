"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import RoleProtected from "@/components/RoleProtected";
import {
  useGetMyNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/redux/features/notifications/notificationsApi";
import { safeLink, timeAgo } from "@/utils/notifications";

function NotificationsContent() {
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading, isError } = useGetMyNotificationsQuery(undefined);
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();

  const all: any[] = data?.notifications || [];
  const unreadCount: number = data?.unreadCount || 0;
  const shown = unreadOnly ? all.filter((n) => n.status === "unread") : all;

  const open = (n: any) => {
    if (n.status === "unread") markRead(n._id);
    const link = safeLink(n.link);
    if (link) router.push(link);
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-4xl text-ink dark:text-parchment">Notifications</h1>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className="text-mustard-dark hover:underline dark:text-mustard"
            >
              {unreadOnly ? "Show all" : `Unread only (${unreadCount})`}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead(undefined)}
                disabled={isMarkingAll}
                className="rounded-full bg-mustard px-4 py-1.5 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm text-ink/60 dark:text-parchment/60">Your 50 most recent.</p>

        {isLoading && <Loader />}
        {isError && (
          <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load notifications.</p>
        )}
        {!isLoading && !isError && shown.length === 0 && (
          <p className="mt-8 text-ink/60 dark:text-parchment/60">
            {unreadOnly ? "Nothing unread." : "No notifications yet."}
          </p>
        )}

        <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
          {shown.map((n) => (
            <button
              key={n._id}
              onClick={() => open(n)}
              className="flex w-full items-start gap-4 py-4 text-left hover:opacity-90"
            >
              <span
                className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                  n.status === "unread" ? "bg-mustard" : "bg-transparent"
                }`}
              />
              <span className="flex-1">
                <span className="block font-medium text-ink dark:text-parchment">{n.title}</span>
                <span className="block text-ink/70 dark:text-parchment/70">{n.message}</span>
              </span>
              <span className="shrink-0 text-xs text-ink/40 dark:text-parchment/40">
                {timeAgo(n.createdAt)}
              </span>
            </button>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function NotificationsPage() {
  return (
    <RoleProtected allowedRoles={["admin", "instructor", "student"]}>
      <NotificationsContent />
    </RoleProtected>
  );
}
