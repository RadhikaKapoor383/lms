import { Request, Response, NextFunction } from "express";
import cloudinary from "cloudinary";
import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";

import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel, { COURSE_STATUSES, ICourse } from "../models/course.model";
import userModel from "../models/user.model";
import NotificationModel from "../models/notification.model";
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

// ------------------- Create course (admin / instructor) -------------------

export const uploadCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = { ...req.body };
      const thumbnail = data.thumbnail;

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

// ------------------- Get single course (public, sanitized) -------------------

export const getSingleCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const isCacheExist = await redis.get(courseId);

      if (isCacheExist) {
        const course = JSON.parse(isCacheExist);
        return res.status(200).json({ success: true, course });
      }

      const course = await CourseModel.findOne({
        _id: courseId,
        status: "Published",
      }).select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

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
        const courses = JSON.parse(isCacheExist);
        return res.status(200).json({ success: true, courses });
      }

      const courses = await CourseModel.find({ status: "Published" }).select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      await redis.set("allCourses", JSON.stringify(courses), "EX", 604800); // 7 days

      res.status(200).json({ success: true, courses });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Get course content (purchase-gated) -------------------

export const getCourseByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses || [];
      const courseId = req.params.id;

      const courseExists = userCourseList.find(
        (course: any) => course.courseId === courseId
      );

      if (!courseExists) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 404)
        );
      }

      const course = await CourseModel.findById(courseId);
      const content = course?.courseData;

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

      const course = await CourseModel.findById(courseId);

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!courseContent) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: [],
      };

      courseContent.questions.push(newQuestion);

      await NotificationModel.create({
        userId: req.user?._id,
        title: "New question received",
        message: `You have a new question in ${courseContent.title}`,
      });

      await course?.save();

      res.status(200).json({ success: true, course });
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

      const course = await CourseModel.findById(courseId);

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!courseContent) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const question = courseContent.questions.find((item: any) =>
        item._id.equals(questionId)
      );

      if (!question) {
        return next(new ErrorHandler("Invalid question id", 400));
      }

      const newAnswer: any = { user: req.user, answer };
      question.questionReplies.push(newAnswer);

      await course?.save();

      if (req.user?._id === (question.user as any)._id) {
        // asker is replying to their own question - no notification needed
        await NotificationModel.create({
          userId: req.user?._id,
          title: "New question reply received",
          message: `You have a new question reply in ${courseContent.title}`,
        });
      } else {
        // someone else (e.g. admin) answered - email the original asker
        const data = {
          name: (question.user as any).name,
          title: courseContent.title,
        };

        try {
          await sendMail({
            email: (question.user as any).email,
            subject: "Question Reply",
            template: "question-reply.ejs",
            data,
          });
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 500));
        }
      }

      res.status(200).json({ success: true, course });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Add review -------------------

interface IAddReviewData {
  review: string;
  rating: number;
  userId: string;
}

export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses || [];
      const courseId = req.params.id;

      const courseExists = userCourseList.some(
        (course: any) => course.courseId.toString() === courseId.toString()
      );

      if (!courseExists) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 404)
        );
      }

      const course = await CourseModel.findById(courseId);
      const { review, rating } = req.body as IAddReviewData;

      const reviewData: any = {
        user: req.user,
        comment: review,
        rating,
      };

      course?.reviews.push(reviewData);

      let avg = 0;
      course?.reviews.forEach((rev: any) => {
        avg += rev.rating;
      });

      if (course) {
        course.ratings = avg / course.reviews.length;
      }

      await course?.save();

      await NotificationModel.create({
        userId: req.user?._id,
        title: "New review received",
        message: `${req.user?.name} has given a review on ${course?.name}`,
      });

      res.status(200).json({ success: true, course });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Add reply to review (admin) -------------------

interface IAddReviewReplyData {
  comment: string;
  courseId: string;
  reviewId: string;
}

export const addReplyToReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReviewReplyData;

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const review = course.reviews?.find(
        (rev: any) => rev._id.toString() === reviewId
      );

      if (!review) {
        return next(new ErrorHandler("Review not found", 404));
      }

      const replyData: any = { user: req.user, comment };

      if (!review.commentReplies) {
        review.commentReplies = [];
      }
      review.commentReplies.push(replyData);

      await course.save();

      res.status(200).json({ success: true, course });
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
      }).sort({ createdAt: -1 });
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
      const { id } = req.params;

      if (!COURSE_STATUSES.includes(status)) {
        return next(new ErrorHandler("Invalid course status", 400));
      }

      const course = await CourseModel.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
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