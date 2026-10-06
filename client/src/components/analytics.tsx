"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Small building blocks shared by the dashboards and analytics pages.

export function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="border border-parchment-dark p-4 dark:border-ink-light">
      <p className="font-display text-2xl text-ink dark:text-parchment">{value}</p>
      <p className="text-xs uppercase tracking-wide text-ink/50 dark:text-parchment/50">{label}</p>
      {hint && <p className="mt-1 text-xs text-ink/50 dark:text-parchment/50">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-parchment-dark dark:bg-ink">
      <div className="h-1.5 rounded-full bg-mustard" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

// A bar chart of { label, count } points (a week or a month each). Labels are
// shortened for the axis: "2026-10-05" -> "10-05", "2026-10" -> "10".
export function BarCard({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  const total = data.reduce((t, d) => t + d.count, 0);
  const short = (label: string) => (label.length === 10 ? label.slice(5) : label.slice(2));
  return (
    <div className="border border-parchment-dark p-4 dark:border-ink-light">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-ink dark:text-parchment">{title}</p>
        <p className="text-xs text-ink/50 dark:text-parchment/50">{total} total</p>
      </div>
      <div className="mt-3 h-40">
        {total === 0 ? (
          <p className="pt-12 text-center text-sm text-ink/50 dark:text-parchment/50">Nothing yet</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="label" tickFormatter={short} tick={{ fontSize: 10 }} interval="preserveStartEnd" stroke="#888" />
              <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} stroke="#888" />
              <Tooltip
                contentStyle={{ fontSize: 12, background: "#0F2E2B", border: "none" }}
                labelStyle={{ color: "#F3EFE3" }}
                itemStyle={{ color: "#D9A441" }}
              />
              <Bar dataKey="count" fill="#D9A441" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// One row per course with the numbers an instructor or admin compares.
export function CoursePerformanceTable({ courses }: { courses: any[] }) {
  if (courses.length === 0) return <p className="text-ink/60 dark:text-parchment/60">No courses yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-ink/50 dark:text-parchment/50">
          <tr>
            <th className="pb-3 font-medium">Course</th>
            <th className="pb-3 font-medium">Enrolled</th>
            <th className="pb-3 font-medium">Completed</th>
            <th className="pb-3 font-medium">Drop-off</th>
            <th className="pb-3 font-medium">Quiz avg</th>
            <th className="pb-3 font-medium">Assignment avg</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-parchment-dark text-ink dark:divide-ink-light dark:text-parchment">
          {courses.map((c) => (
            <tr key={c._id}>
              <td className="py-3 pr-4 font-medium">{c.name}</td>
              <td className="py-3">{c.enrolled}</td>
              <td className="py-3">{c.completionRate}%</td>
              <td className="py-3">{c.enrolled ? `${c.dropOffRate}%` : "—"}</td>
              <td className="py-3">{c.quiz.takers ? `${c.quiz.averagePercentage}% (${c.quiz.passRate}% pass)` : "—"}</td>
              <td className="py-3">
                {c.assignment.graded ? `${c.assignment.averagePercentage}%` : "—"}
                {c.assignment.pendingGrading > 0 && (
                  <span className="ml-2 text-xs text-clay">{c.assignment.pendingGrading} to grade</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const formatDuration = (minutes: number) => {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};
