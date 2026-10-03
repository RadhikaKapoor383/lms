"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import VideoPlayer from "@/components/VideoPlayer";
import { useAppSelector } from "@/hooks/redux";
import {
  useAddQuestionMutation,
  useGetCourseContentQuery,
} from "@/redux/features/courses/coursesApi";
import {
  useGetCourseProgressQuery,
  useUpdateLessonProgressMutation,
} from "@/redux/features/enrollment/enrollmentApi";

export default function CourseAccessPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const { user } = useAppSelector((state) => state.auth);
  const isStudent = user?.role === "student";

  const { data, isLoading, isError, error } = useGetCourseContentQuery(courseId);
  const [addQuestion, { isLoading: isAsking }] = useAddQuestionMutation();
  // Progress only exists for students - an admin/instructor previewing a
  // course has no enrollment record to track.
  const { data: progressData } = useGetCourseProgressQuery(courseId, { skip: !isStudent });
  const [updateLessonProgress, { isLoading: isMarking }] = useUpdateLessonProgressMutation();

  const [activeIndex, setActiveIndex] = useState(0);
  const [questionText, setQuestionText] = useState("");
  const [askError, setAskError] = useState("");
  const [askSuccess, setAskSuccess] = useState(false);

  const content = data?.content || [];
  const activeLesson = content[activeIndex];
  const completedLessonIds: string[] = progressData?.progress?.completedLessonIds || [];
  const completionPercentage = progressData?.progress?.completionPercentage || 0;
  const isActiveLessonDone = activeLesson && completedLessonIds.includes(activeLesson._id);

  const handleMarkComplete = () => {
    if (!activeLesson) return;
    updateLessonProgress({
      courseId,
      lessonId: activeLesson._id,
      completed: !isActiveLessonDone,
    });
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setAskError("");
    setAskSuccess(false);

    if (!questionText.trim()) return;

    try {
      await addQuestion({
        question: questionText,
        courseId,
        contentId: activeLesson._id,
      }).unwrap();
      setQuestionText("");
      setAskSuccess(true);
    } catch (err: any) {
      setAskError(err?.data?.message || "Could not submit your question");
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-4 flex justify-end gap-4">
          <Link
            href={`/course-access/${courseId}/assignments`}
            className="text-sm text-mustard-dark hover:underline dark:text-mustard"
          >
            View assignments →
          </Link>
          <Link
            href={`/course-access/${courseId}/quizzes`}
            className="text-sm text-mustard-dark hover:underline dark:text-mustard"
          >
            View quizzes →
          </Link>
        </div>
        {isLoading && <Loader />}

        {isError && (
          <p className="text-ink/60 dark:text-parchment/60">
            {(error as any)?.data?.message ||
              "You don't have access to this course — enroll first."}
          </p>
        )}

        {content.length > 0 && activeLesson && (
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            <div>
              <VideoPlayer videoUrl={activeLesson.videoUrl} />

              <div className="mt-6 flex items-center justify-between gap-4">
                <h1 className="font-display text-2xl text-ink dark:text-parchment">
                  {activeLesson.title}
                </h1>
                {isStudent && (
                  <button
                    onClick={handleMarkComplete}
                    disabled={isMarking}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60 ${
                      isActiveLessonDone
                        ? "bg-parchment-dark text-ink/70 dark:bg-ink-light dark:text-parchment/70"
                        : "bg-mustard text-ink hover:bg-mustard-dark"
                    }`}
                  >
                    {isActiveLessonDone ? "Completed ✓" : "Mark as complete"}
                  </button>
                )}
              </div>
              <p className="mt-2 text-ink/70 dark:text-parchment/70">
                {activeLesson.description}
              </p>

              <div className="mt-10 border-t border-parchment-dark pt-6 dark:border-ink-light">
                <h2 className="font-display text-xl text-ink dark:text-parchment">
                  Ask a question
                </h2>
                <form onSubmit={handleAskQuestion} className="mt-4 space-y-3">
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    rows={3}
                    placeholder="What's unclear about this lesson?"
                    className="w-full border border-parchment-dark bg-transparent p-3 outline-none focus:border-mustard dark:border-ink-light"
                  />
                  {askError && <p className="text-sm text-clay">{askError}</p>}
                  {askSuccess && (
                    <p className="text-sm text-ink-light dark:text-mustard">
                      Question submitted.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isAsking}
                    className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
                  >
                    {isAsking ? "Submitting..." : "Submit question"}
                  </button>
                </form>

                {activeLesson.questions?.length > 0 && (
                  <div className="mt-8 space-y-4">
                    {activeLesson.questions.map((q: any, i: number) => (
                      <div key={i} className="border-l-2 border-parchment-dark pl-4 dark:border-ink-light">
                        <p className="text-sm font-medium text-ink dark:text-parchment">
                          {q.user?.name || "Student"}
                        </p>
                        <p className="mt-1 text-ink/80 dark:text-parchment/80">{q.question}</p>
                        {q.questionReplies?.map((r: any, j: number) => (
                          <div key={j} className="mt-2 ml-4 border-l-2 border-mustard pl-4">
                            <p className="text-sm font-medium text-mustard-dark dark:text-mustard">
                              {r.user?.role === "admin" ? "Instructor" : r.user?.name}
                            </p>
                            <p className="mt-1 text-ink/80 dark:text-parchment/80">{r.answer}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg text-ink dark:text-parchment">
                  Lessons
                </h2>
                {isStudent && (
                  <span className="text-sm text-ink/50 dark:text-parchment/50">
                    {Math.round(completionPercentage)}%
                  </span>
                )}
              </div>
              {isStudent && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-parchment-dark dark:bg-ink">
                  <div
                    className="h-1.5 rounded-full bg-mustard"
                    style={{ width: `${Math.min(100, Math.max(0, completionPercentage))}%` }}
                  />
                </div>
              )}
              <ul className="mt-4 space-y-1">
                {content.map((lesson: any, i: number) => (
                  <li key={lesson._id}>
                    <button
                      onClick={() => setActiveIndex(i)}
                      className={`flex w-full items-center justify-between border-l-2 px-3 py-2 text-left text-sm ${
                        i === activeIndex
                          ? "border-mustard bg-parchment-dark/50 font-medium text-ink dark:bg-ink-light dark:text-parchment"
                          : "border-transparent text-ink/70 hover:border-parchment-dark dark:text-parchment/70"
                      }`}
                    >
                      <span>{i + 1}. {lesson.title}</span>
                      {isStudent && completedLessonIds.includes(lesson._id) && (
                        <span className="text-mustard-dark dark:text-mustard">✓</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
