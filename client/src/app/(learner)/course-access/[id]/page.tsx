"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Loader from "@/components/Loader";
import VideoPlayer from "@/components/VideoPlayer";
import { useAppSelector } from "@/hooks/redux";
import { useGetCertificateStatusQuery } from "@/redux/features/certificates/certificatesApi";
import ReviewForm from "@/components/ReviewForm";
import LessonFiles from "@/components/LessonFiles";
import { pendingSteps } from "@/utils/certificateProgress";
import { useGetCourseContentQuery } from "@/redux/features/courses/coursesApi";
import LessonDiscussions from "@/components/LessonDiscussions";
import LessonLedger from "@/components/ledger/LessonLedger";
import ContinueCard from "@/components/ledger/ContinueCard";
import { nextLessonIndex } from "@/utils/ledger";
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
  // Progress only exists for students - an admin/instructor previewing a
  // course has no enrollment record to track.
  const { data: progressData } = useGetCourseProgressQuery(courseId, { skip: !isStudent });
  const [updateLessonProgress, { isLoading: isMarking }] = useUpdateLessonProgressMutation();
  // Also issues the certificate on the spot if the student already qualifies.
  const { data: certData } = useGetCertificateStatusQuery(courseId, { skip: !isStudent });
  const certStatus = certData?.status;

  const [activeIndex, setActiveIndex] = useState(0);

  const content = data?.content || [];
  const activeLesson = content[activeIndex];
  const completedLessonIds: string[] = progressData?.progress?.completedLessonIds || [];
  const completionPercentage = progressData?.progress?.completionPercentage || 0;
  const isActiveLessonDone = activeLesson && completedLessonIds.includes(activeLesson._id);

  const nextIndex = nextLessonIndex(content, completedLessonIds);
  const doneCount = content.filter((l: any) => completedLessonIds.includes(l._id)).length;
  // jump to the next lesson not finished, and back up to the video
  const handleContinue = () => {
    if (nextIndex < 0) return;
    setActiveIndex(nextIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMarkComplete = () => {
    if (!activeLesson) return;
    updateLessonProgress({
      courseId,
      lessonId: activeLesson._id,
      completed: !isActiveLessonDone,
    });
  };

  return (
    <>
      <main className={`mx-auto max-w-6xl px-6 py-10 ${isStudent && nextIndex >= 0 ? "pb-28 lg:pb-10" : ""}`}>
        <div className="mb-4 flex justify-end gap-4">
          <Link
            href={`/course-access/${courseId}/discussions`}
            className="text-sm text-mustard-dark hover:underline dark:text-mustard"
          >
            Discussions →
          </Link>
          <Link
            href={`/course-access/${courseId}/announcements`}
            className="text-sm text-mustard-dark hover:underline dark:text-mustard"
          >
            Announcements →
          </Link>
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
          <Link
            href={`/course-access/${courseId}/materials`}
            className="text-sm text-mustard-dark hover:underline dark:text-mustard"
          >
            Materials →
          </Link>
        </div>
        {isStudent && certStatus && (
          <div className="mb-6 border border-parchment-dark p-4 text-sm dark:border-ink-light">
            {certStatus.certificate ? (
              <p className="text-ink dark:text-parchment">
                {certStatus.certificate.status === "valid"
                  ? "🎓 You earned a certificate for this course. "
                  : "Your certificate for this course was revoked. "}
                <Link
                  href={`/certificates/${certStatus.certificate.certificateId}`}
                  className="text-mustard-dark underline dark:text-mustard"
                >
                  View certificate
                </Link>
              </p>
            ) : pendingSteps(certStatus).length === 0 ? (
              <p className="text-ink dark:text-parchment">
                You&apos;ve done everything this course asks. Your certificate appears here shortly.
              </p>
            ) : (
              <div className="text-ink dark:text-parchment">
                <p>To earn the certificate for this course:</p>
                <ul className="mt-1 list-disc pl-5 text-ink/70 dark:text-parchment/70">
                  {pendingSteps(certStatus).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

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
              <VideoPlayer
                videoUrl={activeLesson.videoUrl}
                courseId={courseId}
                lessonId={activeLesson._id}
                hasVideoUpload={activeLesson.hasVideoUpload}
              />

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

              <LessonFiles courseId={courseId} lessonId={activeLesson._id} />

              <LessonDiscussions courseId={courseId} lessonId={activeLesson._id} />
            </div>

            <aside className="space-y-6">
              {isStudent && (
                <ContinueCard
                  percent={completionPercentage}
                  doneCount={doneCount}
                  total={content.length}
                  nextTitle={nextIndex >= 0 ? content[nextIndex].title : undefined}
                  onContinue={handleContinue}
                />
              )}
              <div>
                <h2 className="mb-3 font-display text-lg text-ink dark:text-parchment">Lessons</h2>
                <LessonLedger
                  lessons={content}
                  activeIndex={activeIndex}
                  completedIds={completedLessonIds}
                  showProgress={isStudent}
                  onSelect={setActiveIndex}
                />
              </div>
            </aside>
          </div>
        )}
        {isStudent && <ReviewForm courseId={courseId} />}
      </main>

      {/* On a phone the lesson list sits far below the video, so "Continue" stays in reach */}
      {isStudent && nextIndex >= 0 && content.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-parchment-dark bg-parchment/95 px-4 py-3 backdrop-blur dark:border-ink-light dark:bg-ink/95 lg:hidden">
          <button
            type="button"
            onClick={handleContinue}
            className="w-full rounded-full bg-mustard px-5 py-3 text-sm font-medium text-ink"
          >
            Continue: {content[nextIndex].title}
          </button>
        </div>
      )}
    </>
  );
}
