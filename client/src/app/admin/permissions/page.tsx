"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import {
  useGetRolePermissionsQuery,
  useUpdateRolePermissionsMutation,
} from "@/redux/features/permissions/permissionsApi";

type Row = { key: string; role: "instructor" | "student"; label: string; allowed: boolean };

const ROLE_TITLES = { instructor: "Instructors may…", student: "Students may…" } as const;
const sentence = (label: string) => label.charAt(0).toUpperCase() + label.slice(1);

export default function AdminPermissionsPage() {
  const { data, isLoading, isError } = useGetRolePermissionsQuery(undefined);
  const [save, { isLoading: isSaving }] = useUpdateRolePermissionsMutation();
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (data?.permissions) setRows(data.permissions);
  }, [data]);

  const saved: Row[] = data?.permissions || [];
  const changed = rows.some((r) => saved.find((s) => s.key === r.key)?.allowed !== r.allowed);

  const toggle = (key: string) => {
    setMessage(null);
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, allowed: !r.allowed } : r)));
  };

  const handleSave = async () => {
    const body: Record<string, Record<string, boolean>> = { instructor: {}, student: {} };
    for (const r of rows) body[r.role][r.key] = r.allowed;
    try {
      await save(body).unwrap();
      setMessage({ kind: "ok", text: "Saved. The change applies to everyone with that role straight away." });
    } catch (err: any) {
      setMessage({ kind: "error", text: err?.data?.message || "Could not save the permissions" });
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Permissions</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/60 dark:text-parchment/60">
        Switch off what a whole role may do. Admins can always do everything. Everything is on until you
        turn it off; what someone already made (courses, posts, reviews) stays as it is.
      </p>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load permissions.</p>}

      {rows.length > 0 && (
        <div className="mt-8 grid max-w-3xl gap-10 md:grid-cols-2">
          {(["instructor", "student"] as const).map((role) => (
            <fieldset key={role}>
              <legend className="font-medium text-ink dark:text-parchment">{ROLE_TITLES[role]}</legend>
              <ul className="mt-3 space-y-3">
                {rows
                  .filter((r) => r.role === role)
                  .map((r) => (
                    <li key={r.key}>
                      <label className="flex cursor-pointer items-start gap-3 text-sm text-ink/80 dark:text-parchment/80">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={r.allowed}
                          onChange={() => toggle(r.key)}
                          aria-label={`${role === "instructor" ? "Instructors" : "Students"} may ${r.label}`}
                        />
                        <span className={r.allowed ? "" : "line-through opacity-60"}>{sentence(r.label)}</span>
                      </label>
                    </li>
                  ))}
              </ul>
            </fieldset>
          ))}
        </div>
      )}

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`mt-6 text-sm ${message.kind === "error" ? "text-clay" : "text-ink-light dark:text-mustard"}`}>
          {message.text}
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-8 flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving || !changed}
            className="rounded-full bg-mustard px-6 py-2.5 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save permissions"}
          </button>
          {changed && (
            <button
              onClick={() => {
                setRows(saved);
                setMessage(null);
              }}
              className="px-3 text-sm text-ink/60 hover:underline dark:text-parchment/60"
            >
              Undo changes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
