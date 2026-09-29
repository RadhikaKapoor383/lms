import CourseModel from "../models/course.model";
import userModel from "../models/user.model";
import EnrollmentModel, { EnrollmentMethod } from "../models/enrollment.model";
import NotificationModel from "../models/notification.model";
import { redis } from "../utils/redis";
import ErrorHandler from "../utils/ErrorHandler";

// Strict 24-char hex check. (mongoose's isValid also accepts any 12-character string.)
export const isObjectId = (value: unknown): boolean =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

// The Redis session holds a copy of the user (including user.courses).
// After enrolling/removing someone, refresh that copy - otherwise the UI keeps
// showing the old course list until the person logs in again.
// No session in Redis = user is logged out; login rebuilds it from the DB.
export const syncUserSession = async (userId: string) => {
  const key = String(userId);
  if (!(await redis.exists(key))) return;
  const fresh = await userModel.findById(key);
  if (fresh) {
    await redis.set(key, JSON.stringify(fresh), "EX", 7 * 24 * 60 * 60);
  }
};

interface ICreateEnrollmentInput {
  studentId: string;
  courseId: string;
  method: EnrollmentMethod;
}

// THE one door into a course. Free enroll, paid purchase, instructor enroll and
// code enroll all end up here, so the rules (published course, students only,
// no duplicates, notifications, counters) exist in exactly one place.
// Callers decide *whether* the person may come in; this does the actual enrolling.
export const createEnrollment = async ({
  studentId,
  courseId,
  method,
}: ICreateEnrollmentInput) => {
  if (!isObjectId(studentId) || !isObjectId(courseId)) {
    throw new ErrorHandler("Invalid student or course id", 400);
  }

  const [course, student] = await Promise.all([
    CourseModel.findById(courseId),
    userModel.findById(studentId),
  ]);

  if (!course || course.status !== "Published") {
    throw new ErrorHandler("This course is not available for enrollment", 404);
  }
  if (!student) {
    throw new ErrorHandler("Student not found", 404);
  }
  if (student.role !== "student") {
    throw new ErrorHandler("Only student accounts can be enrolled in courses", 400);
  }

  const existing = await EnrollmentModel.findOne({
    student: studentId,
    course: courseId,
  });

  if (existing && existing.status !== "revoked") {
    throw new ErrorHandler("Already enrolled in this course", 409);
  }

  let enrollment;
  if (existing) {
    // Re-enrolling someone who was removed earlier: bring the old record back
    // (their lesson progress is still there).
    existing.status = existing.completionPercentage >= 100 ? "completed" : "active";
    existing.method = method;
    existing.instructor = course.instructor;
    enrollment = await existing.save();
  } else {
    try {
      enrollment = await EnrollmentModel.create({
        student: studentId,
        course: courseId,
        instructor: course.instructor,
        method,
      });
    } catch (error: any) {
      // Two simultaneous requests: the unique index stops the second one
      if (error?.code === 11000) {
        throw new ErrorHandler("Already enrolled in this course", 409);
      }
      throw error;
    }
  }

  // Keep the older user.courses list in step (other code, e.g. reviews, still reads it)
  await userModel.updateOne(
    { _id: studentId, "courses.courseId": { $ne: String(courseId) } },
    { $push: { courses: { courseId: String(courseId) } } } as any
  );
  await CourseModel.updateOne({ _id: courseId }, { $inc: { purchased: 1 } });
  await syncUserSession(studentId);

  await NotificationModel.create({
    userId: String(studentId),
    title: "Enrolled",
    message: `You are now enrolled in ${course.name}`,
  });

  return { enrollment, course, student };
};

// Instructor/admin removes a student. We keep the record with status "revoked".
export const revokeEnrollment = async (studentId: string, courseId: string) => {
  if (!isObjectId(studentId) || !isObjectId(courseId)) {
    throw new ErrorHandler("Invalid student or course id", 400);
  }

  const enrollment = await EnrollmentModel.findOne({
    student: studentId,
    course: courseId,
  });

  if (!enrollment || enrollment.status === "revoked") {
    throw new ErrorHandler("Enrollment not found", 404);
  }

  enrollment.status = "revoked";
  await enrollment.save();

  await userModel.updateOne(
    { _id: studentId },
    { $pull: { courses: { courseId: String(courseId) } } } as any
  );
  await CourseModel.updateOne(
    { _id: courseId, purchased: { $gt: 0 } },
    { $inc: { purchased: -1 } }
  );
  await syncUserSession(studentId);

  return enrollment;
};

// True if this student may open the course content
export const hasActiveEnrollment = async (studentId: string, courseId: string) => {
  if (!isObjectId(studentId) || !isObjectId(courseId)) return false;
  const found = await EnrollmentModel.exists({
    student: studentId,
    course: courseId,
    status: { $in: ["active", "completed"] },
  });
  return !!found;
};

// Who may see a course's gated content (lessons, assignments, quizzes...):
// admin: any course. instructor: their own course (to preview it).
// everyone else: only with an active enrollment (checked in the DB, so a
// student who was removed loses access immediately).
export const hasCourseContentAccess = async (
  role: string | undefined,
  userId: string | undefined,
  courseId: string
) => {
  if (role === "admin") return true;

  if (role === "instructor") {
    const owned = await CourseModel.findById(courseId).select("instructor");
    if (!!owned?.instructor && String(owned.instructor) === String(userId)) {
      return true;
    }
  }

  return hasActiveEnrollment(String(userId), courseId);
};

