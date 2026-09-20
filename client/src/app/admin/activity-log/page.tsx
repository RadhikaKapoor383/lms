"use client";

import Loader from "@/components/Loader";
import { useGetAuditLogsQuery } from "@/redux/features/auditLog/auditLogApi";

const actionLabels: Record<string, string> = {
  "course.create": "Course created",
  "course.edit": "Course edited",
  "course.status_change": "Course status changed",
  "course.delete": "Course deleted",
  "user.role_update": "User role changed",
  "user.delete": "User deleted",
  "announcement.create": "Announcement posted",
  "announcement.delete": "Announcement deleted",
};

export default function ActivityLogPage() {
  const { data, isLoading } = useGetAuditLogsQuery(undefined);
  const logs = data?.logs || [];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">
        Activity log
      </h1>
      <p className="mt-1 text-ink/70 dark:text-parchment/70">
        Last 200 admin actions across the platform, most recent first.
      </p>

      {isLoading && <Loader />}

      {!isLoading && logs.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          No activity recorded yet.
        </p>
      )}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {logs.map((log: any) => (
          <div key={log._id} className="py-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-parchment-dark px-2.5 py-0.5 text-xs text-ink/70 dark:bg-ink-light dark:text-parchment/70">
                {actionLabels[log.action] || log.action}
              </span>
              <span className="text-ink/40 dark:text-parchment/40">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-ink dark:text-parchment">{log.targetLabel}</p>
            <p className="text-ink/50 dark:text-parchment/50">by {log.userName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}