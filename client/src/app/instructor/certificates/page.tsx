"use client";

import Link from "next/link";
import Loader from "@/components/Loader";
import { useGetInstructorCertificatesQuery } from "@/redux/features/certificates/certificatesApi";

export default function InstructorCertificatesPage() {
  const { data, isLoading, isError } = useGetInstructorCertificatesQuery(undefined);
  const certificates = data?.certificates || [];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Certificates</h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        Students who completed your courses and earned a certificate.
      </p>

      {isLoading && <Loader />}
      {isError && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          Couldn&apos;t load certificates.
        </p>
      )}
      {!isLoading && !isError && certificates.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">
          No certificates issued for your courses yet.
        </p>
      )}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {certificates.map((c: any) => (
          <div key={c.certificateId} className="flex items-center justify-between py-4">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-medium text-ink dark:text-parchment">
                  {c.studentName} — {c.courseName}
                </p>
                {c.status === "revoked" && (
                  <span className="rounded-full bg-clay/20 px-2.5 py-0.5 text-xs text-clay">
                    Revoked
                  </span>
                )}
              </div>
              <p className="text-sm text-ink/60 dark:text-parchment/60">
                Completed {new Date(c.completionDate).toLocaleDateString()} ·{" "}
                <span className="font-mono">{c.certificateId}</span>
              </p>
            </div>
            <Link
              href={`/certificates/${c.certificateId}`}
              className="text-sm text-mustard-dark hover:underline dark:text-mustard"
            >
              View
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
