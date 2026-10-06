import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import LessonModel from "../models/lesson.model";
import EnrollmentModel from "../models/enrollment.model";
import userModel from "../models/user.model";
import CategoryModel from "../models/category.model";
import {
  DURATION_BUCKETS,
  LEVELS,
  buildMongoFilter,
  parseCourseSearch,
  rankAndPage,
} from "../services/courseSearch.service";

// ------------------- Public course search -------------------
// Step 1: the database narrows by everything it can (text, category,
// instructor, level, enrollment mode). Step 2: length and enrollment counts come
// from the lessons/enrollments of just those courses, then ordering and paging
// happen here. Fine for a catalogue of hundreds or low thousands of courses.

export const searchCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = parseCourseSearch(req.query);
      if ("error" in parsed) {
        return next(new ErrorHandler(parsed.error, 400));
      }
      const { params } = parsed;

      const courses = await CourseModel.find(buildMongoFilter(params))
        .select("name description level price estimatedPrice thumbnail ratings reviews category instructor enrollmentMode createdAt")
        .populate("category", "name")
        .populate("instructor", "name")
        .lean();

      const ids = courses.map((c) => c._id);
      const [lessonRows, enrollRows] = await Promise.all([
        LessonModel.aggregate([
          { $match: { course: { $in: ids } } },
          { $group: { _id: "$course", minutes: { $sum: { $ifNull: ["$videoLength", 0] } }, lessons: { $sum: 1 } } },
        ]),
        EnrollmentModel.aggregate([
          { $match: { course: { $in: ids }, status: { $in: ["active", "completed"] } } },
          { $group: { _id: "$course", n: { $sum: 1 } } },
        ]),
      ]);
      const lessonsOf = new Map(lessonRows.map((r: any) => [String(r._id), r]));
      const enrolledOf = new Map(enrollRows.map((r: any) => [String(r._id), r.n as number]));

      const rows = courses.map((c: any) => ({
        _id: c._id,
        name: c.name,
        // cut short for the cards - the full text is on the course page
        description: (c.description || "").length > 240 ? `${c.description.slice(0, 240)}…` : c.description,
        level: c.level,
        price: c.price,
        estimatedPrice: c.estimatedPrice,
        thumbnail: c.thumbnail,
        category: c.category ? { _id: c.category._id, name: c.category.name } : undefined,
        instructor: c.instructor ? { _id: c.instructor._id, name: c.instructor.name } : undefined,
        enrollmentMode: c.enrollmentMode,
        ratings: c.ratings || 0,
        // only the COUNT of reviews - never the reviews (they carry user data)
        reviewCount: (c.reviews || []).length,
        durationMinutes: lessonsOf.get(String(c._id))?.minutes || 0,
        lessonCount: lessonsOf.get(String(c._id))?.lessons || 0,
        enrolled: enrolledOf.get(String(c._id)) || 0,
        createdAt: c.createdAt,
      }));

      const { items, total, totalPages, page } = rankAndPage(rows, params);
      res.status(200).json({ success: true, courses: items, total, totalPages, page });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Options for the filter dropdowns -------------------
// Only things that actually have a published course, so no dropdown entry
// leads to an empty page.

export const getCourseFilters = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [categoryIds, instructorIds] = await Promise.all([
        CourseModel.distinct("category", { status: "Published", category: { $ne: null } }),
        CourseModel.distinct("instructor", { status: "Published", instructor: { $ne: null } }),
      ]);

      const [categories, instructors] = await Promise.all([
        CategoryModel.find({ _id: { $in: categoryIds } }).select("name"),
        userModel.find({ _id: { $in: instructorIds } }).select("name").sort({ name: 1 }),
      ]);

      res.status(200).json({
        success: true,
        categories: categories
          .map((c) => ({ _id: c._id, name: c.name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        instructors: instructors.map((i) => ({ _id: i._id, name: i.name })),
        levels: LEVELS,
        durations: Object.keys(DURATION_BUCKETS),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
