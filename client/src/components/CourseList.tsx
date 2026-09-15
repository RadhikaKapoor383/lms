"use client";

import { useGetAllCoursesQuery } from "@/redux/features/courses/coursesApi";
import CourseCard from "./CourseCard";
import Loader from "./Loader";

export default function CourseList() {
  const { data, isLoading, isError } = useGetAllCoursesQuery(undefined);

  if (isLoading) return <Loader />;

  if (isError) {
    return (
      <p className="text-ink/60 dark:text-parchment/60">
        Couldn&apos;t load courses right now. Is the backend running?
      </p>
    );
  }

  const courses = data?.courses || [];

  if (courses.length === 0) {
    return (
      <p className="text-ink/60 dark:text-parchment/60">
        No courses published yet — check back soon.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course: any) => (
        <CourseCard key={course._id} course={course} />
      ))}
    </div>
  );
}
