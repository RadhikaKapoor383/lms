"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import { useVerifyCertificateQuery } from "@/redux/features/certificates/certificatesApi";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// Public page: it is both the certificate itself and its verification record.
// Anyone with the id (for example an employer holding a printout) can open it
// and see whether the certificate is genuine and still valid.
export default function CertificatePage() {
  const params = useParams();
  const certificateId = params?.certificateId as string;

  const { data, isLoading, isError } = useVerifyCertificateQuery(certificateId);
  const certificate = data?.certificate;
  const revoked = certificate?.status === "revoked";

  // window only exists in the browser, so read it after mount to avoid a
  // server/client mismatch.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <>
      <div className="print:hidden">
        <Header />
      </div>

      <main className="mx-auto max-w-4xl px-6 py-10 print:max-w-none print:p-0">
        {isLoading && <Loader />}

        {isError && (
          <div className="py-20 text-center">
            <h1 className="font-display text-3xl text-ink dark:text-parchment">
              Certificate not found
            </h1>
            <p className="mt-3 text-ink/60 dark:text-parchment/60">
              We couldn&apos;t find a certificate with the id{" "}
              <span className="font-mono">{certificateId}</span>. Check the id and try again.
            </p>
          </div>
        )}

        {certificate && (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  revoked ? "bg-clay/20 text-clay" : "bg-ink-light text-parchment"
                }`}
              >
                {revoked ? "Revoked" : "✓ Verified — valid certificate"}
              </span>
              <button
                onClick={() => window.print()}
                className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark"
              >
                Download / Print PDF
              </button>
            </div>

            {/* The certificate sheet stays light in dark mode so it prints correctly */}
            <div className="relative border-4 border-double border-neutral-800 bg-white p-10 text-center text-neutral-900 sm:p-16 print:border-neutral-800">
              {revoked && (
                <p className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-7xl uppercase tracking-widest text-red-600/20 -rotate-12">
                  Revoked
                </p>
              )}

              <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                {certificate.platformName}
              </p>
              <h1 className="mt-4 font-display text-4xl sm:text-5xl">
                Certificate of Completion
              </h1>

              <p className="mt-10 text-neutral-500">This certifies that</p>
              <p className="mt-3 font-display text-3xl sm:text-4xl">
                {certificate.studentName}
              </p>

              <p className="mt-8 text-neutral-500">has successfully completed the course</p>
              <p className="mt-3 font-display text-2xl sm:text-3xl">
                {certificate.courseName}
              </p>

              <div className="mt-12 grid gap-8 sm:grid-cols-2">
                <div>
                  <p className="border-b border-neutral-400 pb-2 font-medium">
                    {formatDate(certificate.completionDate)}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-neutral-500">
                    Completion date
                  </p>
                </div>
                <div>
                  <p className="border-b border-neutral-400 pb-2 font-medium">
                    {certificate.instructorName}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-neutral-500">
                    Instructor
                  </p>
                </div>
              </div>

              <div className="mt-12 border-t border-neutral-300 pt-5 text-xs text-neutral-500">
                <p>
                  Certificate ID:{" "}
                  <span className="font-mono text-neutral-800">{certificate.certificateId}</span>
                </p>
                <p className="mt-1">
                  Issued {formatDate(certificate.issuedAt)}
                  {origin && (
                    <>
                      {" "}
                      · Verify at{" "}
                      <span className="font-mono">
                        {origin}/certificates/{certificate.certificateId}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {revoked && (
              <p className="mt-6 text-center text-sm text-clay print:hidden">
                This certificate was revoked
                {certificate.revokedAt ? ` on ${formatDate(certificate.revokedAt)}` : ""} and is
                no longer valid.
              </p>
            )}
          </>
        )}
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </>
  );
}
