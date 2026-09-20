"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CourseForm, { CourseFormValues } from "@/components/CourseForm";
import { useCreateCourseMutation } from "@/redux/features/courses/coursesApi";

export default function InstructorCreateCoursePage() {
  const router = useRouter();
  const [createCourse, { isLoading }] = useCreateCourseMutation();
  const [error, setError] = useState("");

  const handleSubmit = async (values: CourseFormValues) => {
    setError("");
    try {
      // The server always saves an instructor's new course as a Draft
      await createCourse(values).unwrap();
      router.push("/instructor");
    } catch (err: any) {
      setError(err?.data?.message || "Could not create the course");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">
        Create a course
      </h1>
      <p className="mt-2 text-sm text-ink/60 dark:text-parchment/60">
        New courses are saved as drafts. An admin publishes them.
      </p>
      {error && <p className="mt-3 text-sm text-clay">{error}</p>}
      <div className="mt-8">
        <CourseForm
          onSubmit={handleSubmit}
          isSubmitting={isLoading}
          submitLabel="Save draft"
          showStatus={false}
        />
      </div>
    </div>
  );
}
