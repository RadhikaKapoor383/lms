"use client";

import Link from "next/link";
import { ProgressBar, Tile } from "./analytics";
import { useGetStudentDashboardQuery } from "@/redux/features/dashboard/dashboardApi";

// Overall progress, "continue learning", recent grades, certificates and
// suggestions - the parts of the student home page that aren't just a course list.
export default function StudentInsights() {
  const { data } = useGetStudentDashboardQuery(undefined, { refetchOnMountOrArgChange: true });
  if (!data) return null;
  const { cards } = data;

  return (
    <div>
      <div className="mt-10 grid gap-4 sm:grid-cols-4">
        <Tile label="Courses" value={cards.courses} hint={`${cards.completed} completed`} />
        <div className="border border-parchment-dark p-4 dark:border-ink-light sm:col-span-2">
          <p className="font-display text-2xl text-ink dark:text-parchment">{cards.overallProgress}%</p>
          <p className="text-xs uppercase tracking-wide text-ink/50 dark:text-parchment/50">Overall progress</p>
          <ProgressBar percent={cards.overallProgress} />
        </div>
        <Link href="/my-certificates" className="hover:opacity-90">
          <Tile label="Certificates" value={cards.certificates} />
        </Link>
      </div>

      {data.continueLearning && (
        <Link
          href={`/course-access/${data.continueLearning.courseId}`}
          className="mt-6 flex items-center justify-between border border-mustard p-5 hover:bg-mustard/10"
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50 dark:text-parchment/50">Continue learning</p>
            <p className="mt-1 font-display text-xl text-ink dark:text-parchment">{data.continueLearning.name}</p>
            <p className="text-sm text-ink/60 dark:text-parchment/60">{data.continueLearning.completionPercentage}% complete</p>
          </div>
          <span className="text-sm text-mustard-dark dark:text-mustard">Resume →</span>
        </Link>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="border border-parchment-dark p-5 dark:border-ink-light">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl text-ink dark:text-parchment">Recent grades</h2>
            <Link href="/progress" className="text-sm text-mustard-dark hover:underline dark:text-mustard">
              My progress
            </Link>
          </div>
          <div className="mt-3 divide-y divide-parchment-dark text-sm dark:divide-ink-light">
            {data.recentGrades.length === 0 && <p className="py-2 text-ink/60 dark:text-parchment/60">No grades yet.</p>}
            {data.recentGrades.map((g: any, i: number) => (
              <div key={i} className="flex justify-between gap-3 py-2">
                <p className="text-ink dark:text-parchment">
                  {g.title}
                  <span className="text-ink/50 dark:text-parchment/50"> · {g.type}</span>
                </p>
                <p className="shrink-0 text-ink dark:text-parchment">
                  {g.percentage === null ? "—" : `${g.percentage}%`}
                  {g.type === "quiz" && (
                    <span className={`ml-2 text-xs ${g.passed ? "text-mustard-dark" : "text-clay"}`}>
                      {g.passed ? "passed" : "not passed"}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-parchment-dark p-5 dark:border-ink-light">
          <h2 className="font-display text-xl text-ink dark:text-parchment">Recommended for you</h2>
          <div className="mt-3 divide-y divide-parchment-dark text-sm dark:divide-ink-light">
            {data.recommended.length === 0 && <p className="py-2 text-ink/60 dark:text-parchment/60">Nothing new right now.</p>}
            {data.recommended.map((c: any) => (
              <Link key={c._id} href={`/course/${c._id}`} className="block py-2 hover:opacity-80">
                <p className="text-ink dark:text-parchment">{c.name}</p>
                <p className="text-ink/60 dark:text-parchment/60">
                  {[c.category, c.level, c.ratings ? `★ ${c.ratings}` : ""].filter(Boolean).join(" · ")}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
