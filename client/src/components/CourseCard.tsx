import Link from "next/link";
import { formatDuration } from "./analytics";

const tagColors: Record<string, string> = {
  Programming: "#B8563F",
  "Digital Marketing": "#3F6B5C",
  "Graphic Design": "#8A5FB0",
  "Machine Learning": "#2F6B8A",
};

export default function CourseCard({ course }: { course: any }) {
  const categoryName = course.category?.name || "";
  const tagColor = tagColors[categoryName] || "#D9A441";

  return (
    <Link
      href={`/course/${course._id}`}
      className="group block border border-parchment-dark bg-parchment transition hover:-translate-y-0.5 hover:shadow-md dark:border-ink-light dark:bg-ink-light"
      style={{ borderLeft: `4px solid ${tagColor}` }}
    >
      <div className="flex items-center justify-between px-5 pt-4 text-xs uppercase tracking-wide text-ink/50 dark:text-parchment/50">
        <span>{course.level}</span>
        <span>{categoryName}</span>
      </div>

      <div className="px-5 py-3">
        <h3 className="font-display text-xl leading-snug text-ink group-hover:text-mustard-dark dark:text-parchment">
          {course.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-ink/70 dark:text-parchment/70">
          {course.description}
        </p>
        {/* extras the search results carry (the plain course list doesn't) */}
        {(course.instructor?.name || course.durationMinutes > 0 || course.reviewCount > 0) && (
          <p className="mt-3 text-xs text-ink/60 dark:text-parchment/60">
            {[
              course.instructor?.name,
              formatDuration(course.durationMinutes),
              course.reviewCount > 0 ? `★ ${course.ratings} (${course.reviewCount})` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-parchment-dark px-5 py-3 dark:border-ink">
        <span className="font-display text-lg text-ink dark:text-parchment">
          ${course.price}
          {course.estimatedPrice && (
            <span className="ml-2 text-sm text-ink/40 line-through dark:text-parchment/40">
              ${course.estimatedPrice}
            </span>
          )}
        </span>
        <span className="text-sm text-ink/60 dark:text-parchment/60">
          {course.purchased || 0} enrolled
        </span>
      </div>
    </Link>
  );
}
