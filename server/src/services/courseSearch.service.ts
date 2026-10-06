import mongoose from "mongoose";

// Everything about turning "?q=react&level=Beginner&duration=short" into a
// database filter, and about ordering and paging the results, with no database
// involved - so it can be tested on its own.

export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export const SORTS = ["newest", "rating", "popular", "name"] as const;
export const ENROLLMENT_FILTERS = ["open", "code", "manual"] as const;

// Course length is the sum of its lessons' video minutes (Course has no
// duration field of its own). The buckets are in minutes.
export const DURATION_BUCKETS = {
  short: { min: 0, max: 120 }, // up to 2 hours
  medium: { min: 120, max: 600 }, // 2 to 10 hours
  long: { min: 600, max: Infinity }, // over 10 hours
} as const;
export type DurationBucket = keyof typeof DURATION_BUCKETS;

export interface ICourseSearchParams {
  q?: string;
  category?: string;
  instructor?: string;
  level?: (typeof LEVELS)[number];
  duration?: DurationBucket;
  enrollment?: (typeof ENROLLMENT_FILTERS)[number];
  sort: (typeof SORTS)[number];
  page: number;
  limit: number;
}

const isObjectId = (v: unknown): v is string =>
  typeof v === "string" && mongoose.Types.ObjectId.isValid(v) && /^[a-f0-9]{24}$/i.test(v);

const one = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Reads and VALIDATES the query string. Anything malformed is a clear error
// rather than being quietly ignored (a typo in a filter silently showing
// everything would be confusing). Array/object values (?level[$ne]=x) are
// rejected because `one()` only accepts plain strings.
export const parseCourseSearch = (
  query: Record<string, unknown>
): { params: ICourseSearchParams } | { error: string } => {
  const params: ICourseSearchParams = { sort: "newest", page: 1, limit: 12 };

  for (const key of ["q", "category", "instructor", "level", "duration", "enrollment", "sort", "page", "limit"]) {
    if (query[key] !== undefined && typeof query[key] !== "string") {
      return { error: `Invalid value for ${key}` };
    }
  }

  const q = one(query.q);
  if (q) {
    if (q.length > 100) return { error: "Search text can be at most 100 characters" };
    params.q = q;
  }

  for (const key of ["category", "instructor"] as const) {
    const value = one(query[key]);
    if (value) {
      if (!isObjectId(value)) return { error: `Invalid ${key}` };
      params[key] = value;
    }
  }

  const level = one(query.level);
  if (level) {
    const match = LEVELS.find((l) => l.toLowerCase() === level.toLowerCase());
    if (!match) return { error: `Level must be one of: ${LEVELS.join(", ")}` };
    params.level = match;
  }

  const duration = one(query.duration);
  if (duration) {
    if (!(duration in DURATION_BUCKETS)) return { error: "Duration must be short, medium or long" };
    params.duration = duration as DurationBucket;
  }

  const enrollment = one(query.enrollment);
  if (enrollment) {
    if (!(ENROLLMENT_FILTERS as readonly string[]).includes(enrollment)) {
      return { error: `Enrollment must be one of: ${ENROLLMENT_FILTERS.join(", ")}` };
    }
    params.enrollment = enrollment as (typeof ENROLLMENT_FILTERS)[number];
  }

  const sort = one(query.sort);
  if (sort) {
    if (!(SORTS as readonly string[]).includes(sort)) return { error: `Sort must be one of: ${SORTS.join(", ")}` };
    params.sort = sort as (typeof SORTS)[number];
  }

  const page = one(query.page);
  if (page) {
    const n = Number(page);
    if (!Number.isInteger(n) || n < 1) return { error: "Page must be a whole number from 1" };
    params.page = n;
  }
  const limit = one(query.limit);
  if (limit) {
    const n = Number(limit);
    if (!Number.isInteger(n) || n < 1 || n > 50) return { error: "Limit must be a whole number from 1 to 50" };
    params.limit = n;
  }

  return { params };
};

// The part of the search the database can do. Public search only ever sees
// Published courses, whatever the caller asks for.
export const buildMongoFilter = (p: ICourseSearchParams): Record<string, any> => {
  const filter: Record<string, any> = { status: "Published" };
  if (p.category) filter.category = p.category;
  if (p.instructor) filter.instructor = p.instructor;
  if (p.level) filter.level = p.level;
  if (p.enrollment) filter.enrollmentMode = p.enrollment;
  if (p.q) {
    // escaped: "c++" or "a.*" search for that exact text, never act as a pattern
    const pattern = new RegExp(escapeRegex(p.q), "i");
    filter.$or = [{ name: pattern }, { description: pattern }];
  }
  return filter;
};

export interface ISearchRow {
  _id: any;
  name: string;
  ratings?: number;
  createdAt?: Date | string;
  durationMinutes: number;
  enrolled: number;
}

export const matchesDuration = (minutes: number, bucket?: DurationBucket) => {
  if (!bucket) return true;
  const { min, max } = DURATION_BUCKETS[bucket];
  // lower bound inclusive, upper exclusive, so a 120-minute course is "medium", not in two buckets
  return minutes >= min && minutes < max;
};

const time = (v?: Date | string) => (v ? +new Date(v) : 0);

// Filter by length, order, and cut out one page. `total` is the count BEFORE
// paging, so the UI can show "page 2 of 5".
export const rankAndPage = <T extends ISearchRow>(rows: T[], p: ICourseSearchParams) => {
  const kept = rows.filter((r) => matchesDuration(r.durationMinutes, p.duration));

  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
  const sorters: Record<ICourseSearchParams["sort"], (a: T, b: T) => number> = {
    newest: (a, b) => time(b.createdAt) - time(a.createdAt) || byName(a, b),
    rating: (a, b) => (b.ratings || 0) - (a.ratings || 0) || b.enrolled - a.enrolled || byName(a, b),
    popular: (a, b) => b.enrolled - a.enrolled || (b.ratings || 0) - (a.ratings || 0) || byName(a, b),
    name: byName,
  };
  kept.sort(sorters[p.sort]);

  const total = kept.length;
  const start = (p.page - 1) * p.limit;
  return {
    total,
    totalPages: Math.max(1, Math.ceil(total / p.limit)),
    page: p.page,
    items: kept.slice(start, start + p.limit),
  };
};
