"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import { useGetCourseDetailsQuery } from "@/redux/features/courses/coursesApi";
import { useCreateOrderMutation } from "@/redux/features/orders/ordersApi";
import { useAppSelector } from "@/hooks/redux";

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { user } = useAppSelector((state) => state.auth);
  const { data, isLoading, isError } = useGetCourseDetailsQuery(id);
  const [createOrder, { isLoading: isEnrolling }] = useCreateOrderMutation();
  const [enrollError, setEnrollError] = useState("");

  const course = data?.course;

  const alreadyOwned = user?.courses?.some(
    (c: any) => c.courseId?.toString() === id
  );

  const handleEnroll = async () => {
    setEnrollError("");

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      // No payment gateway wired up yet - this grants access directly.
      // Swap this for a real Stripe confirmation before going live.
      await createOrder({ courseId: id, payment_info: {} }).unwrap();
      router.push(`/course-access/${id}`);
    } catch (err: any) {
      setEnrollError(err?.data?.message || "Could not complete enrollment");
    }
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
            </p>
            <h1 className="mt-3 font-display text-4xl text-ink dark:text-parchment">
              {course.name}
            </h1>
            <p className="mt-6 max-w-prose text-ink/80 dark:text-parchment/80">
              {course.description}
            </p>

            <div className="mt-10 border-y border-parchment-dark py-6 dark:border-ink-light">
              <div className="flex items-center gap-6">
                <span className="font-display text-3xl text-ink dark:text-parchment">
                  ${course.price}
                </span>
                {course.estimatedPrice && (
                  <span className="text-ink/40 line-through dark:text-parchment/40">
                    ${course.estimatedPrice}
                  </span>
                )}

                {alreadyOwned ? (
                  <button
                    onClick={() => router.push(`/course-access/${id}`)}
                    className="ml-auto rounded-full bg-ink px-6 py-3 font-medium text-parchment hover:bg-ink-light dark:bg-parchment dark:text-ink"
                  >
                    Go to course
                  </button>
                ) : (
                  <button
                    onClick={handleEnroll}
                    disabled={isEnrolling}
                    className="ml-auto rounded-full bg-mustard px-6 py-3 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
                  >
                    {isEnrolling ? "Enrolling..." : "Enroll now"}
                  </button>
                )}
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
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
