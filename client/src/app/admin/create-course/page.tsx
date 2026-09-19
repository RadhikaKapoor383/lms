"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CourseForm, { CourseFormValues } from "@/components/CourseForm";
import { useCreateCourseMutation } from "@/redux/features/courses/coursesApi";

export default function CreateCoursePage() {
  const router = useRouter();
  const [createCourse, { isLoading }] = useCreateCourseMutation();
  const [error, setError] = useState("");

  const handleSubmit = async (values: CourseFormValues) => {
    setError("");
    try {
      await createCourse(values).unwrap();
      router.push("/admin/all-courses");
    } catch (err: any) {
      setError(err?.data?.message || "Could not create the course");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">
        Create a course
      </h1>
      {error && <p className="mt-3 text-sm text-clay">{error}</p>}
      <div className="mt-8">
        <CourseForm onSubmit={handleSubmit} isSubmitting={isLoading} />
      </div>
    </div>
  );
}