"use client";

import Link from "next/link";
import { useState } from "react";
import Loader from "@/components/Loader";
import RoleProtected from "@/components/RoleProtected";
import { BarCard, ProgressBar, Tile } from "@/components/analytics";
import ActivityHeatmap from "@/components/ledger/ActivityHeatmap";
import CompletedStamp from "@/components/ledger/CompletedStamp";
import EmptyLedger from "@/components/ledger/EmptyLedger";
import LedgerSkeleton from "@/components/ledger/LedgerSkeleton";
import LedgerSummary from "@/components/ledger/LedgerSummary";
import LedgerTable from "@/components/ledger/LedgerTable";
import { useGetStudentAnalyticsQuery, useGetStudentLedgerQuery } from "@/redux/features/dashboard/dashboardApi";
import { LedgerData } from "@/types/ledger";

const PAGE = 40; // entries shown at first, and added each time "Show earlier entries" is pressed

function ProgressContent() {
  const [limit, setLimit] = useState(PAGE);
  const ledgerQuery = useGetStudentLedgerQuery(limit, { refetchOnMountOrArgChange: true });
  const { data, isLoading, isError } = useGetStudentAnalyticsQuery(undefined, { refetchOnMountOrArgChange: true });

  const ledger: LedgerData | undefined = ledgerQuery.data?.ledger;

  return (
    <>
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm uppercase tracking-[0.12em] text-mustard-dark dark:text-mustard">Your ledger</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-ink dark:text-parchment">
          Everything you&apos;ve finished, on the record.
        </h1>
        <p className="mt-3 max-w-prose text-ink/65 dark:text-parchment/65">
          A running record of every lesson, quiz and assignment you&apos;ve completed, with the total after each entry.
        </p>

        <div className="mt-8">
          {ledgerQuery.isLoading && <LedgerSkeleton />}
          {ledgerQuery.isError && (
            <p role="alert" className="border border-clay/50 bg-clay/10 px-4 py-3 text-sm text-clay">
              <span className="block font-display text-base">Couldn&apos;t load your ledger</span>
              Check your connection and try again.
            </p>
          )}

          {ledger && ledger.totalEntries === 0 && (
            <EmptyLedger
              text="Finish your first lesson and it will be posted here."
              ctaLabel="Browse courses"
              ctaHref="/courses"
            />
          )}

          {ledger && ledger.totalEntries > 0 && (
            <div className="space-y-8">
              <div className="space-y-6">
                <LedgerSummary totals={ledger.totals} />
                <ActivityHeatmap dates={ledger.activity} now={new Date()} />
              </div>
              <LedgerTable
                entries={ledger.entries}
                totalEntries={ledger.totalEntries}
                onShowMore={() => setLimit((n) => n + PAGE)}
              />
            </div>
          )}
        </div>

        <h2 className="mt-16 font-display text-2xl text-ink dark:text-parchment">At a glance</h2>
        <p className="mt-1 text-ink/60 dark:text-parchment/60">Averages and your courses.</p>

        {isLoading && <Loader />}
        {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load your progress.</p>}

        {data && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Tile label="Courses" value={data.summary.coursesEnrolled} />
              <Tile label="Completed" value={data.summary.coursesCompleted} />
              <Tile label="Average progress" value={`${data.summary.averageProgress}%`} />
              <Tile label="Lessons finished" value={data.summary.lessonsCompleted} />
              <Tile
                label="Quiz average"
                value={data.quiz.takers ? `${data.quiz.averagePercentage}%` : "—"}
                hint={data.quiz.takers ? `${data.quiz.passRate}% passed` : "none taken yet"}
              />
              <Tile
                label="Assignment average"
                value={data.assignment.graded ? `${data.assignment.averagePercentage}%` : "—"}
                hint={`${data.assignment.pendingGrading} awaiting grading`}
              />
              <Tile label="Late submissions" value={data.assignment.submissions ? `${data.assignment.lateRate}%` : "—"} />
              <Tile label="Quiz attempts" value={data.quiz.attempts} />
            </div>

            <div className="mt-8">
              <BarCard title="Lessons you finished (8 weeks)" data={data.weeklyLessons} />
            </div>

            <h2 className="mt-10 font-display text-2xl text-ink dark:text-parchment">Courses</h2>
            {data.courses.length === 0 ? (
              <p className="mt-3 text-ink/60 dark:text-parchment/60">
                You&apos;re not enrolled in anything yet.{" "}
                <Link href="/courses" className="text-mustard-dark underline dark:text-mustard">
                  Browse courses
                </Link>
              </p>
            ) : (
              <div className="mt-4 divide-y divide-parchment-dark dark:divide-ink-light">
                {data.courses.map((c: any) => (
                  <Link key={c.courseId} href={`/course-access/${c.courseId}`} className="block py-4 hover:opacity-90">
                    <div className="flex justify-between gap-4">
                      <p className="font-medium text-ink dark:text-parchment">{c.name}</p>
                      {c.status === "completed" ? (
                        <span className="shrink-0">
                          <CompletedStamp />
                        </span>
                      ) : (
                        <p className="shrink-0 text-sm text-ink/60 dark:text-parchment/60">{c.completionPercentage}%</p>
                      )}
                    </div>
                    <ProgressBar percent={c.completionPercentage} />
                    <p className="mt-1 text-xs text-ink/50 dark:text-parchment/50">
                      {c.lastActivity ? `Last lesson ${new Date(c.lastActivity).toLocaleDateString()}` : "Not started"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

export default function ProgressPage() {
  return (
    <RoleProtected allowedRoles={["student"]}>
      <ProgressContent />
    </RoleProtected>
  );
}
