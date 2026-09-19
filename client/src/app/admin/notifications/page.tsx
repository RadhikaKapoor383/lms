"use client";

import Loader from "@/components/Loader";
import {
  useGetAllNotificationsQuery,
  useUpdateNotificationMutation,
} from "@/redux/features/notifications/notificationsApi";

export default function AdminNotificationsPage() {
  const { data, isLoading } = useGetAllNotificationsQuery(undefined);
  const [markRead] = useUpdateNotificationMutation();

  const notifications = data?.notifications || [];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">
        Notifications
      </h1>

      {isLoading && <Loader />}

      {!isLoading && notifications.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">Nothing here yet.</p>
      )}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {notifications.map((n: any) => (
          <div key={n._id} className="flex items-center justify-between py-4">
            <div>
              <p
                className={`font-medium ${
                  n.status === "unread"
                    ? "text-ink dark:text-parchment"
                    : "text-ink/50 dark:text-parchment/50"
                }`}
              >
                {n.title}
              </p>
              <p className="text-sm text-ink/60 dark:text-parchment/60">{n.message}</p>
              <p className="mt-1 text-xs text-ink/40 dark:text-parchment/40">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
            {n.status === "unread" && (
              <button
                onClick={() => markRead(n._id)}
                className="text-sm text-mustard-dark hover:underline dark:text-mustard"
              >
                Mark as read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}