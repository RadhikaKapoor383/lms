"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Loader from "@/components/Loader";
import {
  useCreateQuizMutation,
  useDeleteQuizMutation,
  useGetCourseQuizzesQuery,
} from "@/redux/features/quizzes/quizzesApi";
import { useGetInstructorCoursesQuery } from "@/redux/features/courses/coursesApi";

type DraftOption = { text: string; isCorrect: boolean };
type DraftQuestion = { questionText: string; type: "single" | "multiple" | "trueFalse"; marks: number; options: DraftOption[] };

const emptyQuestion = (): DraftQuestion => ({
  questionText: "",
  type: "single",
  marks: 1,
  options: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }],
});

export default function CourseQuizzesPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const { data: coursesData } = useGetInstructorCoursesQuery(undefined);
  const course = coursesData?.courses?.find((c: any) => c._id === courseId);

  const { data, isLoading, isError } = useGetCourseQuizzesQuery(courseId);
  const [createQuiz, { isLoading: isCreating }] = useCreateQuizMutation();
  const [deleteQuiz] = useDeleteQuizMutation();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [passingScore, setPassingScore] = useState(60);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [error, setError] = useState("");

  const quizzes = data?.quizzes || [];

  const updateQuestion = (qi: number, patch: Partial<DraftQuestion>) => {
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  };

  const updateOption = (qi: number, oi: number, patch: Partial<DraftOption>) => {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qi) return q;
        const options = q.options.map((o, j) => {
          // "single"/trueFalse questions can only have one correct option -
          // selecting a new one clears the others.
          if (patch.isCorrect && q.type !== "multiple" && j !== oi) {
            return { ...o, isCorrect: false };
          }
          return j === oi ? { ...o, ...patch } : o;
        });
        return { ...q, options };
      })
    );
  };

  const addOption = (qi: number) => {
    setQuestions((qs) =>
      qs.map((q, i) => (i === qi ? { ...q, options: [...q.options, { text: "", isCorrect: false }] } : q))
    );
  };

  const removeOption = (qi: number, oi: number) => {
    setQuestions((qs) =>
      qs.map((q, i) => (i === qi ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q))
    );
  };

  const addQuestion = () => setQuestions((qs) => [...qs, emptyQuestion()]);
  const removeQuestion = (qi: number) => setQuestions((qs) => qs.filter((_, i) => i !== qi));

  const resetForm = () => {
    setTitle("");
    setMaxAttempts(1);
    setPassingScore(60);
    setRandomizeQuestions(false);
    setQuestions([emptyQuestion()]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    for (const q of questions) {
      if (!q.options.some((o) => o.isCorrect)) {
        setError(`"${q.questionText || "A question"}" needs a correct option marked`);
        return;
      }
    }
    try {
      await createQuiz({
        courseId,
        data: { title, maxAttempts, passingScore, randomizeQuestions, questions },
      }).unwrap();
      resetForm();
      setShowForm(false);
    } catch (err: any) {
      setError(err?.data?.message || "Could not create the quiz");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink dark:text-parchment">
          Quizzes{course ? ` — ${course.name}` : ""}
        </h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark"
        >
          {showForm ? "Cancel" : "+ New quiz"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-clay">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 space-y-5 border border-parchment-dark p-5 dark:border-ink-light">
          <div>
            <label className="block text-sm font-medium text-ink dark:text-parchment">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink dark:text-parchment">Max attempts</label>
              <input
                type="number"
                min={1}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink dark:text-parchment">Passing score (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
              />
            </div>
            <label className="flex items-end gap-2 pb-2.5 text-sm text-ink dark:text-parchment">
              <input
                type="checkbox"
                checked={randomizeQuestions}
                onChange={(e) => setRandomizeQuestions(e.target.checked)}
              />
              Shuffle question order
            </label>
          </div>

          <div className="space-y-5">
            {questions.map((q, qi) => (
              <div key={qi} className="border border-parchment-dark p-4 dark:border-ink-light">
                <div className="flex items-start gap-3">
                  <input
                    required
                    placeholder={`Question ${qi + 1}`}
                    value={q.questionText}
                    onChange={(e) => updateQuestion(qi, { questionText: e.target.value })}
                    className="w-full border border-parchment-dark bg-transparent px-3 py-2 outline-none focus:border-mustard dark:border-ink-light"
                  />
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(qi, { type: e.target.value as DraftQuestion["type"] })}
                    className="border border-parchment-dark bg-transparent px-2 py-2 text-sm outline-none focus:border-mustard dark:border-ink-light"
                  >
                    <option value="single">Single answer</option>
                    <option value="multiple">Multiple answers</option>
                    <option value="trueFalse">True / False</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={q.marks}
                    onChange={(e) => updateQuestion(qi, { marks: Number(e.target.value) })}
                    title="Marks"
                    className="w-16 border border-parchment-dark bg-transparent px-2 py-2 text-sm outline-none focus:border-mustard dark:border-ink-light"
                  />
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qi)} className="text-sm text-clay">
                      Remove
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-2 pl-2">
                  {q.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type={q.type === "multiple" ? "checkbox" : "radio"}
                        name={`correct-${qi}`}
                        checked={o.isCorrect}
                        onChange={(e) => updateOption(qi, oi, { isCorrect: e.target.checked || e.target.type === "radio" })}
                        title="Correct answer"
                      />
                      <input
                        required
                        placeholder={`Option ${oi + 1}`}
                        value={o.text}
                        onChange={(e) => updateOption(qi, oi, { text: e.target.value })}
                        className="w-full border border-parchment-dark bg-transparent px-3 py-1.5 text-sm outline-none focus:border-mustard dark:border-ink-light"
                      />
                      {q.options.length > 2 && (
                        <button type="button" onClick={() => removeOption(qi, oi)} className="text-xs text-clay">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {q.type !== "trueFalse" && (
                    <button
                      type="button"
                      onClick={() => addOption(qi)}
                      className="text-xs text-mustard-dark hover:underline dark:text-mustard"
                    >
                      + Add option
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addQuestion}
            className="text-sm text-mustard-dark hover:underline dark:text-mustard"
          >
            + Add question
          </button>

          <div>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create quiz"}
            </button>
          </div>
        </form>
      )}

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load quizzes.</p>}
      {!isLoading && !isError && quizzes.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No quizzes yet.</p>
      )}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {quizzes.map((q: any) => (
          <div key={q._id} className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-ink dark:text-parchment">{q.title}</p>
              <p className="text-sm text-ink/60 dark:text-parchment/60">
                {q.passingScore}% to pass · {q.maxAttempts} attempt{q.maxAttempts === 1 ? "" : "s"} ·{" "}
                {q.attemptCount} attempt{q.attemptCount === 1 ? "" : "s"} made
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/instructor/quizzes/${q._id}/attempts`}
                className="text-sm text-mustard-dark hover:underline dark:text-mustard"
              >
                Results
              </Link>
              <button onClick={() => deleteQuiz(q._id)} className="text-sm text-clay hover:underline">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
