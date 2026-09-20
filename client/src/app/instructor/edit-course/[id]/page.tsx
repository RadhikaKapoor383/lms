"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Loader from "@/components/Loader";
import CourseForm, { CourseFormValues } from "@/components/CourseForm";
import {
  useEditCourseMutation,
  useGetInstructorCoursesQuery,
} from "@/redux/features/courses/coursesApi";

export default function InstructorEditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // Only this instructor's own courses come back, so a course that isn't
  // theirs simply won't be found here (the server also blocks the edit itself).
  const { data, isLoading } = useGetInstructorCoursesQuery(undefined);
  const [editCourse, { isLoading: isSaving }] = useEditCourseMutation();
  const [error, setError] = useState("");

  const course = data?.courses?.find((c: any) => c._id === id);

  const handleSubmit = async (values: CourseFormValues) => {
    setError("");
    try {
      const payload: any = { ...values };
      if (typeof payload.thumbnail === "string" && !payload.thumbnail.startsWith("data:")) {
        delete payload.thumbnail;
      }
      await editCourse({ id, data: payload }).unwrap();
      router.push("/instructor");
    } catch (err: any) {
      setError(err?.data?.message || "Could not save changes");
    }
  };

  if (isLoading) return <Loader />;
  if (!course) {
    return <p className="text-ink/60 dark:text-parchment/60">Course not found.</p>;
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">
        Edit course
      </h1>
      {error && <p className="mt-3 text-sm text-clay">{error}</p>}
      <div className="mt-8">
        <CourseForm
          initialValues={{
            ...course,
            thumbnail: course.thumbnail?.url || "",
          }}
          onSubmit={handleSubmit}
          isSubmitting={isSaving}
          submitLabel="Save changes"
          showStatus={false}
        />
      </div>
    </div>
  );
}
