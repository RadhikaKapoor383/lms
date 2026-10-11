"use client";

import Link from "next/link";
import Loader from "@/components/Loader";
import RoleProtected from "@/components/RoleProtected";
import { useGetMyAssignmentsQuery } from "@/redux/features/assignments/assignmentsApi";

const fmt = (d: string) => new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Row({ a, note, noteClass }: { a: any; note: string; noteClass?: string }) {
  return (
    <Link
      href={`/course-access/${a.course?._id}/assignments`}
      className="flex items-center justify-between gap-4 py-4 hover:opacity-90"
    >
      <div>
        <p className="font-medium text-ink dark:text-parchment">{a.title}</p>
        <p className="text-sm text-ink/60 dark:text-parchment/60">
          {a.course?.name} · Due {fmt(a.deadline)} · {a.maxMarks} marks
        </p>
      </div>
      <span className={`shrink-0 text-sm ${noteClass || "text-ink/60 dark:text-parchment/60"}`}>{note}</span>
    </Link>
  );
}

function Section({ title, children, count }: { title: string; children: React.ReactNode; count: number }) {
  if (count === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-ink dark:text-parchment">
        {title} <span className="text-base text-ink/50 dark:text-parchment/50">({count})</span>
      </h2>
      <div className="mt-2 divide-y divide-parchment-dark dark:divide-ink-light">{children}</div>
    </section>
  );
}

function AssignmentsContent() {
  const { data, isLoading, isError } = useGetMyAssignmentsQuery(undefined);
  const all: any[] = data?.assignments || [];
  const now = Date.now();

  const todo = all.filter((a) => !a.mySubmission && new Date(a.deadline).getTime() >= now);
  const overdue = all.filter((a) => !a.mySubmission && new Date(a.deadline).getTime() < now);
  const submitted = all.filter((a) => a.mySubmission);

  return (
    <main className="px-2 py-10 md:px-6">
      <h1 className="font-display text-4xl text-ink dark:text-parchment">Assignments</h1>
      <p className="mt-2 text-ink/60 dark:text-parchment/60">Across all your courses, soonest deadline first.</p>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load your assignments.</p>}
      {!isLoading && !isError && all.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No assignments yet.</p>
      )}

      <Section title="To do" count={todo.length}>
        {todo.map((a) => (
          <Row key={a._id} a={a} note="Not submitted" />
        ))}
      </Section>

      <Section title="Overdue" count={overdue.length}>
        {overdue.map((a) => (
          <Row key={a._id} a={a} note="Past the deadline" noteClass="text-clay" />
        ))}
      </Section>

      <Section title="Submitted" count={submitted.length}>
        {submitted.map((a) => {
          const s = a.mySubmission;
          const graded = typeof s.marks === "number";
          return (
            <Row
              key={a._id}
              a={a}
              note={graded ? `Graded: ${s.marks}/${a.maxMarks}` : s.isLate ? "Submitted late - waiting for a grade" : "Waiting for a grade"}
              noteClass={graded ? "text-mustard-dark dark:text-mustard" : undefined}
            />
          );
        })}
      </Section>
    </main>
  );
}

export default function AssignmentsPage() {
  return (
    <RoleProtected allowedRoles={["student"]}>
      <AssignmentsContent />
    </RoleProtected>
  );
}
