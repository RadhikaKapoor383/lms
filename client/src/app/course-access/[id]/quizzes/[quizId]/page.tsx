"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import { useGetQuizQuery, useSubmitQuizAttemptMutation } from "@/redux/features/quizzes/quizzesApi";

export default function TakeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;
  const quizId = params?.quizId as string;

  const { data, isLoading, isError } = useGetQuizQuery(quizId);
  const [submitAttempt, { isLoading: isSubmitting }] = useSubmitQuizAttemptMutation();

  const quiz = data?.quiz;
  const [answers, setAnswers] = useState<Record<string, Set<number>>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const startedAtRef = useRef(new Date().toISOString());

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (quiz?.timeLimitMinutes) {
      setSecondsLeft(quiz.timeLimitMinutes * 60);
    }
  }, [quiz?.timeLimitMinutes]);

  const handleSubmit = async () => {
    setError("");
    try {
      const payload = Object.entries(answers).map(([questionId, selected]) => ({
        questionId,
        selectedOptionIndexes: [...selected],
      }));
      const res = await submitAttempt({
        quizId,
        answers: payload,
        startedAt: startedAtRef.current,
      }).unwrap();
      setResult(res);
    } catch (err: any) {
      setError(err?.data?.message || "Could not submit the quiz");
    }
  };

  // Auto-submit once time runs out
  useEffect(() => {
    if (secondsLeft === null || result) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, result]);

  const toggleOption = (questionId: string, optionIndex: number, type: string) => {
    setAnswers((prev) => {
      const current = new Set(prev[questionId] || []);
      if (type === "multiple") {
        current.has(optionIndex) ? current.delete(optionIndex) : current.add(optionIndex);
      } else {
        current.clear();
        current.add(optionIndex);
      }
      return { ...prev, [questionId]: current };
    });
  };

  const allAnswered = useMemo(
    () => !!quiz && quiz.questions.every((q: any) => (answers[q._id]?.size || 0) > 0),
    [quiz, answers]
  );

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (isLoading) return (<><Header /><main className="mx-auto max-w-3xl px-6 py-16"><Loader /></main><Footer /></>);
  if (isError || !quiz) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-ink/60 dark:text-parchment/60">
            Couldn&apos;t load this quiz - you may be out of attempts.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  if (result) {
    const attempt = result.attempt;
    return (
      <>
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          {"score" in attempt ? (
            <>
              <p className="font-display text-5xl text-ink dark:text-parchment">
                {Math.round(attempt.percentage)}%
              </p>
              <p
                className={`mt-2 text-lg ${attempt.passed ? "text-mustard-dark dark:text-mustard" : "text-clay"}`}
              >
                {attempt.passed ? "Passed" : "Not quite - you can review and retake if attempts remain"}
              </p>
              <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
                {attempt.score}/{attempt.totalMarks} marks
              </p>
            </>
          ) : (
            <p className="text-ink dark:text-parchment">
              Submitted! Your instructor will share results separately.
            </p>
          )}
          <Link
            href={`/course-access/${courseId}/quizzes`}
            className="mt-6 inline-block rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark"
          >
            Back to quizzes
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ink dark:text-parchment">{quiz.title}</h1>
          {secondsLeft !== null && (
            <span className="font-display text-xl text-clay">{formatTime(secondsLeft)}</span>
          )}
        </div>
        {quiz.description && (
          <p className="mt-2 text-ink/70 dark:text-parchment/70">{quiz.description}</p>
        )}

        <div className="mt-8 space-y-8">
          {quiz.questions.map((q: any, i: number) => (
            <div key={q._id}>
              <p className="font-medium text-ink dark:text-parchment">
                {i + 1}. {q.questionText}{" "}
                <span className="text-sm font-normal text-ink/50 dark:text-parchment/50">
                  ({q.marks} mark{q.marks === 1 ? "" : "s"})
                </span>
              </p>
              <div className="mt-3 space-y-2 pl-1">
                {q.options.map((o: any, oi: number) => (
                  <label key={o._id} className="flex items-center gap-2 text-ink/90 dark:text-parchment/90">
                    <input
                      type={q.type === "multiple" ? "checkbox" : "radio"}
                      name={`q-${q._id}`}
                      checked={answers[q._id]?.has(oi) || false}
                      onChange={() => toggleOption(q._id, oi, q.type)}
                    />
                    {o.text}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-clay">{error}</p>}
        {!allAnswered && (
          <p className="mt-4 text-sm text-ink/50 dark:text-parchment/50">
            Answer every question before submitting.
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!allAnswered || isSubmitting}
          className="mt-6 rounded-full bg-mustard px-6 py-3 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Submit quiz"}
        </button>
      </main>
      <Footer />
    </>
  );
}
