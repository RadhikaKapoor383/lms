"use client";

import { useState } from "react";
import { useReportDiscussionContentMutation } from "@/redux/features/admin/adminApi";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "abuse", label: "Abuse or harassment" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "other", label: "Something else" },
];

// "Report" link on a discussion thread or reply. Opens a small inline form;
// the admins (and the course's instructor) get the report.
export default function ReportButton({
  discussionId,
  replyId,
}: {
  discussionId: string;
  replyId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [report, { isLoading }] = useReportDiscussionContentMutation();

  const submit = async () => {
    setError("");
    try {
      await report({ discussionId, replyId, reason, details }).unwrap();
      setDone(true);
      setOpen(false);
    } catch (err: any) {
      setError(err?.data?.message || "Could not send the report");
    }
  };

  if (done) {
    return <span className="text-sm text-ink/50 dark:text-parchment/50">Reported, thanks</span>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-ink/50 hover:underline dark:text-parchment/50">
        Report
      </button>
    );
  }

  return (
    <div className="mt-2 w-72 max-w-[80vw] space-y-2 border border-parchment-dark p-3 text-sm dark:border-ink-light">
      <label className="block text-ink/70 dark:text-parchment/70">
        Why are you reporting this?
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full border border-parchment-dark bg-transparent px-2 py-1 dark:border-ink-light"
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Anything else the moderators should know? (optional)"
        className="w-full border border-parchment-dark bg-transparent p-2 outline-none focus:border-mustard dark:border-ink-light"
      />
      {error && <p className="text-clay">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={submit}
          disabled={isLoading}
          className="rounded-full bg-mustard px-4 py-1 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
        >
          {isLoading ? "Sending…" : "Send report"}
        </button>
        <button onClick={() => setOpen(false)} className="text-ink/60 hover:underline dark:text-parchment/60">
          Cancel
        </button>
      </div>
    </div>
  );
}
