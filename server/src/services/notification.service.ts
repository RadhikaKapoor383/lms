import NotificationModel from "../models/notification.model";
import EnrollmentModel from "../models/enrollment.model";

// Notifications are a nicety: whatever the caller really did (posted an
// assignment, published an announcement) has already succeeded. So these
// helpers never throw - a failure is logged and the request carries on.

export const notifyUser = async (
  userId: string,
  title: string,
  message: string,
  link?: string
) => {
  try {
    await NotificationModel.create({ userId: String(userId), title, message, link });
  } catch (error: any) {
    console.error("Failed to create notification:", error.message);
  }
};

// Everyone currently learning in a course: active AND completed enrollments
// (a student who finished can still open the course). Revoked ones are out.
export const getCourseStudentIds = async (courseId: string): Promise<string[]> => {
  const enrollments = await EnrollmentModel.find({
    course: courseId,
    status: { $in: ["active", "completed"] },
  }).select("student");
  return enrollments.map((e) => String(e.student));
};

export const notifyUsers = async (
  userIds: string[],
  title: string,
  message: string,
  link?: string
): Promise<number> => {
  if (userIds.length === 0) return 0;
  try {
    await NotificationModel.insertMany(
      userIds.map((userId) => ({ userId: String(userId), title, message, link }))
    );
    return userIds.length;
  } catch (error: any) {
    console.error("Failed to fan out notifications:", error.message);
    return 0;
  }
};

export const notifyCourseStudents = async (
  courseId: string,
  title: string,
  message: string,
  link?: string
): Promise<number> => {
  try {
    const studentIds = await getCourseStudentIds(courseId);
    return await notifyUsers(studentIds, title, message, link);
  } catch (error: any) {
    console.error("Failed to notify course students:", error.message);
    return 0;
  }
};
