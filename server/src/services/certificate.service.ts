import crypto from "crypto";
import CertificateModel, { ICertificate } from "../models/certificate.model";
import CourseModel from "../models/course.model";
import EnrollmentModel from "../models/enrollment.model";
import QuizModel from "../models/quiz.model";
import QuizAttemptModel from "../models/quizAttempt.model";
import NotificationModel from "../models/notification.model";
import userModel from "../models/user.model";
import { getSettings } from "./settings.service";
import AssignmentModel from "../models/assignment.model";
import AssignmentSubmissionModel from "../models/assignmentSubmission.model";
import { DEFAULT_COMPLETION_RULES, ICompletionRules, describeRules, withDefaults } from "./completionRules.service";


// ---------------------------------------------------------------------------
// 1. The rule (pure - no database, so it can be tested on its own)
// ---------------------------------------------------------------------------
// What counts as "completed" is set per course (see completionRules.service.ts).
// The defaults are the platform's original rule:
//   a) every lesson is complete (completionPercentage reached 100), and
//   b) every quiz in the course has been passed at least once,
//   c) assignments are not required (they are graded by hand and can take days).
// A course with no lessons can never be "complete" (its percentage is 0 and
// the lesson share is at least 1%), so it never qualifies.

export interface IQuizPassState {
  quizId: string;
  title: string;
  passed: boolean;
}

export interface IAssignmentState {
  assignmentId: string;
  title: string;
  submitted: boolean;
  scorePercent: number | null; // null = not graded (yet)
}

export interface IPendingAssignment {
  assignmentId: string;
  title: string;
  reason: "not submitted" | "not graded yet" | "below the pass mark";
}

export interface IEligibility {
  eligible: boolean;
  lessonsComplete: boolean;
  completionPercentage: number;
  requiredLessonPercent: number;
  pendingQuizzes: { quizId: string; title: string }[];
  pendingAssignments: IPendingAssignment[];
}

export const computeEligibility = (
  completionPercentage: number,
  quizzes: IQuizPassState[],
  rules: ICompletionRules = DEFAULT_COMPLETION_RULES,
  assignments: IAssignmentState[] = []
): IEligibility => {
  const lessonsComplete = completionPercentage >= rules.lessonPercent;

  const required =
    rules.quizzes === "none"
      ? []
      : rules.quizzes === "selected"
        ? quizzes.filter((q) => rules.quizIds.includes(q.quizId)) // a deleted quiz simply drops out
        : quizzes;
  const pendingQuizzes = required
    .filter((q) => !q.passed)
    .map((q) => ({ quizId: q.quizId, title: q.title }));

  const pendingAssignments: IPendingAssignment[] = [];
  if (rules.assignments !== "none") {
    for (const a of assignments) {
      if (!a.submitted) {
        pendingAssignments.push({ assignmentId: a.assignmentId, title: a.title, reason: "not submitted" });
      } else if (rules.assignments === "passed") {
        if (a.scorePercent === null) {
          pendingAssignments.push({ assignmentId: a.assignmentId, title: a.title, reason: "not graded yet" });
        } else if (a.scorePercent < rules.assignmentPassPercent) {
          pendingAssignments.push({ assignmentId: a.assignmentId, title: a.title, reason: "below the pass mark" });
        }
      }
    }
  }

  return {
    eligible: lessonsComplete && pendingQuizzes.length === 0 && pendingAssignments.length === 0,
    lessonsComplete,
    completionPercentage,
    requiredLessonPercent: rules.lessonPercent,
    pendingQuizzes,
    pendingAssignments,
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
): Promise<(IEligibility & { enrollmentStatus: string; completedAt?: Date; requirements: string[] }) | null> => {
  const enrollment = await EnrollmentModel.findOne({
    student: studentId,
    course: courseId,
    status: { $in: ["active", "completed"] },
  });
  if (!enrollment) return null;

  const course = await CourseModel.findById(courseId).select("completionRules").lean();
  const rules = withDefaults((course as any)?.completionRules);

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

  // assignments only matter when the course's rules ask for them
  let assignmentStates: IAssignmentState[] = [];
  if (rules.assignments !== "none") {
    const [assignments, submissions] = await Promise.all([
      AssignmentModel.find({ course: courseId }).select("_id title maxMarks").lean(),
      AssignmentSubmissionModel.find({ course: courseId, student: studentId }).select("assignment marks").lean(),
    ]);
    const byAssignment = new Map(submissions.map((s: any) => [String(s.assignment), s]));
    assignmentStates = assignments.map((a: any) => {
      const sub: any = byAssignment.get(String(a._id));
      return {
        assignmentId: String(a._id),
        title: a.title,
        submitted: !!sub,
        scorePercent:
          sub && typeof sub.marks === "number" && a.maxMarks > 0 ? Math.round((sub.marks / a.maxMarks) * 1000) / 10 : null,
      };
    });
  }

  const result = computeEligibility(
    enrollment.completionPercentage,
    quizzes.map((q) => ({
      quizId: String(q._id),
      title: q.title,
      passed: passedQuizIds.has(String(q._id)),
    })),
    rules,
    assignmentStates
  );

  return {
    ...result,
    requirements: describeRules(rules, Object.fromEntries(quizzes.map((q) => [String(q._id), q.title]))),
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
