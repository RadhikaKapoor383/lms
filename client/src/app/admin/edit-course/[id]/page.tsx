"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Loader from "@/components/Loader";
import CourseForm, { CourseFormValues } from "@/components/CourseForm";
import {
  useEditCourseMutation,
  useGetAdminAllCoursesQuery,
} from "@/redux/features/courses/coursesApi";

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // Reuses the admin list query (cached) rather than adding another endpoint
  const { data, isLoading } = useGetAdminAllCoursesQuery(undefined);
  const [editCourse, { isLoading: isSaving }] = useEditCourseMutation();
  const [error, setError] = useState("");

  const course = data?.courses?.find((c: any) => c._id === id);

  const handleSubmit = async (values: CourseFormValues) => {
    setError("");
    try {
      // if the thumbnail wasn't replaced, don't send the old {public_id,url}
      // object back through the base64-upload code path on the backend
      const payload: any = { ...values };
      if (typeof payload.thumbnail === "string" && !payload.thumbnail.startsWith("data:")) {
        delete payload.thumbnail;
      }
      await editCourse({ id, data: payload }).unwrap();
      router.push("/admin/all-courses");
    } catch (err: any) {
      setError(err?.data?.message || "Could not save changes");
    }
  };

  if (isLoading) return <Loader />;
  if (!course) {
    return (
      <p className="text-ink/60 dark:text-parchment/60">Course not found.</p>
    );
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
        />
      </div>
    </div>
  );
}