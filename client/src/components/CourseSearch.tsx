"use client";

import { useEffect, useMemo, useState } from "react";
import CourseCard from "./CourseCard";
import Loader from "./Loader";
import { useGetCourseFiltersQuery, useSearchCoursesQuery } from "@/redux/features/courses/coursesApi";

const DURATION_LABELS: Record<string, string> = {
  short: "Under 2 hours",
  medium: "2 to 10 hours",
  long: "Over 10 hours",
};
const ENROLLMENT_LABELS: Record<string, string> = {
  open: "Open enrollment",
  code: "Needs an enrollment code",
  manual: "Enrolled by the instructor",
};
const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  rating: "Highest rated",
  popular: "Most popular",
  name: "Name (A to Z)",
};

const EMPTY = { category: "", level: "", instructor: "", duration: "", enrollment: "" };

const selectClass =
  "border border-parchment-dark bg-transparent px-3 py-2 text-sm text-ink dark:border-ink-light dark:text-parchment";

export default function CourseSearch() {
  const [text, setText] = useState("");
  const [q, setQ] = useState(""); // `text`, once the person has stopped typing
  const [filters, setFilters] = useState(EMPTY);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  // wait for a pause in typing so each keystroke isn't its own request
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(text.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [text]);

  const setFilter = (key: keyof typeof EMPTY, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1); // a different filter means a different list: start at its first page
  };

  // only the filters that are actually set go in the URL
  const params = useMemo(() => {
    const p: Record<string, string> = { sort, page: String(page), limit: "12" };
    if (q) p.q = q;
    (Object.keys(EMPTY) as (keyof typeof EMPTY)[]).forEach((k) => {
      if (filters[k]) p[k] = filters[k];
    });
    return p;
  }, [q, filters, sort, page]);

  const { data, isFetching, isError, error } = useSearchCoursesQuery(params);
  const { data: options } = useGetCourseFiltersQuery(undefined);

  const courses: any[] = data?.courses || [];
  const totalPages: number = data?.totalPages || 1;
  const anyFilter = !!q || Object.values(filters).some(Boolean);

  const clear = () => {
    setText("");
    setQ("");
    setFilters(EMPTY);
    setPage(1);
  };

  return (
    <div>
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search courses by name or topic…"
        aria-label="Search courses"
        maxLength={100}
        className="w-full border border-parchment-dark bg-transparent px-4 py-3 outline-none focus:border-mustard dark:border-ink-light"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select aria-label="Category" value={filters.category} onChange={(e) => setFilter("category", e.target.value)} className={selectClass}>
          <option value="">All categories</option>
          {(options?.categories || []).map((c: any) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <select aria-label="Level" value={filters.level} onChange={(e) => setFilter("level", e.target.value)} className={selectClass}>
          <option value="">Any level</option>
          {(options?.levels || []).map((l: string) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <select aria-label="Instructor" value={filters.instructor} onChange={(e) => setFilter("instructor", e.target.value)} className={selectClass}>
          <option value="">Any instructor</option>
          {(options?.instructors || []).map((i: any) => (
            <option key={i._id} value={i._id}>
              {i.name}
            </option>
          ))}
        </select>

        <select aria-label="Duration" value={filters.duration} onChange={(e) => setFilter("duration", e.target.value)} className={selectClass}>
          <option value="">Any length</option>
          {(options?.durations || []).map((d: string) => (
            <option key={d} value={d}>
              {DURATION_LABELS[d] || d}
            </option>
          ))}
        </select>

        <select aria-label="Enrollment" value={filters.enrollment} onChange={(e) => setFilter("enrollment", e.target.value)} className={selectClass}>
          <option value="">Any enrollment</option>
          {Object.entries(ENROLLMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort by"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className={`${selectClass} ml-auto`}
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-ink/60 dark:text-parchment/60">
        <p>{data ? `${data.total} course${data.total === 1 ? "" : "s"} found` : "\u00A0"}</p>
        {anyFilter && (
          <button onClick={clear} className="text-mustard-dark hover:underline dark:text-mustard">
            Clear all
          </button>
        )}
      </div>

      <div className="mt-6">
        {isFetching && !data && <Loader />}
        {isError && (
          <p className="text-ink/60 dark:text-parchment/60">
            {(error as any)?.data?.message || "Couldn't load courses right now."}
          </p>
        )}
        {!isError && data && courses.length === 0 && (
          <p className="text-ink/60 dark:text-parchment/60">
            {anyFilter ? "No courses match those filters." : "No courses published yet. Check back soon."}
          </p>
        )}

        {/* dimmed, not blanked, while the next result loads, so the page doesn't jump */}
        <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${isFetching && data ? "opacity-60" : ""}`}>
          {courses.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-6 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full border border-parchment-dark px-4 py-1.5 text-ink hover:border-mustard disabled:opacity-40 dark:border-ink-light dark:text-parchment"
            >
              Previous
            </button>
            <span className="text-ink/70 dark:text-parchment/70">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-full border border-parchment-dark px-4 py-1.5 text-ink hover:border-mustard disabled:opacity-40 dark:border-ink-light dark:text-parchment"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
