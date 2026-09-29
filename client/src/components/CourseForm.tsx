"use client";

import { useState } from "react";
import { useGetCategoriesQuery } from "@/redux/features/categories/categoriesApi";

type Benefit = { title: string };
type Link = { title: string; url: string };
type Lesson = {
  // Present when this lesson already exists on the server - keep it as-is
  // when editing so the server can match it back to the same Lesson document
  // (and the progress students have already recorded against it). Omitted
  // for a lesson the instructor just added, which tells the server to create
  // a fresh one.
  _id?: string;
  title: string;
  description: string;
  videoUrl: string;
  videoSection: string;
  videoLength: number;
  links: Link[];
};

export type CourseFormValues = {
  name: string;
  description: string;
  price: number;
  estimatedPrice: number;
  category: string; // Category._id
  enrollmentMode: "open" | "manual" | "code";
  // Only sent when set to a non-empty value (a new code, or changing one).
  // Leaving it blank on edit keeps whatever code is already saved.
  enrollmentCode: string;
  level: string;
  demoUrl: string;
  thumbnail: string; // base64 on create, existing URL on edit unless replaced
  benefits: Benefit[];
  prerequisites: Benefit[];
  courseData: Lesson[];
  status: string;
};

export const COURSE_STATUSES = [
  "Draft",
  "Pending Approval",
  "Published",
  "Rejected",
  "Archived",
];

const emptyLesson: Lesson = {
  title: "",
  description: "",
  videoUrl: "",
  videoSection: "Introduction",
  videoLength: 0,
  links: [],
};

export default function CourseForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel = "Publish course",
  showStatus = true,
}: {
  initialValues?: Partial<CourseFormValues>;
  onSubmit: (values: CourseFormValues) => void;
  isSubmitting: boolean;
  submitLabel?: string;
  // Instructors don't control status (admin approves), so their pages hide it
  showStatus?: boolean;
}) {
  const { data: categoriesData, isLoading: categoriesLoading } = useGetCategoriesQuery(undefined);
  const categories = categoriesData?.categories || [];

  const [values, setValues] = useState<CourseFormValues>({
    name: initialValues?.name || "",
    description: initialValues?.description || "",
    price: initialValues?.price || 0,
    estimatedPrice: initialValues?.estimatedPrice || 0,
    category: initialValues?.category || "",
    enrollmentMode: initialValues?.enrollmentMode || "open",
    enrollmentCode: "",
    level: initialValues?.level || "Beginner",
    demoUrl: initialValues?.demoUrl || "",
    thumbnail: initialValues?.thumbnail || "",
    benefits: initialValues?.benefits?.length ? initialValues.benefits : [{ title: "" }],
    prerequisites: initialValues?.prerequisites?.length
      ? initialValues.prerequisites
      : [{ title: "" }],
    courseData: initialValues?.courseData?.length
      ? initialValues.courseData
      : [{ ...emptyLesson }],
    status: initialValues?.status || "Draft",
  });

  const [thumbnailPreview, setThumbnailPreview] = useState(
    initialValues?.thumbnail || ""
  );

  const inputClass =
    "mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light";
  const labelClass = "text-sm text-ink/70 dark:text-parchment/70";

  const handleThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setValues((v) => ({ ...v, thumbnail: base64 }));
      setThumbnailPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const updateBenefit = (
    key: "benefits" | "prerequisites",
    index: number,
    title: string
  ) => {
    setValues((v) => {
      const next = [...v[key]];
      next[index] = { title };
      return { ...v, [key]: next };
    });
  };

  const addBenefit = (key: "benefits" | "prerequisites") =>
    setValues((v) => ({ ...v, [key]: [...v[key], { title: "" }] }));

  const removeBenefit = (key: "benefits" | "prerequisites", index: number) =>
    setValues((v) => ({ ...v, [key]: v[key].filter((_, i) => i !== index) }));

  const updateLesson = (index: number, patch: Partial<Lesson>) =>
    setValues((v) => {
      const next = [...v.courseData];
      next[index] = { ...next[index], ...patch };
      return { ...v, courseData: next };
    });

  const addLesson = () =>
    setValues((v) => ({ ...v, courseData: [...v.courseData, { ...emptyLesson }] }));

  const removeLesson = (index: number) =>
    setValues((v) => ({
      ...v,
      courseData: v.courseData.filter((_, i) => i !== index),
    }));

  const addLink = (lessonIndex: number) =>
    setValues((v) => {
      const next = [...v.courseData];
      next[lessonIndex] = {
        ...next[lessonIndex],
        links: [...next[lessonIndex].links, { title: "", url: "" }],
      };
      return { ...v, courseData: next };
    });

  const updateLink = (lessonIndex: number, linkIndex: number, patch: Partial<Link>) =>
    setValues((v) => {
      const next = [...v.courseData];
      const links = [...next[lessonIndex].links];
      links[linkIndex] = { ...links[linkIndex], ...patch };
      next[lessonIndex] = { ...next[lessonIndex], links };
      return { ...v, courseData: next };
    });

  const removeLink = (lessonIndex: number, linkIndex: number) =>
    setValues((v) => {
      const next = [...v.courseData];
      next[lessonIndex] = {
        ...next[lessonIndex],
        links: next[lessonIndex].links.filter((_, i) => i !== linkIndex),
      };
      return { ...v, courseData: next };
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Basic info */}
      <section className="space-y-5">
        <h2 className="font-display text-xl text-ink dark:text-parchment">
          Course info
        </h2>

        <div>
          <label className={labelClass}>Name</label>
          <input
            required
            className={inputClass}
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            required
            rows={4}
            className={inputClass}
            value={values.description}
            onChange={(e) =>
              setValues((v) => ({ ...v, description: e.target.value }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Price ($)</label>
            <input
              required
              type="number"
              min={0}
              className={inputClass}
              value={values.price}
              onChange={(e) =>
                setValues((v) => ({ ...v, price: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <label className={labelClass}>Estimated price ($, optional)</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={values.estimatedPrice}
              onChange={(e) =>
                setValues((v) => ({ ...v, estimatedPrice: Number(e.target.value) }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Who can enroll</label>
            <select
              className={inputClass}
              value={values.enrollmentMode}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  enrollmentMode: e.target.value as CourseFormValues["enrollmentMode"],
                }))
              }
            >
              <option value="open">Open — students enroll or buy it themselves</option>
              <option value="manual">Private — only the instructor adds students</option>
              <option value="code">Invite code — students need a code to join</option>
            </select>
          </div>
          {values.enrollmentMode === "code" && (
            <div>
              <label className={labelClass}>
                Enrollment code{initialValues?.enrollmentMode === "code" ? " (leave blank to keep the current one)" : ""}
              </label>
              <input
                className={inputClass}
                value={values.enrollmentCode}
                onChange={(e) => setValues((v) => ({ ...v, enrollmentCode: e.target.value }))}
                placeholder="At least 6 characters"
                minLength={6}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Category</label>
            <select
              required
              className={inputClass}
              value={values.category}
              onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
            >
              <option value="" disabled>
                {categoriesLoading ? "Loading..." : "Select a category"}
              </option>
              {categories.map((c: any) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            {!categoriesLoading && categories.length === 0 && (
              <p className="mt-1 text-xs text-clay">
                No categories yet - ask an admin to add one.
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Level</label>
            <select
              className={inputClass}
              value={values.level}
              onChange={(e) => setValues((v) => ({ ...v, level: e.target.value }))}
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
        </div>

        {showStatus && (
          <div>
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={values.status}
              onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))}
            >
              {COURSE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink/50 dark:text-parchment/50">
              Only courses set to &quot;Published&quot; are visible to students.
            </p>
          </div>
        )}

        <div>
          <label className={labelClass}>
            Demo video URL (embeddable link or direct file)
          </label>
          <input
            required
            className={inputClass}
            value={values.demoUrl}
            onChange={(e) => setValues((v) => ({ ...v, demoUrl: e.target.value }))}
          />
        </div>

        <div>
          <label className={labelClass}>Thumbnail</label>
          <input type="file" accept="image/*" onChange={handleThumbnail} className="mt-1 block" />
          {thumbnailPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailPreview}
              alt="Thumbnail preview"
              className="mt-3 h-32 w-auto border border-parchment-dark object-cover dark:border-ink-light"
            />
          )}
        </div>
      </section>

      {/* Benefits */}
      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink dark:text-parchment">
          What students get
        </h2>
        {values.benefits.map((b, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={inputClass}
              value={b.title}
              onChange={(e) => updateBenefit("benefits", i, e.target.value)}
              placeholder="e.g. Lifetime access"
            />
            <button
              type="button"
              onClick={() => removeBenefit("benefits", i)}
              className="px-3 text-clay"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addBenefit("benefits")}
          className="text-sm text-mustard-dark hover:underline dark:text-mustard"
        >
          + Add benefit
        </button>
      </section>

      {/* Prerequisites */}
      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink dark:text-parchment">
          Prerequisites
        </h2>
        {values.prerequisites.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={inputClass}
              value={p.title}
              onChange={(e) => updateBenefit("prerequisites", i, e.target.value)}
              placeholder="e.g. Basic JavaScript"
            />
            <button
              type="button"
              onClick={() => removeBenefit("prerequisites", i)}
              className="px-3 text-clay"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addBenefit("prerequisites")}
          className="text-sm text-mustard-dark hover:underline dark:text-mustard"
        >
          + Add prerequisite
        </button>
      </section>

      {/* Lessons / course content */}
      <section className="space-y-6">
        <h2 className="font-display text-xl text-ink dark:text-parchment">
          Lessons
        </h2>
        {values.courseData.map((lesson, i) => (
          <div key={i} className="space-y-3 border border-parchment-dark p-4 dark:border-ink-light">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink dark:text-parchment">Lesson {i + 1}</p>
              <button type="button" onClick={() => removeLesson(i)} className="text-sm text-clay">
                Remove lesson
              </button>
            </div>

            <input
              className={inputClass}
              placeholder="Lesson title"
              value={lesson.title}
              onChange={(e) => updateLesson(i, { title: e.target.value })}
            />
            <textarea
              className={inputClass}
              placeholder="Lesson description"
              rows={2}
              value={lesson.description}
              onChange={(e) => updateLesson(i, { description: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Video URL (mp4 file or embeddable link)"
              value={lesson.videoUrl}
              onChange={(e) => updateLesson(i, { videoUrl: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className={inputClass}
                placeholder="Section name"
                value={lesson.videoSection}
                onChange={(e) => updateLesson(i, { videoSection: e.target.value })}
              />
              <input
                type="number"
                min={0}
                className={inputClass}
                placeholder="Length (minutes)"
                value={lesson.videoLength}
                onChange={(e) => updateLesson(i, { videoLength: Number(e.target.value) })}
              />
            </div>

            <div className="pl-2">
              <p className="text-sm text-ink/60 dark:text-parchment/60">Resource links</p>
              {lesson.links.map((link, j) => (
                <div key={j} className="mt-2 flex gap-2">
                  <input
                    className={inputClass}
                    placeholder="Label"
                    value={link.title}
                    onChange={(e) => updateLink(i, j, { title: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => updateLink(i, j, { url: e.target.value })}
                  />
                  <button type="button" onClick={() => removeLink(i, j)} className="px-2 text-clay">
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addLink(i)}
                className="mt-2 text-sm text-mustard-dark hover:underline dark:text-mustard"
              >
                + Add link
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addLesson}
          className="text-sm text-mustard-dark hover:underline dark:text-mustard"
        >
          + Add lesson
        </button>
      </section>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-mustard px-8 py-3 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}