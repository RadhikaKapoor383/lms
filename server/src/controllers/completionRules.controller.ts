import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import QuizModel from "../models/quiz.model";
import AssignmentModel from "../models/assignment.model";
import { isObjectId } from "../services/enrollment.service";
import { describeRules, parseCompletionRules, withDefaults } from "../services/completionRules.service";
import { logActivity } from "../utils/auditLog";
import { redis } from "../utils/redis";

// Ownership (the course's instructor, or an admin) is checked by
// authorizeCourseOwner on the route.

const loadContext = async (courseId: string) => {
  const [course, quizzes, assignmentCount] = await Promise.all([
    CourseModel.findById(courseId).select("name completionRules").lean(),
    QuizModel.find({ course: courseId }).select("_id title").sort({ createdAt: 1 }).lean(),
    AssignmentModel.countDocuments({ course: courseId }),
  ]);
  return { course, quizzes, assignmentCount };
};

const respond = (res: Response, course: any, quizzes: any[], assignmentCount: number) => {
  const rules = withDefaults(course?.completionRules);
  // a quiz chosen earlier and since deleted no longer counts
  const known = new Set(quizzes.map((q) => String(q._id)));
  rules.quizIds = rules.quizIds.filter((id) => known.has(id));
  res.status(200).json({
    success: true,
    rules,
    summary: describeRules(rules, Object.fromEntries(quizzes.map((q) => [String(q._id), q.title]))),
    quizzes: quizzes.map((q) => ({ _id: q._id, title: q.title })),
    assignmentCount,
  });
};

export const getCompletionRules = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      if (!isObjectId(courseId)) return next(new ErrorHandler("Invalid course id", 400));
      const { course, quizzes, assignmentCount } = await loadContext(courseId);
      if (!course) return next(new ErrorHandler("Course not found", 404));
      respond(res, course, quizzes, assignmentCount);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Changing the rules does not take back certificates already issued; students
// who now qualify get theirs the next time they open the course.
export const updateCompletionRules = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      if (!isObjectId(courseId)) return next(new ErrorHandler("Invalid course id", 400));
      const { course, quizzes, assignmentCount } = await loadContext(courseId);
      if (!course) return next(new ErrorHandler("Course not found", 404));

      const parsed = parseCompletionRules(req.body, quizzes.map((q) => String(q._id)));
      if ("error" in parsed) return next(new ErrorHandler(parsed.error, 400));

      const updated = await CourseModel.findByIdAndUpdate(
        courseId,
        { $set: { completionRules: parsed.rules } },
        { new: true, runValidators: true }
      )
        .select("name completionRules")
        .lean();
      // the public course page is cached with the course document in it
      await redis.del(courseId, "allCourses");

      logActivity(req, "course.completion_rules", `Changed completion rules of "${course.name}"`, { courseId });
      respond(res, updated, quizzes, assignmentCount);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
