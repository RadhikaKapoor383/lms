"use client";

import { useEffect, useRef, useState } from "react";
import { useGetAnnouncementsQuery } from "@/redux/features/announcements/announcementsApi";

const DISMISSED_KEY = "ledger:dismissed-announcement";
const CLOSE_MS = 300; // matches duration-300 below

interface Announcement {
  _id: string;
  title: string;
  message: string;
  course?: string | null;
}

export default function AnnouncementBar() {
  const { data } = useGetAnnouncementsQuery(undefined);
  // id of the announcement the visitor already closed (remembered across visits)
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [closing, setClosing] = useState<boolean>(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    try {
      setDismissedId(localStorage.getItem(DISMISSED_KEY));
    } catch {
      // storage can be blocked - the bar just comes back on the next visit
    }
    setReady(true);
    return () => clearTimeout(timer.current);
  }, []);

  // The server already returns only platform-wide announcements; skipping any
  // that belong to a course is a safety net so those never show here.
  const latest = (data?.announcements as Announcement[] | undefined)?.find((a) => !a.course);

  // Wait until we've read the saved choice, so a closed bar never flashes back
  if (!ready || !latest || latest._id === dismissedId) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, latest._id);
    } catch {
      // ignore
    }
    setClosing(true); // collapse smoothly, then remove
    timer.current = setTimeout(() => {
      setDismissedId(latest._id);
      setClosing(false);
    }, CLOSE_MS);
  };

  return (
    <section
      aria-label="Announcement"
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        closing ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
      }`}
    >
      <div className="overflow-hidden">
        <div className="relative bg-mustard px-12 py-2.5 text-center text-sm text-ink">
          <span className="font-medium">{latest.title}:</span> {latest.message}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss announcement"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink/70 transition hover:bg-ink/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
