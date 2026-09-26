import CourseModel from "../models/course.model";
import EnrollmentModel from "../models/enrollment.model";
import LessonProgressModel from "../models/lessonProgress.model";
import NotificationModel from "../models/notification.model";
import ErrorHandler from "../utils/ErrorHandler";
import { isObjectId } from "./enrollment.service";

interface IProgressSummary {
  completionPercentage: number;
  completedLessonIds: string[];
  status: string;
  totalLessons: number;
}

const getActiveEnrollment = async (studentId: string, courseId: string) => {
  if (!isObjectId(courseId)) {
    throw new ErrorHandler("Invalid course id", 400);
  }
  const enrollment = await EnrollmentModel.findOne({
    student: studentId,
    course: courseId,
    status: { $in: ["active", "completed"] },
  });
  if (!enrollment) {
    throw new ErrorHandler("You are not enrolled in this course", 403);
  }
  return enrollment;
};

// Progress for one student in one course (what the course page shows)
export const getProgress = async (
  studentId: string,
  courseId: string
): Promise<IProgressSummary> => {
  const enrollment = await getActiveEnrollment(studentId, courseId);
  const course = await CourseModel.findById(courseId).select("courseData._id");
  const lessonIds = (course?.courseData || []).map((l: any) => l._id);

  const done = await LessonProgressModel.find({
    student: studentId,
    course: courseId,
    lessonId: { $in: lessonIds },
  }).select("lessonId");

  return {
    completionPercentage: enrollment.completionPercentage,
    completedLessonIds: done.map((d) => String(d.lessonId)),
    status: enrollment.status,
    totalLessons: lessonIds.length,
  };
};

// Mark one lesson done / not done, then recompute the course percentage.
export const setLessonCompleted = async (
  studentId: string,
  courseId: string,
  lessonId: string,
  completed: boolean
): Promise<IProgressSummary> => {
  const enrollment = await getActiveEnrollment(studentId, courseId);

  const course = await CourseModel.findById(courseId).select("name courseData._id");
  if (!course) {
    throw new ErrorHandler("Course not found", 404);
  }

  const lessonIds = course.courseData.map((l: any) => String(l._id));
  if (!isObjectId(lessonId) || !lessonIds.includes(lessonId)) {
    throw new ErrorHandler("Lesson not found in this course", 404);
  }

  if (completed) {
    // upsert: clicking "complete" twice never creates two records
    await LessonProgressModel.updateOne(
      { student: studentId, lessonId },
      {
        $setOnInsert: {
          course: courseId,
          enrollment: enrollment._id,
          completedAt: new Date(),
        },
      },
      { upsert: true }
    );
  } else {
    await LessonProgressModel.deleteOne({ student: studentId, lessonId });
  }

  // Only count lessons that still exist in the course (instructor may delete lessons later)
  const doneCount = await LessonProgressModel.countDocuments({
    student: studentId,
    course: courseId,
    lessonId: { $in: lessonIds },
  });

  const total = lessonIds.length;
  // floor() so 99.6% never shows as 100% while a lesson is still left
  const percentage =
    total === 0 ? 0 : doneCount === total ? 100 : Math.floor((doneCount / total) * 100);

  enrollment.completionPercentage = percentage;

  if (percentage === 100 && enrollment.status !== "completed") {
    enrollment.status = "completed";
    enrollment.completedAt = new Date();
    await NotificationModel.create({
      userId: String(studentId),
      title: "Course completed",
      message: `You completed ${course.name}`,
    });
  } else if (percentage < 100 && enrollment.status === "completed") {
    enrollment.status = "active";
    enrollment.completedAt = undefined;
  }
  await enrollment.save();

  const done = await LessonProgressModel.find({
    student: studentId,
    course: courseId,
    lessonId: { $in: lessonIds },
  }).select("lessonId");

  return {
    completionPercentage: percentage,
    completedLessonIds: done.map((d) => String(d.lessonId)),
    status: enrollment.status,
    totalLessons: total,
  };
};
