import { Request, Response, NextFunction } from "express";
import cloudinary from "cloudinary";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";

import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel, {
  COURSE_STATUSES,
  ENROLLMENT_MODES,
  ICourse,
} from "../models/course.model";
import CategoryModel from "../models/category.model";
import userModel from "../models/user.model";
import EnrollmentModel from "../models/enrollment.model";
import LessonProgressModel from "../models/lessonProgress.model";
import ModuleModel from "../models/module.model";
import LessonModel from "../models/lesson.model";
import AssignmentModel from "../models/assignment.model";
import AssignmentSubmissionModel from "../models/assignmentSubmission.model";
import QuizModel from "../models/quiz.model";
import QuizAttemptModel from "../models/quizAttempt.model";
import { syncModulesAndLessons, buildCourseDataArray } from "../services/courseContent.service";
import { hasCourseContentAccess, isObjectId } from "../services/enrollment.service";
import NotificationModel from "../models/notification.model";
import { notifyCourseStudents, notifyUser, notifyUsers } from "../services/notification.service";
import { toPublicCourse } from "../utils/publicProfile";
import { getSettings } from "../services/settings.service";
import { redis } from "../utils/redis";
import sendMail from "../utils/sendMail";
import { logActivity } from "../utils/auditLog";

// ------------------- Role helpers -------------------

// Fields an instructor must never be able to set through the request body.
// Without this, an instructor could publish their own course (skipping admin
// approval), hand a course to someone else, or fake ratings/enrollment counts.
const INSTRUCTOR_LOCKED_FIELDS = [
  "instructor",
  "status",
  "ratings",
  "purchased",
  "reviews",
] as const;

const stripLockedFields = (data: Record<string, any>) => {
  for (const field of INSTRUCTOR_LOCKED_FIELDS) {
    delete data[field];
  }
};

// When an admin assigns a course to someone, make sure that id is really an instructor.
const isValidInstructorId = async (id: any): Promise<boolean> => {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  const instructor = await userModel.findOne({ _id: id, role: "instructor" }).select("_id");
  return !!instructor;
};

const isValidCategoryId = async (id: any): Promise<boolean> => {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  return !!(await CategoryModel.exists({ _id: id }));
};

// Enrollment settings coming from the form: mode + optional plain-text code.
// The code is hashed before it is saved (like a password) and the plain text is
// thrown away. Clients can never send the hash themselves.
// Returns an error message, or null if everything is fine.
const prepareEnrollmentSettings = async (
  data: Record<string, any>
): Promise<string | null> => {
  delete data.enrollmentCodeHash;

  if (data.enrollmentMode !== undefined && !(ENROLLMENT_MODES as readonly string[]).includes(data.enrollmentMode)) {
    return `Enrollment mode must be one of: ${ENROLLMENT_MODES.join(", ")}`;
  }

  const code = typeof data.enrollmentCode === "string" ? data.enrollmentCode.trim() : "";
  delete data.enrollmentCode;

  if (code) {
    if (code.length < 6) {
      return "Enrollment code must be at least 6 characters";
    }
    data.enrollmentCodeHash = await bcrypt.hash(code, 10);
  }
  return null;
};

// ------------------- Create course (admin / instructor) -------------------

export const uploadCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = { ...req.body };
      const thumbnail = data.thumbnail;
      const courseData = data.courseData;
      delete data.courseData;

      if (req.user?.role === "instructor") {
        // Instructor: the course is always theirs and always starts as a Draft
        stripLockedFields(data);
        data.instructor = req.user._id;
        data.status = "Draft";
      } else if (data.instructor) {
        // Admin assigning an instructor at creation time
        if (!(await isValidInstructorId(data.instructor))) {
          return next(new ErrorHandler("Selected user is not an instructor", 400));
        }
      } else {
        delete data.instructor;
      }

      if (!(await isValidCategoryId(data.category))) {
        return next(new ErrorHandler("Choose a valid category", 400));
      }

      const settingsError = await prepareEnrollmentSettings(data);
      if (settingsError) {
        return next(new ErrorHandler(settingsError, 400));
      }
      if (data.enrollmentMode === "code" && !data.enrollmentCodeHash) {
        return next(new ErrorHandler("Set an enrollment code for a code-based course", 400));
      }

      if (thumbnail) {
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      const course = await CourseModel.create(data);
      await syncModulesAndLessons(course._id, courseData);

      logActivity(req, "course.create", `Created course "${course.name}"`, {
        courseId: course._id,
      });

      res.status(201).json({ success: true, course });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Edit course (admin, or the instructor who owns it) -------------------
// Ownership is enforced by authorizeCourseOwner on the route.

export const editCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = { ...req.body };
      const thumbnail = data.thumbnail;
      const hasCourseData = "courseData" in data;
      const courseData = data.courseData;
      delete data.courseData;

      if (req.user?.role === "instructor") {
        // Silently ignore locked fields (the shared CourseForm always sends "status")
        stripLockedFields(data);
      } else if ("instructor" in data) {
        // Admin re-assigning the course to another instructor
        if (!data.instructor) {
          delete data.instructor;
        } else if (!(await isValidInstructorId(data.instructor))) {
          return next(new ErrorHandler("Selected user is not an instructor", 400));
        }
      }

      if ("category" in data && !(await isValidCategoryId(data.category))) {
        return next(new ErrorHandler("Choose a valid category", 400));
      }

      const settingsError = await prepareEnrollmentSettings(data);
      if (settingsError) {
        return next(new ErrorHandler(settingsError, 400));
      }
      if (data.enrollmentMode === "code" && !data.enrollmentCodeHash) {
        // switching to code mode without a new code: the course must already have one
        const current = await CourseModel.findById(req.params.id).select("+enrollmentCodeHash");
        if (!current?.enrollmentCodeHash) {
          return next(new ErrorHandler("Set an enrollment code for a code-based course", 400));
        }
      }

      if (thumbnail) {
        await cloudinary.v2.uploader.destroy(thumbnail.public_id);
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      const courseId = req.params.id;
      const course = await CourseModel.findByIdAndUpdate(
        courseId,
        { $set: data },
        { new: true }
      );

      if (hasCourseData) {
        const lessonsBefore = await LessonModel.countDocuments({ course: courseId });
        await syncModulesAndLessons(courseId, courseData);
        const lessonsAfter = await LessonModel.countDocuments({ course: courseId });

        // New content in a live course: tell the students already learning in
        // it. A draft/pending course has no students yet, and editing or
        // reordering existing lessons shouldn't notify anyone - only a rise in
        // the lesson count does.
        if (course?.status === "Published" && lessonsAfter > lessonsBefore) {
          const added = lessonsAfter - lessonsBefore;
          await notifyCourseStudents(
            courseId,
            "New lessons added",
            `${added} new lesson${added === 1 ? "" : "s"} added to ${course.name}`,
            `/course-access/${courseId}`
          );
        }
      }

      await redis.del(courseId);
      await redis.del("allCourses");

      logActivity(req, "course.edit", `Edited course "${course?.name}"`, {
        courseId,
      });

      res.status(201).json({ success: true, course });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Get single course for editing (admin, or the instructor who owns it) -------------------
// Unlike getSingleCourse/getAllCourses, this always includes full lesson
// content plus each lesson's _id, since CourseForm needs those ids to keep a
// lesson's identity (and its students' progress) stable across edits.

export const getCourseForEdit = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const course = await CourseModel.findById(req.params.id)
        .populate("category", "name")
        .populate("instructor", "name email");

      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const courseData = await buildCourseDataArray(course._id, false);

      res.status(200).json({ success: true, course: { ...course.toObject(), courseData } });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Get single course (public, sanitized) -------------------

export const getSingleCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const isCacheExist = await redis.get(courseId);

      // toPublicCourse strips reviewer emails etc. It also runs on the cached
      // copy, because entries cached before this fix still hold the raw data.
      if (isCacheExist) {
        const course = toPublicCourse(JSON.parse(isCacheExist));
        return res.status(200).json({ success: true, course });
      }

      const found = await CourseModel.findOne({
        _id: courseId,
        status: "Published",
      }).populate("category", "name");

      if (!found) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const course = toPublicCourse(found);
      await redis.set(courseId, JSON.stringify(course), "EX", 604800); // 7 days

      res.status(200).json({ success: true, course });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Get all courses (public, sanitized) -------------------

export const getAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCacheExist = await redis.get("allCourses");

      if (isCacheExist) {
        const courses = JSON.parse(isCacheExist).map(toPublicCourse);
        return res.status(200).json({ success: true, courses });
      }

      const found = await CourseModel.find({ status: "Published" }).populate(
        "category",
        "name"
      );
      const courses = found.map(toPublicCourse);

      await redis.set("allCourses", JSON.stringify(courses), "EX", 604800); // 7 days

      res.status(200).json({ success: true, courses });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Get course content (purchase-gated) -------------------

// (hasCourseContentAccess now lives in enrollment.service.ts, alongside the
// other access/enrollment logic it depends on - imported above.)

export const getCourseByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const role = req.user?.role;

      if (!isObjectId(courseId)) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      // Who may open the content:
      //  - admin: any course
      //  - instructor: their own course (to preview it)
      //  - student: only with an active enrollment (checked in the DB, so a
      //    student who was removed loses access immediately)
      const allowed = await hasCourseContentAccess(role, String(req.user?._id), courseId);

      if (!allowed) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 404)
        );
      }

      const content = await buildCourseDataArray(courseId, false);

      res.status(200).json({ success: true, content });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Add question -------------------

interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, courseId, contentId } =
        req.body as IAddQuestionData;

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const allowed = await hasCourseContentAccess(req.user?.role, String(req.user?._id), courseId);
      if (!allowed) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 404)
        );
      }

      const lesson = await LessonModel.findOne({ _id: contentId, course: courseId });

      if (!lesson) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: [],
      };

      lesson.questions.push(newQuestion);
      await lesson.save();

      // Tell the course staff - not the person who just asked (this used to
      // notify the asker about their own question).
      const askedIn = await CourseModel.findById(courseId).select("instructor");
      let staffIds: string[];
      if (askedIn?.instructor) {
        staffIds = [String(askedIn.instructor)];
      } else {
        staffIds = (await userModel.find({ role: "admin" }).select("_id")).map((a) => String(a._id));
      }
      await notifyUsers(
        staffIds.filter((id) => id !== String(req.user?._id)),
        "New question received",
        `${req.user?.name} asked a question in ${lesson.title}`,
        `/course-access/${courseId}`
      );

      res.status(200).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Add answer -------------------

interface IAddAnswerData {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

export const addAnswer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, courseId, contentId, questionId } =
        req.body as IAddAnswerData;

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      // Until now ANY logged-in user could answer questions in ANY course.
      const allowed = await hasCourseContentAccess(req.user?.role, String(req.user?._id), courseId);
      if (!allowed) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 404)
        );
      }

      const lesson = await LessonModel.findOne({ _id: contentId, course: courseId });

      if (!lesson) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const question = lesson.questions.find((item: any) =>
        item._id.equals(questionId)
      );

      if (!question) {
        return next(new ErrorHandler("Invalid question id", 400));
      }

      const newAnswer: any = { user: req.user, answer };
      question.questionReplies.push(newAnswer);

      await lesson.save();

      const asker = question.user as any;
      const link = `/course-access/${courseId}`;

      if (String(req.user?._id) === String(asker._id)) {
        // the asker is following up on their own question: the staff should know
        const owner = await CourseModel.findById(courseId).select("instructor");
        if (owner?.instructor) {
          await notifyUser(
            String(owner.instructor),
            "New question reply received",
            `${req.user?.name} replied on their question in ${lesson.title}`,
            link
          );
        }
      } else {
        // someone else answered: tell the asker in the app, and by email
        await notifyUser(
          String(asker._id),
          "Your question was answered",
          `${req.user?.name} replied to your question in ${lesson.title}`,
          link
        );

        // The answer is already saved - a mail failure must not turn that into an error.
        try {
          await sendMail({
            email: asker.email,
            subject: "Question Reply",
            template: "question-reply.ejs",
            data: { name: asker.name, title: lesson.title },
          });
        } catch (error: any) {
          console.error("Question reply email failed:", error.message);
        }
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Delete course (admin) -------------------

export const deleteCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const course = await CourseModel.findById(id);

      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      await course.deleteOne({ _id: id });

      // Clean up everything that pointed at this course
      await EnrollmentModel.deleteMany({ course: id });
      await LessonProgressModel.deleteMany({ course: id });
      await LessonModel.deleteMany({ course: id });
      await AssignmentModel.deleteMany({ course: id });
      await AssignmentSubmissionModel.deleteMany({ course: id });
      await QuizModel.deleteMany({ course: id });
      await QuizAttemptModel.deleteMany({ course: id });
      await ModuleModel.deleteMany({ course: id });
      await userModel.updateMany(
        { "courses.courseId": id },
        { $pull: { courses: { courseId: id } } } as any
      );

      await redis.del(id);
      await redis.del("allCourses");

      logActivity(req, "course.delete", `Deleted course "${course.name}"`, {
        courseId: id,
      });

      res.status(200).json({ success: true, message: "Course deleted successfully" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Get all courses (admin, unsanitized, optional status filter) -------------------

export const getAdminAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.query;
      const filter = status ? { status } : {};
      const courses = await CourseModel.find(filter)
        .populate("instructor", "name email")
        .populate("category", "name")
        .sort({ createdAt: -1 });
      res.status(200).json({ success: true, courses });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Get my courses (instructor) -------------------

export const getInstructorCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await CourseModel.find({
        instructor: req.user?._id,
      })
        .populate("category", "name")
        .sort({ createdAt: -1 });
      res.status(200).json({ success: true, courses });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Update course status (admin) -------------------

export const updateCourseStatus = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const reason = String(req.body.reason || "").trim();
      const { id } = req.params;

      if (!COURSE_STATUSES.includes(status)) {
        return next(new ErrorHandler("Invalid course status", 400));
      }

      const before = await CourseModel.findById(id).select("status");
      if (!before) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const course = await CourseModel.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      // Tell the instructor the outcome of their submission. Only when the
      // status really changed, so re-selecting the same value doesn't spam.
      if (
        course.instructor &&
        before.status !== status &&
        (status === "Published" || status === "Rejected")
      ) {
        await NotificationModel.create({
          userId: String(course.instructor),
          link: "/instructor",
          title: status === "Published" ? "Course approved" : "Course rejected",
          message:
            status === "Published"
              ? `"${course.name}" was approved and is now published`
              : `"${course.name}" was rejected${reason ? `: ${reason}` : ""}`,
        });
      }

      // A status change affects public visibility, so both the individual
      // course cache and the "all courses" list cache need to be dropped.
      await redis.del(id);
      await redis.del("allCourses");

      logActivity(
        req,
        "course.status_change",
        `Changed "${course.name}" status to ${status}`,
        { courseId: id, status }
      );

      res.status(200).json({ success: true, course });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Instructor: submit a course for admin approval -------------------
// Ownership is enforced by authorizeCourseOwner on the route.
// Draft -> Pending Approval (also Rejected -> Pending Approval, i.e. resubmit
// after fixing what the admin objected to).

export const submitCourseForApproval = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const course = await CourseModel.findById(id).select("name status");
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      if (course.status !== "Draft" && course.status !== "Rejected") {
        return next(
          new ErrorHandler(`A ${course.status} course can't be submitted for approval`, 400)
        );
      }

      // Don't send admins an empty shell to review.
      const lessonCount = await LessonModel.countDocuments({ course: id });
      if (lessonCount === 0) {
        return next(new ErrorHandler("Add at least one lesson before submitting for approval", 400));
      }

      // An admin can turn approval off platform-wide: then "submit" publishes.
      const { requireCourseApproval } = await getSettings();
      const nextStatus = requireCourseApproval ? "Pending Approval" : "Published";

      // Atomic: only flips if it is still Draft/Rejected, so a double click
      // can't send two notifications.
      const updated = await CourseModel.findOneAndUpdate(
        { _id: id, status: { $in: ["Draft", "Rejected"] } },
        { status: nextStatus },
        { new: true }
      );
      if (!updated) {
        return next(new ErrorHandler("This course was already submitted", 409));
      }

      await redis.del(id);
      await redis.del("allCourses");

      // Nothing for the admins to review when approval is off.
      const admins = requireCourseApproval
        ? await userModel.find({ role: "admin" }).select("_id")
        : [];
      if (admins.length > 0) {
        await NotificationModel.insertMany(
          admins.map((admin) => ({
            userId: String(admin._id),
            title: "Course awaiting approval",
            message: `${req.user?.name || "An instructor"} submitted "${updated.name}" for approval`,
            link: "/admin/all-courses",
          }))
        );
      }

      logActivity(
        req,
        requireCourseApproval ? "course.submit_for_approval" : "course.publish",
        requireCourseApproval
          ? `Submitted "${updated.name}" for approval`
          : `Published "${updated.name}" (approval is off)`,
        { courseId: id }
      );

      res.status(200).json({ success: true, course: updated });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Instructor: take a submission back -------------------
// Pending Approval -> Draft, e.g. they spotted a mistake after submitting.

export const withdrawCourseSubmission = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const updated = await CourseModel.findOneAndUpdate(
        { _id: id, status: "Pending Approval" },
        { status: "Draft" },
        { new: true }
      );
      if (!updated) {
        return next(new ErrorHandler("Only a course pending approval can be withdrawn", 400));
      }

      await redis.del(id);
      await redis.del("allCourses");

      logActivity(req, "course.withdraw_submission", `Withdrew "${updated.name}" from approval`, {
        courseId: id,
      });

      res.status(200).json({ success: true, course: updated });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
