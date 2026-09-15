"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import VideoPlayer from "@/components/VideoPlayer";
import {
  useAddQuestionMutation,
  useGetCourseContentQuery,
} from "@/redux/features/courses/coursesApi";

export default function CourseAccessPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const { data, isLoading, isError, error } = useGetCourseContentQuery(courseId);
  const [addQuestion, { isLoading: isAsking }] = useAddQuestionMutation();

  const [activeIndex, setActiveIndex] = useState(0);
  const [questionText, setQuestionText] = useState("");
  const [askError, setAskError] = useState("");
  const [askSuccess, setAskSuccess] = useState(false);

  const content = data?.content || [];
  const activeLesson = content[activeIndex];

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

              <h1 className="mt-6 font-display text-2xl text-ink dark:text-parchment">
                {activeLesson.title}
              </h1>
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
              <h2 className="font-display text-lg text-ink dark:text-parchment">
                Lessons
              </h2>
              <ul className="mt-4 space-y-1">
                {content.map((lesson: any, i: number) => (
                  <li key={lesson._id}>
                    <button
                      onClick={() => setActiveIndex(i)}
                      className={`w-full border-l-2 px-3 py-2 text-left text-sm ${
                        i === activeIndex
                          ? "border-mustard bg-parchment-dark/50 font-medium text-ink dark:bg-ink-light dark:text-parchment"
                          : "border-transparent text-ink/70 hover:border-parchment-dark dark:text-parchment/70"
                      }`}
                    >
                      {i + 1}. {lesson.title}
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
