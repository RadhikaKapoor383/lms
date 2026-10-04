"use client";

import Link from "next/link";
import { useState } from "react";
import Loader from "@/components/Loader";
import {
  useGetAdminCertificatesQuery,
  useReinstateCertificateMutation,
  useRevokeCertificateMutation,
} from "@/redux/features/certificates/certificatesApi";

export default function AdminCertificatesPage() {
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading, isError } = useGetAdminCertificatesQuery(submitted);
  const [revoke] = useRevokeCertificateMutation();
  const [reinstate] = useReinstateCertificateMutation();
  const certificates = data?.certificates || [];

  const handleRevoke = async (certificateId: string) => {
    // null means the admin pressed Cancel - do nothing
    const reason = window.prompt("Reason for revoking (optional):");
    if (reason === null) return;
    setError("");
    try {
      await revoke({ certificateId, reason }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not revoke the certificate");
    }
  };

  const handleReinstate = async (certificateId: string) => {
    setError("");
    try {
      await reinstate(certificateId).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not reinstate the certificate");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Certificates</h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        Most recent 200. Search by student, course, or certificate id.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(search.trim());
        }}
        className="mt-6 flex gap-3"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-72 border border-parchment-dark bg-transparent px-3 py-2 text-sm outline-none focus:border-mustard dark:border-ink-light"
        />
        <button
          type="submit"
          className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark"
        >
          Search
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-clay">{error}</p>}
      {isLoading && <Loader />}
      {isError && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          Couldn&apos;t load certificates.
        </p>
      )}
      {!isLoading && !isError && certificates.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No certificates found.</p>
      )}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {certificates.map((c: any) => (
          <div key={c.certificateId} className="flex items-center justify-between py-4">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-medium text-ink dark:text-parchment">
                  {c.studentName} — {c.courseName}
                </p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    c.status === "revoked"
                      ? "bg-clay/20 text-clay"
                      : "bg-ink-light text-parchment"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <p className="text-sm text-ink/60 dark:text-parchment/60">
                {c.instructorName} · completed {new Date(c.completionDate).toLocaleDateString()} ·{" "}
                <span className="font-mono">{c.certificateId}</span>
                {c.status === "revoked" && c.revokedReason ? ` · ${c.revokedReason}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/certificates/${c.certificateId}`}
                className="text-sm text-mustard-dark hover:underline dark:text-mustard"
              >
                View
              </Link>
              {c.status === "valid" ? (
                <button
                  onClick={() => handleRevoke(c.certificateId)}
                  className="text-sm text-clay hover:underline"
                >
                  Revoke
                </button>
              ) : (
                <button
                  onClick={() => handleReinstate(c.certificateId)}
                  className="text-sm text-mustard-dark hover:underline dark:text-mustard"
                >
                  Reinstate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
