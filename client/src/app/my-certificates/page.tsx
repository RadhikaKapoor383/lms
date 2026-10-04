"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import RoleProtected from "@/components/RoleProtected";
import { useGetMyCertificatesQuery } from "@/redux/features/certificates/certificatesApi";

function MyCertificatesContent() {
  const { data, isLoading, isError } = useGetMyCertificatesQuery(undefined);
  const certificates = data?.certificates || [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-4xl text-ink dark:text-parchment">
          My certificates
        </h1>
        <p className="mt-2 text-ink/60 dark:text-parchment/60">
          Finish every lesson and pass every quiz in a course to earn its certificate.
        </p>

        {isLoading && <Loader />}
        {isError && (
          <p className="mt-6 text-ink/60 dark:text-parchment/60">
            Couldn&apos;t load your certificates.
          </p>
        )}
        {!isLoading && !isError && certificates.length === 0 && (
          <p className="mt-8 text-ink/60 dark:text-parchment/60">
            No certificates yet.{" "}
            <Link href="/dashboard" className="text-mustard-dark underline dark:text-mustard">
              Continue learning
            </Link>
            .
          </p>
        )}

        <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
          {certificates.map((c: any) => (
            <Link
              key={c.certificateId}
              href={`/certificates/${c.certificateId}`}
              className="flex items-center justify-between py-5 hover:opacity-90"
            >
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-medium text-ink dark:text-parchment">{c.courseName}</p>
                  {c.status === "revoked" && (
                    <span className="rounded-full bg-clay/20 px-2.5 py-0.5 text-xs text-clay">
                      Revoked
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink/60 dark:text-parchment/60">
                  Completed {new Date(c.completionDate).toLocaleDateString()} · {c.instructorName}
                </p>
              </div>
              <span className="font-mono text-xs text-ink/40 dark:text-parchment/40">
                {c.certificateId}
              </span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function MyCertificatesPage() {
  return (
    <RoleProtected allowedRoles={["student"]}>
      <MyCertificatesContent />
    </RoleProtected>
  );
}
