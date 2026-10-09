"use client";

import StarRating from "@/components/StarRating";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import { useGetCourseDetailsQuery } from "@/redux/features/courses/coursesApi";
import { useCreateOrderMutation } from "@/redux/features/orders/ordersApi";
import {
  useEnrollInFreeCourseMutation,
  useEnrollWithCodeMutation,
} from "@/redux/features/enrollment/enrollmentApi";
import { useAppSelector } from "@/hooks/redux";

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { user } = useAppSelector((state) => state.auth);
  const { data, isLoading, isError } = useGetCourseDetailsQuery(id);
  const [enrollFree, { isLoading: isEnrollingFree }] = useEnrollInFreeCourseMutation();
  const [createOrder, { isLoading: isPurchasing }] = useCreateOrderMutation();
  const [enrollWithCode, { isLoading: isRedeeming }] = useEnrollWithCodeMutation();

  const [code, setCode] = useState("");
  const [enrollError, setEnrollError] = useState("");

  const course = data?.course;
  const isBusy = isEnrollingFree || isPurchasing || isRedeeming;

  // user.courses stays in sync with Enrollment on the server (see
  // enrollment.service.ts), so this is a fast, no-extra-request access check.
  const alreadyOwned = user?.courses?.some(
    (c: any) => c.courseId?.toString() === id
  );

  const goToCourse = () => router.push(`/course-access/${id}`);

  const handleFreeEnroll = async () => {
    setEnrollError("");
    if (!user) return router.push("/login");
    try {
      await enrollFree(id).unwrap();
      goToCourse();
    } catch (err: any) {
      setEnrollError(err?.data?.message || "Could not enroll");
    }
  };

  const handlePurchase = async () => {
    setEnrollError("");
    if (!user) return router.push("/login");
    try {
      // No real payment gateway yet - the server simulates a successful
      // charge and enrolls immediately. See order.controller.ts.
      await createOrder({ courseId: id, payment_info: {} }).unwrap();
      goToCourse();
    } catch (err: any) {
      setEnrollError(err?.data?.message || "Could not complete purchase");
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError("");
    if (!user) return router.push("/login");
    try {
      await enrollWithCode({ courseId: id, code }).unwrap();
      goToCourse();
    } catch (err: any) {
      setEnrollError(err?.data?.message || "Invalid course or enrollment code");
    }
  };

  const renderCta = () => {
    if (alreadyOwned) {
      return (
        <button
          onClick={goToCourse}
          className="ml-auto rounded-full bg-ink px-6 py-3 font-medium text-parchment hover:bg-ink-light dark:bg-parchment dark:text-ink"
        >
          Go to course
        </button>
      );
    }

    if (course.enrollmentMode === "manual") {
      return (
        <p className="ml-auto text-sm text-ink/60 dark:text-parchment/60">
          Seats for this course are added by the instructor. Ask them for access.
        </p>
      );
    }

    if (course.enrollmentMode === "code") {
      return (
        <form onSubmit={handleCodeSubmit} className="ml-auto flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enrollment code"
            className="border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
          />
          <button
            type="submit"
            disabled={isBusy || !code.trim()}
            className="rounded-full bg-mustard px-5 py-2.5 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
          >
            {isRedeeming ? "Checking..." : "Redeem"}
          </button>
        </form>
      );
    }

    // enrollmentMode === "open"
    if (course.price > 0) {
      return (
        <button
          onClick={handlePurchase}
          disabled={isBusy}
          className="ml-auto rounded-full bg-mustard px-6 py-3 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
        >
          {isPurchasing ? "Processing..." : `Buy for $${course.price}`}
        </button>
      );
    }

    return (
      <button
        onClick={handleFreeEnroll}
        disabled={isBusy}
        className="ml-auto rounded-full bg-mustard px-6 py-3 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
      >
        {isEnrollingFree ? "Enrolling..." : "Enroll for free"}
      </button>
    );
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16">
        {isLoading && <Loader />}

        {isError && (
          <p className="text-ink/60 dark:text-parchment/60">
            Couldn&apos;t load this course.
          </p>
        )}

        {course && (
          <>
            <p className="text-sm uppercase tracking-wide text-clay">
              {course.category?.name} · {course.level}
              {course.durationHours ? ` · ${course.durationHours} hours` : ""}
            </p>
            <h1 className="mt-3 font-display text-4xl text-ink dark:text-parchment">
              {course.name}
            </h1>
            <p className="mt-6 max-w-prose text-ink/80 dark:text-parchment/80">
              {course.description}
            </p>

            <div className="mt-10 border-y border-parchment-dark py-6 dark:border-ink-light">
              <div className="flex flex-wrap items-center gap-6">
                <span className="font-display text-3xl text-ink dark:text-parchment">
                  ${course.price}
                </span>
                {course.estimatedPrice && (
                  <span className="text-ink/40 line-through dark:text-parchment/40">
                    ${course.estimatedPrice}
                  </span>
                )}

                {renderCta()}
              </div>
              {enrollError && <p className="mt-3 text-sm text-clay">{enrollError}</p>}
            </div>

            {course.benefits?.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-2xl text-ink dark:text-parchment">
                  What you&apos;ll get
                </h2>
                <ul className="mt-4 space-y-2">
                  {course.benefits.map((b: any, i: number) => (
                    <li key={i} className="text-ink/80 dark:text-parchment/80">
                      — {b.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {course.prerequisites?.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-2xl text-ink dark:text-parchment">
                  Before you start
                </h2>
                <ul className="mt-4 space-y-2">
                  {course.prerequisites.map((p: any, i: number) => (
                    <li key={i} className="text-ink/80 dark:text-parchment/80">
                      — {p.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-10">
              <h2 className="font-display text-2xl text-ink dark:text-parchment">Reviews</h2>
              {(course.reviews || []).length === 0 ? (
                <p className="mt-3 text-ink/60 dark:text-parchment/60">No reviews yet.</p>
              ) : (
                <>
                  <p className="mt-2 flex items-center gap-2 text-ink/70 dark:text-parchment/70">
                    <StarRating value={course.ratings || 0} />
                    {course.ratings || 0} out of 5 · {course.reviews.length}{" "}
                    {course.reviews.length === 1 ? "review" : "reviews"}
                  </p>
                  <div className="mt-4 divide-y divide-parchment-dark dark:divide-ink-light">
                    {course.reviews.map((r: any) => (
                      <div key={r._id} className="py-4">
                        <div className="flex items-center gap-3">
                          <StarRating value={r.rating} size="text-base" />
                          <p className="text-sm font-medium text-ink dark:text-parchment">
                            {r.user?.name || "Student"}
                          </p>
                        </div>
                        {r.comment && (
                          <p className="mt-1 whitespace-pre-line text-ink/80 dark:text-parchment/80">
                            {r.comment}
                          </p>
                        )}
                        {(r.commentReplies || []).map((c: any, i: number) => (
                          <p
                            key={i}
                            className="mt-2 border-l-2 border-mustard pl-3 text-sm text-ink/70 dark:text-parchment/70"
                          >
                            <span className="font-medium">{c.user?.name}:</span> {c.comment}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
