"use client";

import { useGetAnnouncementsQuery } from "@/redux/features/announcements/announcementsApi";

export default function AnnouncementBar() {
  const { data } = useGetAnnouncementsQuery(undefined);
  const latest = data?.announcements?.[0];

  if (!latest) return null;

  return (
    <div className="bg-mustard px-6 py-2.5 text-center text-sm text-ink">
      <span className="font-medium">{latest.title}:</span> {latest.message}
    </div>
  );
}