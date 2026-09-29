"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Loader from "@/components/Loader";
import CourseForm, { CourseFormValues } from "@/components/CourseForm";
import {
  useEditCourseMutation,
  useGetCourseForEditQuery,
} from "@/redux/features/courses/coursesApi";

export default function InstructorEditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // The server (authorizeCourseOwner) refuses this if the course isn't
  // this instructor's own, which surfaces here as isError.
  const { data, isLoading, isError } = useGetCourseForEditQuery(id);
  const [editCourse, { isLoading: isSaving }] = useEditCourseMutation();
  const [error, setError] = useState("");

  const course = data?.course;

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
  if (isError || !course) {
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
            category: course.category?._id || course.category || "",
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
