import crypto from "crypto";
import CertificateModel, { ICertificate } from "../models/certificate.model";
import CourseModel from "../models/course.model";
import EnrollmentModel from "../models/enrollment.model";
import QuizModel from "../models/quiz.model";
import QuizAttemptModel from "../models/quizAttempt.model";
import NotificationModel from "../models/notification.model";
import userModel from "../models/user.model";
import { getSettings } from "./settings.service";


// ---------------------------------------------------------------------------
// 1. The rule (pure - no database, so it can be tested on its own)
// ---------------------------------------------------------------------------
// A student earns the certificate when BOTH are true:
//   a) every lesson is complete (completionPercentage reached 100), and
//   b) every quiz in the course has been passed at least once.
// A course with no lessons can never be "complete", so it never qualifies.
// Assignments are not required: they are graded by hand and can take days,
// and a late grade should not block a student who finished everything else.

export interface IQuizPassState {
  quizId: string;
  title: string;
  passed: boolean;
}

export interface IEligibility {
  eligible: boolean;
  lessonsComplete: boolean;
  completionPercentage: number;
  pendingQuizzes: { quizId: string; title: string }[];
}

export const computeEligibility = (
  completionPercentage: number,
  quizzes: IQuizPassState[]
): IEligibility => {
  const lessonsComplete = completionPercentage >= 100;
  const pendingQuizzes = quizzes
    .filter((q) => !q.passed)
    .map((q) => ({ quizId: q.quizId, title: q.title }));

  return {
    eligible: lessonsComplete && pendingQuizzes.length === 0,
    lessonsComplete,
    completionPercentage,
    pendingQuizzes,
  };
};

// ---------------------------------------------------------------------------
// 2. Certificate ids
// ---------------------------------------------------------------------------
// 8 random bytes = 64 bits: nobody can guess a valid id, so the public verify
// page can't be used to browse other people's certificates.
// Format: CERT-XXXX-XXXX-XXXX-XXXX
export const generateCertificateId = (): string => {
  const hex = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `CERT-${hex.match(/.{4}/g)!.join("-")}`;
};

// ---------------------------------------------------------------------------
// 3. Database side
// ---------------------------------------------------------------------------

export const getEligibilityForStudent = async (
  studentId: string,
  courseId: string
): Promise<(IEligibility & { enrollmentStatus: string; completedAt?: Date }) | null> => {
  const enrollment = await EnrollmentModel.findOne({
    student: studentId,
    course: courseId,
    status: { $in: ["active", "completed"] },
  });
  if (!enrollment) return null;

  const quizzes = await QuizModel.find({ course: courseId }).select("_id title");
  const passedQuizIds = new Set(
    (
      await QuizAttemptModel.find({
        student: studentId,
        course: courseId,
        passed: true,
      }).select("quiz")
    ).map((a) => String(a.quiz))
  );

  const result = computeEligibility(
    enrollment.completionPercentage,
    quizzes.map((q) => ({
      quizId: String(q._id),
      title: q.title,
      passed: passedQuizIds.has(String(q._id)),
    }))
  );

  return {
    ...result,
    enrollmentStatus: enrollment.status,
    completedAt: enrollment.completedAt,
  };
};

// Issue the certificate if the student qualifies and doesn't have one yet.
// Safe to call as often as you like (after every lesson, every quiz pass, ...):
//  - already has one  -> returns it, creates nothing
//  - not eligible yet -> returns null
// A revoked certificate is never silently re-issued - an admin decided that.
export const evaluateCertificate = async (
  studentId: string,
  courseId: string
): Promise<ICertificate | null> => {
  const existing = await CertificateModel.findOne({ student: studentId, course: courseId });
  if (existing) return existing;

  const eligibility = await getEligibilityForStudent(studentId, courseId);
  if (!eligibility || !eligibility.eligible) return null;

  const [student, course] = await Promise.all([
    userModel.findById(studentId).select("name"),
    CourseModel.findById(courseId).select("name instructor"),
  ]);
  if (!student || !course) return null;

  let instructorName = "Course Instructor";
  if (course.instructor) {
    const instructor = await userModel.findById(course.instructor).select("name");
    if (instructor?.name) instructorName = instructor.name;
  }

  // the name is a snapshot too: renaming the platform later doesn't rewrite
  // certificates that were already issued
  const { platformName } = await getSettings();

  try {
    const certificate = await CertificateModel.create({
      certificateId: generateCertificateId(),
      student: studentId,
      course: courseId,
      instructor: course.instructor,
      studentName: student.name,
      courseName: course.name,
      instructorName,
      platformName,
      completionDate: eligibility.completedAt || new Date(),
      issuedAt: new Date(),
    });

    await NotificationModel.create({
      userId: String(studentId),
      title: "Certificate available",
      message: `Your certificate for ${course.name} is ready`,
      link: `/certificates/${certificate.certificateId}`,
    });

    return certificate;
  } catch (error: any) {
    // 11000 = duplicate key: a parallel request issued it a moment ago. That's
    // fine - the unique index did its job, just hand back the existing one.
    if (error?.code === 11000) {
      return CertificateModel.findOne({ student: studentId, course: courseId });
    }
    throw error;
  }
};

// Called from places that already did their own work (marking a lesson, grading
// a quiz). A certificate hiccup must never make *that* request fail, so errors
// are logged and swallowed here.
export const tryIssueCertificate = async (studentId: string, courseId: string) => {
  try {
    await evaluateCertificate(String(studentId), String(courseId));
  } catch (error: any) {
    console.error("Certificate evaluation failed:", error.message);
  }
};
