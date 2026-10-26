"use client";

import { useEffect, useState } from "react";
import Loader from "./Loader";
import {
  useGetCompletionRulesQuery,
  useUpdateCompletionRulesMutation,
} from "@/redux/features/courses/coursesApi";

type Rules = {
  lessonPercent: number;
  quizzes: "all" | "none" | "selected";
  quizIds: string[];
  assignments: "none" | "submitted" | "passed";
  assignmentPassPercent: number;
};

const inputClass =
  "mt-1 w-28 border border-parchment-dark bg-transparent px-3 py-2 text-ink outline-none focus:border-mustard dark:border-ink-light dark:text-parchment";
const legendClass = "font-medium text-ink dark:text-parchment";
const optionClass = "flex items-center gap-2 text-sm text-ink/80 dark:text-parchment/80";

// What a student must do to complete one course (and earn its certificate).
// Used by the instructor's and the admin's course pages.
export default function CompletionRulesForm({ courseId }: { courseId: string }) {
  const { data, isLoading, isError, error } = useGetCompletionRulesQuery(courseId);
  const [save, { isLoading: isSaving }] = useUpdateCompletionRulesMutation();
  const [rules, setRules] = useState<Rules | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (data?.rules) setRules(data.rules);
  }, [data]);

  if (isLoading || (!rules && !isError)) return <Loader />;
  if (isError || !rules) {
    return (
      <p className="text-ink/60 dark:text-parchment/60">
        {(error as any)?.data?.message || "Couldn't load the completion rules."}
      </p>
    );
  }

  const quizzes: { _id: string; title: string }[] = data?.quizzes || [];
  const assignmentCount: number = data?.assignmentCount || 0;
  const set = (patch: Partial<Rules>) => {
    setMessage(null);
    setRules((r) => (r ? { ...r, ...patch } : r));
  };
  const toggleQuiz = (id: string) =>
    set({ quizIds: rules.quizIds.includes(id) ? rules.quizIds.filter((q) => q !== id) : [...rules.quizIds, id] });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({ courseId, rules }).unwrap();
      setMessage({ kind: "ok", text: "Saved. Students who now qualify get their certificate next time they open the course." });
    } catch (err: any) {
      setMessage({ kind: "error", text: err?.data?.message || "Could not save the rules" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-8">
      <fieldset>
        <legend className={legendClass}>Lessons</legend>
        <label className="mt-2 block text-sm text-ink/80 dark:text-parchment/80" htmlFor="lesson-percent">
          Share of lessons a student must finish
        </label>
        <div className="flex items-center gap-2">
          <input
            id="lesson-percent"
            type="number"
            min={1}
            max={100}
            step={1}
            required
            value={rules.lessonPercent}
            onChange={(e) => set({ lessonPercent: Number(e.target.value) })}
            className={inputClass}
          />
          <span className="text-sm text-ink/60 dark:text-parchment/60">%</span>
        </div>
      </fieldset>

      <fieldset>
        <legend className={legendClass}>Quizzes</legend>
        <div className="mt-2 space-y-2">
          {(
            [
              ["all", "Pass every quiz"],
              ["selected", "Pass only the quizzes I choose"],
              ["none", "Quizzes are optional"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={optionClass}>
              <input
                type="radio"
                name="quizzes"
                value={value}
                checked={rules.quizzes === value}
                onChange={() => set({ quizzes: value })}
              />
              {label}
            </label>
          ))}
        </div>
        {rules.quizzes === "selected" && (
          <div className="mt-3 space-y-2 border-l-2 border-mustard pl-4">
            {quizzes.length === 0 ? (
              <p className="text-sm text-clay">This course has no quizzes yet.</p>
            ) : (
              quizzes.map((q) => (
                <label key={q._id} className={optionClass}>
                  <input type="checkbox" checked={rules.quizIds.includes(q._id)} onChange={() => toggleQuiz(q._id)} />
                  {q.title}
                </label>
              ))
            )}
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className={legendClass}>Assignments</legend>
        {assignmentCount === 0 && (
          <p className="mt-1 text-xs text-ink/60 dark:text-parchment/60">
            This course has no assignments yet; a rule here applies once you add some.
          </p>
        )}
        <div className="mt-2 space-y-2">
          {(
            [
              ["none", "Assignments are optional"],
              ["submitted", "Submit every assignment"],
              ["passed", "Pass every assignment"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={optionClass}>
              <input
                type="radio"
                name="assignments"
                value={value}
                checked={rules.assignments === value}
                onChange={() => set({ assignments: value })}
              />
              {label}
            </label>
          ))}
        </div>
        {rules.assignments === "passed" && (
          <div className="mt-3 border-l-2 border-mustard pl-4">
            <label className="text-sm text-ink/80 dark:text-parchment/80" htmlFor="assignment-pass">
              Pass mark (share of the assignment&apos;s marks)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="assignment-pass"
                type="number"
                min={1}
                max={100}
                step={1}
                required
                value={rules.assignmentPassPercent}
                onChange={(e) => set({ assignmentPassPercent: Number(e.target.value) })}
                className={inputClass}
              />
              <span className="text-sm text-ink/60 dark:text-parchment/60">%</span>
            </div>
            <p className="mt-1 text-xs text-ink/60 dark:text-parchment/60">
              A student waits for your grade before the course counts as complete.
            </p>
          </div>
        )}
      </fieldset>

      {data?.summary?.length > 0 && (
        <div className="border border-parchment-dark p-4 text-sm dark:border-ink-light">
          <p className="font-medium text-ink dark:text-parchment">Saved rules</p>
          <ul className="mt-1 list-disc pl-5 text-ink/70 dark:text-parchment/70">
            {data.summary.map((line: string) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`text-sm ${message.kind === "error" ? "text-clay" : "text-ink-light dark:text-mustard"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="rounded-full bg-mustard px-6 py-2.5 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save rules"}
      </button>
      <p className="text-xs text-ink/50 dark:text-parchment/50">
        Certificates already issued stay valid when you change these rules.
      </p>
    </form>
  );
}
