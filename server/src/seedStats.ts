// Fills MongoDB with realistic activity so the admin and instructor statistics
// have something to show: months of sign-ups, enrolments, lesson progress, quiz
// attempts, assignment grades, reviews, certificates, discussions and so on.
//
//   npm run seed:stats -- --yes              add the data
//   npm run seed:stats -- --yes --reset      remove what this script added, then add it again
//   npm run seed:stats -- --yes --remove     only remove what this script added
//   options: --students=150   --seed=2026   --force (allow NODE_ENV=production)
//
// It writes straight into the collections (not through the website), with dates
// spread over the last ~6 months. It only ever creates its own records - people
// with an e-mail ending in @learners.ledger.example / @faculty.ledger.example,
// and the courses those instructors own - and `--remove` deletes exactly those,
// so your real accounts and courses are never touched. Needs an admin account
// to exist already (npm run seed creates one).

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

import userModel from "./models/user.model";
import CourseModel from "./models/course.model";
import CategoryModel from "./models/category.model";
import ModuleModel from "./models/module.model";
import LessonModel from "./models/lesson.model";
import EnrollmentModel from "./models/enrollment.model";
import LessonProgressModel from "./models/lessonProgress.model";
import QuizModel from "./models/quiz.model";
import QuizAttemptModel from "./models/quizAttempt.model";
import QuizStartModel from "./models/quizStart.model";
import AssignmentModel from "./models/assignment.model";
import AssignmentSubmissionModel from "./models/assignmentSubmission.model";
import CertificateModel from "./models/certificate.model";
import DiscussionModel from "./models/discussion.model";
import ReportModel from "./models/report.model";
import AnnouncementModel from "./models/announcement.model";
import NotificationModel from "./models/notification.model";
import AuditLogModel from "./models/auditLog.model";
import OrderModel from "./models/order.model";
import CourseMaterialModel from "./models/courseMaterial.model";
import crypto from "crypto";
import {
  ANNOUNCEMENTS_COURSE, ANNOUNCEMENTS_PLATFORM, ASSIGNMENT_TITLES, CATEGORIES, COURSES, DISCUSSION_BODIES,
  DISCUSSION_TITLES, FEEDBACK_TEXTS, FIRST_NAMES, INSTRUCTORS, INSTRUCTOR_EMAIL_DOMAIN, LAST_NAMES,
  QUESTION_BANKS, REPLY_BODIES_INSTRUCTOR, REPLY_BODIES_STUDENT, REVIEW_COMMENTS, STUDENT_EMAIL_DOMAIN,
  SUBMISSION_TEXTS,
} from "./seedData/statsContent";

// ----------------------------------------------------------------- options
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const numArg = (name: string, fallback: number) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  const n = a ? Number(a.split("=")[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const STUDENT_COUNT = Math.round(numArg("students", 150));
const SEED = numArg("seed", 2026);
const PASSWORD = process.env.SEED_PASSWORD || "Learn@2026";
const SEED_EMAIL = new RegExp(`@(${STUDENT_EMAIL_DOMAIN}|${INSTRUCTOR_EMAIL_DOMAIN})$`.replace(/\./g, "\\."));

// -------------------------------------------------- repeatable randomness
// The same --seed always gives the same data (mulberry32).
const makeRandom = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const rand = makeRandom(SEED);
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const intBetween = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));
const chance = (p: number) => rand() < p;
const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)];
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const shuffle = <T,>(items: T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const weightedPick = <T,>(items: T[], weight: (t: T) => number): T => {
  const total = items.reduce((s, i) => s + weight(i), 0);
  let r = rand() * total;
  for (const i of items) { r -= weight(i); if (r <= 0) return i; }
  return items[items.length - 1];
};

// Small copies of two app helpers (certificate id format, average rating). They
// are written out here, not imported, because importing the app's controllers
// also starts a Redis connection, which a seed script has no use for.
const generateCertificateId = (): string => {
  const hex = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `CERT-${hex.match(/.{4}/g)!.join("-")}`;
};
const computeAverageRating = (ratings: number[]): number =>
  ratings.length === 0 ? 0 : Math.round((ratings.reduce((t, r) => t + r, 0) / ratings.length) * 10) / 10;

const NOW = new Date();
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d: number) => new Date(+NOW - d * DAY);
const addDays = (d: Date, n: number) => new Date(+d + n * DAY);
const notFuture = (d: Date) => new Date(Math.min(+d, +NOW - 60 * 1000));
const oid = () => new mongoose.Types.ObjectId();

// ----------------------------------------------------- building documents
// Records are built with the app's own models (so a typo in a field name is
// caught by validation) but inserted directly, so the dates stay as chosen.
type Row = Record<string, any>;
const bucket: Map<any, Row[]> = new Map();
const add = (Model: any, data: Row, createdAt: Date, updatedAt: Date = createdAt) => {
  const doc = new Model(data);
  const err = doc.validateSync();
  if (err) throw new Error(`${Model.modelName}: ${err.message}\n${JSON.stringify(data).slice(0, 300)}`);
  const row = doc.toObject();
  row.createdAt = createdAt;
  row.updatedAt = updatedAt;
  if (!bucket.has(Model)) bucket.set(Model, []);
  bucket.get(Model)!.push(row);
  return row;
};
const flush = async () => {
  const counts: [string, number][] = [];
  for (const [Model, rows] of bucket) {
    for (let i = 0; i < rows.length; i += 400) await Model.collection.insertMany(rows.slice(i, i + 400), { ordered: false });
    counts.push([Model.modelName, rows.length]);
  }
  return counts;
};

// ------------------------------------------------------------ site cache
// The website keeps the public course list ("allCourses") and every course page
// in Redis for a week. This script writes straight into MongoDB, so without
// clearing those the Browse-courses page would keep showing the OLD list (the
// admin statistics read MongoDB directly and are always right). Best effort: if
// Redis can't be reached nothing is lost, the cache just expires by itself.
const clearSiteCache = async (courseIds: string[]) => {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("(REDIS_URL is not set, so the website's course cache was not touched.)");
    return;
  }
  const { Redis } = await import("ioredis");
  const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null, connectTimeout: 3000 });
  client.on("error", () => { /* handled below */ });
  try {
    await client.connect();
    await client.del("allCourses", ...courseIds);
    console.log(`Cleared the website's course cache (the course list + ${courseIds.length} course pages), so the changes show up straight away.`);
  } catch {
    console.log("Could not reach Redis, so the website may keep showing the old course list for a while.\n  Clear it yourself with: redis-cli DEL allCourses");
  } finally {
    client.disconnect();
  }
};

// The courses this script owns (the ones its instructors teach).
const seededCourseIds = async (): Promise<string[]> => {
  const instructors = await userModel.find({ email: { $regex: SEED_EMAIL }, role: "instructor" }).select("_id").lean();
  const courses = await CourseModel.find({ instructor: { $in: instructors.map((u: any) => u._id) } }).select("_id").lean();
  return courses.map((c: any) => String(c._id));
};

// ------------------------------------------------------------- removing
const removeSeeded = async (): Promise<string[]> => {
  const people = await userModel.find({ email: { $regex: SEED_EMAIL } }).select("_id role").lean();
  const ids = people.map((u: any) => u._id);
  const idStrings = ids.map(String);
  const instructorIds = people.filter((u: any) => u.role === "instructor").map((u: any) => u._id);
  const courseIds = (await CourseModel.find({ instructor: { $in: instructorIds } }).select("_id").lean()).map((c: any) => c._id);
  const del = async (name: string, Model: any, filter: Row) => {
    const r = await Model.deleteMany(filter);
    if (r.deletedCount) console.log(`  removed ${String(r.deletedCount).padStart(5)} ${name}`);
  };
  await del("lesson progress", LessonProgressModel, { $or: [{ course: { $in: courseIds } }, { student: { $in: ids } }] });
  await del("enrolments", EnrollmentModel, { $or: [{ course: { $in: courseIds } }, { student: { $in: ids } }] });
  await del("quiz attempts", QuizAttemptModel, { $or: [{ course: { $in: courseIds } }, { student: { $in: ids } }] });
  await del("quiz starts", QuizStartModel, { student: { $in: ids } });
  await del("quizzes", QuizModel, { course: { $in: courseIds } });
  await del("assignment submissions", AssignmentSubmissionModel, { $or: [{ course: { $in: courseIds } }, { student: { $in: ids } }] });
  await del("assignments", AssignmentModel, { course: { $in: courseIds } });
  await del("certificates", CertificateModel, { $or: [{ course: { $in: courseIds } }, { student: { $in: ids } }] });
  await del("reports", ReportModel, { course: { $in: courseIds } });
  await del("discussions", DiscussionModel, { course: { $in: courseIds } });
  await del("announcements", AnnouncementModel, { $or: [{ course: { $in: courseIds } }, { authorName: "Ledger Team" }, { createdBy: { $in: idStrings } }] });
  await del("materials", CourseMaterialModel, { course: { $in: courseIds } });
  await del("lessons", LessonModel, { course: { $in: courseIds } });
  await del("modules", ModuleModel, { course: { $in: courseIds } });
  await del("orders", OrderModel, { $or: [{ userId: { $in: idStrings } }, { courseId: { $in: courseIds.map(String) } }] });
  await del("notifications", NotificationModel, { userId: { $in: idStrings } });
  await del("activity log entries", AuditLogModel, { $or: [{ userId: { $in: idStrings } }, { "meta.seed": true }] });
  await del("courses", CourseModel, { _id: { $in: courseIds } });
  await del("users", userModel, { _id: { $in: ids } });
  return courseIds.map(String);
};

// ------------------------------------------------------------------ main
const main = async () => {
  const dbUrl = process.env.DB_URL;
  if (!dbUrl) throw new Error("DB_URL is not set (check server/.env)");
  await mongoose.connect(dbUrl);
  const dbName = mongoose.connection.name;
  console.log(`Database: ${dbName} on ${mongoose.connection.host}`);

  if (process.env.NODE_ENV === "production" && !flag("force")) {
    throw new Error("NODE_ENV is production - refusing to add sample activity. Use --force if you really mean it.");
  }
  if (!flag("yes")) {
    console.log("\nThis adds sample activity to the database above (or removes it with --remove).");
    console.log("Nothing was changed. Run it again with --yes to go ahead:\n  npm run seed:stats -- --yes");
    return;
  }

  const existing = await userModel.countDocuments({ email: { $regex: SEED_EMAIL } });
  let staleCourseIds: string[] = []; // pages of courses that were removed
  if (flag("reset") || flag("remove")) {
    console.log("Removing what this script added earlier...");
    staleCourseIds = await removeSeeded();
    if (flag("remove")) { await clearSiteCache(staleCourseIds); console.log("Done."); return; }
  } else if (existing > 0) {
    throw new Error(`${existing} seeded accounts already exist. Use --reset to replace them, or --remove to delete them.`);
  }

  const admin: any = await userModel.findOne({ role: "admin" }).lean();
  if (!admin) throw new Error("No admin account found. Run `npm run seed` first to create one.");

  const passwordHash = await bcrypt.hash(PASSWORD, 10); // one hash shared by every seeded account
  const oneVideo = "https://www.youtube.com/embed/ysz5S6PUM-U";

  // ---- categories
  const categoryId: Record<string, any> = {};
  for (const name of CATEGORIES) {
    let c: any = await CategoryModel.findOne({ name });
    if (!c) {
      c = await CategoryModel.create({ name });
      add(AuditLogModel, { userId: String(admin._id), userName: admin.name, action: "category.create", targetLabel: name, meta: { seed: true } }, daysAgo(190));
    }
    categoryId[name] = c._id;
  }

  // ---- instructors
  const instructors = INSTRUCTORS.map((i, idx) => {
    const created = daysAgo(between(175, 205));
    const row = add(userModel, {
      name: i.name, email: `${i.slug}@${INSTRUCTOR_EMAIL_DOMAIN}`, password: passwordHash, role: "instructor",
      isVerified: true, isActive: true, approvalStatus: "approved", bio: i.bio, expertise: i.expertise, courses: [],
    }, created);
    return { ...row, idx };
  });

  // ---- courses, modules, lessons
  interface ICourseRun { seed: any; row: Row; lessons: Row[]; quizzes: Row[]; assignments: Row[]; published: boolean; enrolled: number }
  const courses: ICourseRun[] = [];
  COURSES.forEach((c, i) => {
    const published = c.status === "Published" || c.status === "Archived";
    const created = c.status === "Published" ? daysAgo(between(105, 170)) : c.status === "Archived" ? daysAgo(between(150, 175)) : daysAgo(between(2, 25));
    const owner = instructors[c.instructor];
    const row = add(CourseModel, {
      instructor: owner._id, name: c.name, description: c.description, price: c.price, estimatedPrice: c.price ? Math.round(c.price * 1.8) : undefined,
      thumbnail: { public_id: "", url: "" }, category: categoryId[c.category], level: c.level, durationHours: c.durationHours,
      demoUrl: oneVideo, benefits: [{ title: "Certificate of completion" }, { title: "Lifetime access" }],
      prerequisites: [{ title: c.level === "Beginner" ? "No experience needed" : "Comfortable with the basics" }],
      reviews: [], ratings: 0, purchased: 0, status: c.status, enrollmentMode: "open",
    }, created, c.status === "Published" ? addDays(created, between(5, 40)) : created);
    const lessons: Row[] = [];
    c.modules.forEach((m, mi) => {
      const mod = add(ModuleModel, { course: row._id, title: m.title, order: mi }, created);
      m.lessons.forEach((title, li) => {
        lessons.push(add(LessonModel, {
          module: mod._id, course: row._id, title, description: `${title}. Part of "${m.title}".`, videoUrl: oneVideo,
          videoLength: intBetween(6, 25), videoPlayer: "youtube", links: [], suggestion: "", questions: [], order: lessons.length,
        }, created));
      });
    });
    add(AuditLogModel, { userId: String(owner._id), userName: owner.name, action: "course.create", targetLabel: c.name, meta: { courseId: String(row._id), seed: true } }, created);
    if (published && chance(0.8)) add(AuditLogModel, { userId: String(owner._id), userName: owner.name, action: "course.edit", targetLabel: c.name, meta: { courseId: String(row._id), seed: true } }, addDays(created, between(3, 60)));
    courses.push({ seed: c, row, lessons, quizzes: [], assignments: [], published: c.status === "Published", enrolled: 0 });
    void i;
  });

  // ---- quizzes and assignments (published courses only)
  for (const run of courses.filter((r) => r.published)) {
    const owner = instructors[run.seed.instructor];
    const bank = QUESTION_BANKS[run.seed.category];
    const quizCount = run.seed.modules.length >= 3 ? 2 : 1;
    for (let q = 0; q < quizCount; q++) {
      const qs = shuffle(bank).slice(0, 6).map((b) => ({
        _id: oid(), questionText: b.text, type: b.type, marks: b.marks,
        options: (b.options || []).map((o) => ({ text: o.text, isCorrect: o.correct })), acceptedAnswers: b.accepted || [],
      }));
      const created = addDays(run.row.createdAt, between(8, 45));
      const quiz = add(QuizModel, {
        course: run.row._id, instructor: owner._id, title: q === 0 ? `${run.seed.name}: knowledge check` : `${run.seed.name}: final quiz`,
        description: "Check what you have learned so far.", questions: qs, timeLimitMinutes: chance(0.6) ? pick([10, 15, 20]) : undefined,
        maxAttempts: 3, passingScore: pick([60, 60, 70]), randomizeQuestions: chance(0.4), showResultsImmediately: true,
      }, created);
      (quiz as any).isFinal = q === 1 || quizCount === 1;
      run.quizzes.push(quiz);
      add(AuditLogModel, { userId: String(owner._id), userName: owner.name, action: "quiz.create", targetLabel: quiz.title, meta: { courseId: String(run.row._id), seed: true } }, created);
    }
    const assignmentCount = intBetween(1, 2);
    for (let a = 0; a < assignmentCount; a++) {
      const created = addDays(run.row.createdAt, between(10, 40) + a * 25);
      const upcoming = a === assignmentCount - 1 && chance(0.55);
      const deadline = upcoming ? addDays(NOW, between(3, 13)) : addDays(created, between(21, 50));
      const createdAt = upcoming ? daysAgo(between(8, 20)) : created;
      const as = add(AssignmentModel, {
        course: run.row._id, instructor: owner._id, title: `${pick(ASSIGNMENT_TITLES)} (${run.seed.name})`,
        instructions: "Complete the task described in the lesson and submit your work as text or a link.", resources: [],
        maxMarks: pick([10, 20, 50, 100]), deadline, allowResubmission: chance(0.3), deadlineReminderSent: +deadline < +NOW,
      }, notFuture(createdAt));
      run.assignments.push(as);
      add(AuditLogModel, { userId: String(owner._id), userName: owner.name, action: "assignment.create", targetLabel: as.title, meta: { courseId: String(run.row._id), seed: true } }, notFuture(createdAt));
    }
  }

  // ---- students
  type Archetype = "completer" | "steady" | "dropped" | "fresh";
  interface IStudent { row: Row; skill: number; archetype: Archetype; enrollments: any[] }
  const usedEmails = new Set<string>();
  const students: IStudent[] = [];
  for (let i = 0; i < STUDENT_COUNT; i++) {
    const archetype = weightedPick<Archetype>(["completer", "steady", "dropped", "fresh"], (a) => ({ completer: 25, steady: 33, dropped: 27, fresh: 15 }[a]));
    const age = archetype === "fresh" ? between(1, 24) : archetype === "completer" ? between(55, 168) : archetype === "dropped" ? between(35, 165) : between(18, 150);
    let name = "", email = "";
    do {
      const f = pick(FIRST_NAMES), l = pick(LAST_NAMES);
      name = `${f} ${l}`;
      email = `${f}.${l}${usedEmails.has(`${f}.${l}`.toLowerCase()) ? intBetween(2, 99) : ""}@${STUDENT_EMAIL_DOMAIN}`.toLowerCase();
    } while (usedEmails.has(email));
    usedEmails.add(email);
    usedEmails.add(email.split("@")[0]);
    const row = add(userModel, {
      name, email, password: passwordHash, role: "student", isVerified: true, isActive: !(archetype === "dropped" && chance(0.07)),
      approvalStatus: "approved", bio: "", expertise: [], courses: [],
    }, daysAgo(age));
    students.push({ row, skill: clamp(0.2 + rand() * 0.7, 0.2, 0.9), archetype, enrollments: [] });
  }

  // ---- enrolments and lesson progress
  const published = courses.filter((c) => c.published);
  const when = (lo: Date, hi: Date) => new Date(+lo + rand() * Math.max(0, +hi - +lo));
  for (const s of students) {
    const wanted = weightedPick([1, 2, 3, 4, 5], (n) => ({ 1: 30, 2: 30, 3: 20, 4: 12, 5: 8 }[n as 1] ));
    const chosen = new Set<ICourseRun>();
    let guard = 0;
    while (chosen.size < Math.min(wanted, published.length) && guard++ < 60) chosen.add(weightedPick(published, (c) => c.seed.popularity));
    for (const run of chosen) {
      const total = run.lessons.length;
      let archetype = s.archetype;
      // when the student joined, the course must already exist
      const earliest = new Date(Math.max(+s.row.createdAt, +addDays(run.row.createdAt, 4)));
      let enrolledAt = archetype === "fresh" ? daysAgo(between(0.3, 14)) : addDays(earliest, between(0, 12));
      if (+enrolledAt < +s.row.createdAt) enrolledAt = addDays(s.row.createdAt, between(0.1, 3));
      if (+enrolledAt > +NOW - 6 * 3600 * 1000) enrolledAt = daysAgo(between(0.3, 2));
      if (+enrolledAt < +s.row.createdAt) continue;
      if (archetype === "dropped" && +NOW - +enrolledAt < 22 * DAY) archetype = "steady";

      // how many lessons, and when the last one was finished
      let k = 0;
      let lastDate = enrolledAt;
      const room = (+NOW - 0.5 * DAY - +enrolledAt) / DAY; // days available to study
      if (archetype === "completer") {
        k = Math.min(total, Math.floor(room / 0.8));
        lastDate = addDays(enrolledAt, k === total ? Math.min(room, between(total * 1.1, total * 4)) : room);
      } else if (archetype === "steady") {
        k = Math.min(Math.round(total * between(0.25, 0.9)), Math.floor(room / 0.8));
        lastDate = daysAgo(between(0.5, 11));
      } else if (archetype === "dropped") {
        k = Math.max(1, Math.round(total * between(0.1, 0.5)));
        const stop = Math.max(+enrolledAt + k * 0.5 * DAY, +NOW - between(18, 80) * DAY);
        lastDate = new Date(Math.min(stop, +NOW - 18 * DAY));
        if (+lastDate <= +enrolledAt + k * 0.3 * DAY) k = Math.max(0, Math.floor((+lastDate - +enrolledAt) / (0.5 * DAY)));
      } else {
        k = Math.min(intBetween(0, 3), Math.floor(room / 0.8));
        lastDate = daysAgo(between(0.2, 4));
      }
      k = Math.max(0, Math.min(total, k));
      if (+lastDate <= +enrolledAt) { lastDate = addDays(enrolledAt, 0.3); k = Math.min(k, 1); }
      lastDate = notFuture(lastDate);

      const percent = total ? Math.round((100 * k) / total) : 0;
      const done = k === total && total > 0;
      const price = run.seed.price;
      const method = price > 0 ? weightedPick(["paid", "instructor", "code"], (m) => ({ paid: 70, instructor: 20, code: 10 }[m as "paid"])) : weightedPick(["self", "instructor", "code"], (m) => ({ self: 78, instructor: 14, code: 8 }[m as "self"]));
      const lessonTimes = Array.from({ length: k }, () => when(addDays(enrolledAt, 0.2), lastDate)).sort((a, b) => +a - +b);
      const enrollment = add(EnrollmentModel, {
        student: s.row._id, course: run.row._id, instructor: run.row.instructor, method, status: done ? "completed" : "active",
        completionPercentage: percent, completedAt: done ? lessonTimes[k - 1] : undefined,
      }, enrolledAt, lessonTimes[k - 1] || enrolledAt);
      lessonTimes.forEach((t, li) => add(LessonProgressModel, { student: s.row._id, course: run.row._id, enrollment: enrollment._id, lessonId: run.lessons[li]._id, completedAt: t }, t));
      s.row.courses.push({ courseId: String(run.row._id) });
      run.enrolled++;
      s.enrollments.push({ run, enrollment, k, total, done, lessonTimes, enrolledAt, lastDate, archetype });
      if (method === "paid") {
        add(OrderModel, {
          courseId: String(run.row._id), userId: String(s.row._id), amount: price, currency: "usd", status: "paid", provider: "simulated",
          transactionId: `sim_${oid().toHexString().slice(0, 14)}`, payment_info: { id: `sim_${oid().toHexString().slice(0, 10)}`, status: "succeeded" }, enrollment: enrollment._id,
        }, enrolledAt);
      }
      if (method === "instructor") {
        const owner = instructors[run.seed.instructor];
        add(AuditLogModel, { userId: String(owner._id), userName: owner.name, action: "enrollment.create", targetLabel: `${s.row.name} in ${run.seed.name}`, meta: { courseId: String(run.row._id), seed: true } }, enrolledAt);
      }
    }
  }

  // a few refunded purchases: enrolment revoked, order refunded
  const paidOrders = bucket.get(OrderModel) || [];
  const enrollRows = bucket.get(EnrollmentModel) || [];
  shuffle(paidOrders).slice(0, 5).forEach((o) => {
    o.status = "refunded";
    const e = enrollRows.find((x) => String(x._id) === String(o.enrollment));
    if (e) { e.status = "revoked"; }
  });

  // ---- quiz attempts
  const answerFor = (q: any, correct: boolean) => {
    if (q.type === "shortAnswer") return { questionId: q._id, selectedOptionIndexes: [], textAnswer: correct ? q.acceptedAnswers[0] : "not sure" };
    const right = q.options.map((o: any, i: number) => (o.isCorrect ? i : -1)).filter((i: number) => i >= 0);
    const wrong = q.options.map((o: any, i: number) => (!o.isCorrect ? i : -1)).filter((i: number) => i >= 0);
    if (correct) return { questionId: q._id, selectedOptionIndexes: right };
    if (q.type === "multiple" && right.length > 1) return { questionId: q._id, selectedOptionIndexes: right.slice(1) };
    return { questionId: q._id, selectedOptionIndexes: [pick(wrong)] };
  };
  let attemptCount = 0;
  for (const s of students) {
    for (const en of s.enrollments) {
      if (bucket.get(EnrollmentModel)!.find((e) => String(e._id) === String(en.enrollment._id))?.status === "revoked") continue;
      for (const quiz of en.run.quizzes) {
        const needed = quiz.isFinal ? en.done : en.k >= Math.ceil(en.total * 0.5);
        // Someone who finished the course has passed every quiz (that is what earns the
        // certificate), so they always take them and keep trying until they pass.
        if (!needed || !chance(en.done ? 1 : 0.82)) continue;
        const position = quiz.isFinal ? en.k - 1 : Math.ceil(en.total * 0.5) - 1;
        let at = new Date(Math.max(+(en.lessonTimes[position] || en.enrolledAt), +quiz.createdAt) + between(0.1, 1.5) * DAY);
        let passed = false;
        for (let attempt = 1; attempt <= quiz.maxAttempts && !passed; attempt++) {
          if (+at > +NOW - 30 * 60 * 1000) { if (en.done) at = new Date(+NOW - between(1, 3) * 3600 * 1000); else break; }
          const totalMarks = quiz.questions.reduce((n: number, q: any) => n + q.marks, 0);
          const lastChance = attempt === quiz.maxAttempts;
          const timedOut = chance(0.02) && !!quiz.timeLimitMinutes && !(en.done && lastChance);
          let score = 0;
          let answers: any[] = [];
          if (!timedOut) {
            const p = clamp(0.22 + 0.72 * s.skill + 0.07 * (attempt - 1) + (en.done && lastChance ? 0.5 : 0), 0.05, 0.99);
            answers = quiz.questions.map((q: any) => { const ok = chance(p); if (ok) score += q.marks; return answerFor(q, ok); });
          }
          const percentage = Math.round((100 * score) / totalMarks);
          passed = percentage >= quiz.passingScore;
          const length = Math.min(quiz.timeLimitMinutes || 12, intBetween(3, 12));
          add(QuizAttemptModel, {
            quiz: quiz._id, course: en.run.row._id, student: s.row._id, answers, score, totalMarks, percentage, passed, attemptNumber: attempt,
            timedOut, startedAt: new Date(+at - length * 60000), submittedAt: at,
          }, at);
          attemptCount++;
          if (!passed && !en.done && !chance(0.4)) break; // many give up after a failed try
          at = addDays(at, between(0.3, 3));
        }
      }
    }
  }

  // ---- assignment submissions and grading
  const feedbackSeen = new Set<string>();
  void feedbackSeen;
  for (const s of students) {
    for (const en of s.enrollments) {
      if (bucket.get(EnrollmentModel)!.find((e) => String(e._id) === String(en.enrollment._id))?.status === "revoked") continue;
      const owner = instructors[en.run.seed.instructor];
      for (const a of en.run.assignments) {
        const deadline: Date = a.deadline;
        const future = +deadline > +NOW;
        if (+a.createdAt > +en.lastDate + 20 * DAY && !future) continue;
        const progress = en.total ? en.k / en.total : 0;
        const p = future ? (en.archetype === "dropped" ? 0 : 0.3 * (progress > 0.25 ? 1 : 0)) : (en.done ? 0.95 : progress >= 0.3 ? 0.72 : 0.12);
        if (!chance(p) || +en.enrolledAt > +deadline) continue;
        const late = !future && chance(0.12);
        let submittedAt = late ? addDays(deadline, between(0.2, 3)) : future ? daysAgo(between(0.2, 6)) : when(addDays(new Date(Math.max(+en.enrolledAt, +a.createdAt)), 1), deadline);
        if (+submittedAt <= +en.enrolledAt) submittedAt = addDays(en.enrolledAt, between(0.5, 2));
        if (+submittedAt > +NOW - 30 * 60 * 1000) continue;
        // "late" is decided from the final time, so the flag can never disagree with the dates
        const isLate = +submittedAt > +deadline;
        const gradedYet = +submittedAt <= +NOW - 4 * DAY && chance(0.88);
        const gradedAt = gradedYet ? notFuture(addDays(submittedAt, between(1, 4))) : undefined;
        const marks = gradedYet ? Math.round(a.maxMarks * clamp(s.skill * 0.85 + rand() * 0.25 - (isLate ? 0.1 : 0), 0.3, 1)) : undefined;
        add(AssignmentSubmissionModel, {
          assignment: a._id, course: en.run.row._id, student: s.row._id, submissionText: pick(SUBMISSION_TEXTS),
          fileUrl: chance(0.45) ? `https://drive.google.com/file/d/${oid().toHexString()}/view` : undefined, submittedAt, isLate,
          marks, feedback: gradedYet ? pick(FEEDBACK_TEXTS) : undefined, gradedBy: gradedYet ? owner._id : undefined, gradedAt,
        }, submittedAt, gradedAt || submittedAt);
      }
    }
  }

  // ---- certificates and reviews
  const platformName = "E-Learning";
  let certIndex = 0;
  const certs: Row[] = [];
  const reviewsByCourse = new Map<string, any[]>();
  for (const s of students) {
    for (const en of s.enrollments) {
      const status = bucket.get(EnrollmentModel)!.find((e) => String(e._id) === String(en.enrollment._id))?.status;
      if (status === "revoked") continue;
      const owner = instructors[en.run.seed.instructor];
      if (status === "completed") {
        const issued = notFuture(addDays(en.lastDate, between(0, 1)));
        certs.push(add(CertificateModel, {
          certificateId: generateCertificateId(), student: s.row._id, course: en.run.row._id, instructor: owner._id, studentName: s.row.name,
          courseName: en.run.seed.name, instructorName: owner.name, platformName, completionDate: en.lastDate, issuedAt: issued, status: "valid",
        }, issued));
        certIndex++;
      }
      const reviewChance = en.done ? 0.62 : en.k / Math.max(1, en.total) > 0.6 ? 0.25 : 0;
      if (chance(reviewChance)) {
        const rating = weightedPick([5, 4, 3, 2], (r) => ({ 5: 50, 4: 33, 3: 12, 2: 5 }[r as 5]));
        const createdAt = notFuture(addDays(en.lastDate, between(0.1, 6)));
        const list = reviewsByCourse.get(String(en.run.row._id)) || [];
        list.push({ _id: oid(), user: { _id: s.row._id, name: s.row.name }, rating, comment: pick(REVIEW_COMMENTS[rating]), createdAt, commentReplies: [] });
        reviewsByCourse.set(String(en.run.row._id), list);
      }
    }
  }
  certs.slice(0, 2).forEach((c) => { c.status = "revoked"; c.revokedAt = notFuture(addDays(c.issuedAt, between(1, 20))); c.revokedReason = "Issued in error"; });
  for (const run of courses) {
    const reviews = reviewsByCourse.get(String(run.row._id)) || [];
    run.row.reviews = reviews.sort((a, b) => +a.createdAt - +b.createdAt);
    run.row.ratings = computeAverageRating(reviews.map((r) => r.rating));
    const live = (bucket.get(EnrollmentModel) || []).filter((e) => String(e.course) === String(run.row._id) && e.status !== "revoked");
    run.row.purchased = live.length;
  }

  // ---- discussions, reports, announcements, notifications
  const discussions: Row[] = [];
  for (const run of published) {
    const owner = instructors[run.seed.instructor];
    const enrolled = students.filter((s) => s.enrollments.some((e) => e.run === run));
    if (enrolled.length < 3) continue;
    const threads = Math.min(enrolled.length, intBetween(3, 5));
    for (let t = 0; t < threads; t++) {
      const author = pick(enrolled);
      const en = author.enrollments.find((e) => e.run === run);
      const start = notFuture(addDays(en.enrolledAt, between(1, 30)));
      const replies: Row[] = [];
      const replyCount = intBetween(0, 4);
      let last = start;
      for (let r = 0; r < replyCount; r++) {
        last = notFuture(addDays(last, between(0.1, 2)));
        const byInstructor = r === 0 || chance(0.35);
        const replier = byInstructor ? owner : pick(enrolled).row;
        replies.push({ _id: oid(), author: replier._id, authorName: replier.name, authorRole: byInstructor ? "instructor" : "student", body: pick(byInstructor ? REPLY_BODIES_INSTRUCTOR : REPLY_BODIES_STUDENT), createdAt: last });
      }
      const row = add(DiscussionModel, {
        course: run.row._id, author: author.row._id, authorName: author.row.name, authorRole: "student",
        title: pick(DISCUSSION_TITLES).replace("{n}", String(intBetween(1, run.lessons.length))), body: pick(DISCUSSION_BODIES),
        pinned: t === 0 && chance(0.3), replies, lastActivityAt: last,
      }, start, last);
      discussions.push(row);
    }
  }
  const reportReasons: any[] = ["spam", "abuse", "inappropriate", "other"];
  shuffle(discussions).slice(0, 5).forEach((d, i) => {
    const reporter = pick(students.filter((s) => String(s.row._id) !== String(d.author))).row;
    const status = i < 3 ? "open" : i === 3 ? "resolved" : "dismissed";
    const created = notFuture(addDays(d.createdAt, between(0.5, 5)));
    add(ReportModel, {
      reporter: reporter._id, reporterName: reporter.name, targetType: "discussion", course: d.course, discussion: d._id, targetKey: `${d._id}:thread`,
      excerpt: String(d.body).slice(0, 120), contentAuthor: d.author, contentAuthorName: d.authorName, reason: pick(reportReasons), status,
      resolutionNote: status === "open" ? undefined : status === "resolved" ? "Removed the offending text." : "Reviewed - no problem found.",
      resolvedBy: status === "open" ? undefined : String(admin._id), resolvedAt: status === "open" ? undefined : notFuture(addDays(created, between(0.2, 3))),
    }, created);
  });

  for (const run of published) {
    const owner = instructors[run.seed.instructor];
    shuffle(ANNOUNCEMENTS_COURSE).slice(0, intBetween(1, 2)).forEach((a) => {
      const at = notFuture(addDays(run.row.createdAt, between(5, 100)));
      add(AnnouncementModel, { title: a.title, message: a.message, createdBy: String(owner._id), authorName: owner.name, course: run.row._id }, at);
      add(AuditLogModel, { userId: String(owner._id), userName: owner.name, action: "announcement.create", targetLabel: a.title, meta: { courseId: String(run.row._id), seed: true } }, at);
    });
  }
  ANNOUNCEMENTS_PLATFORM.forEach((a, i) => add(AnnouncementModel, { title: a.title, message: a.message, createdBy: String(admin._id), authorName: "Ledger Team" }, daysAgo(40 + i * 45)));

  for (const inst of instructors) {
    const mine = courses.filter((c) => instructors[c.seed.instructor] === inst && c.published);
    for (let n = 0; n < 5 && mine.length; n++) {
      const c = pick(mine);
      add(NotificationModel, { title: n % 2 ? "New submission to grade" : "New student enrolled", message: n % 2 ? `A student submitted an assignment in ${c.seed.name}.` : `Someone joined ${c.seed.name}.`, status: chance(0.5) ? "read" : "unread", userId: String(inst._id), link: "/instructor" }, daysAgo(between(0.2, 25)));
    }
  }
  students.slice(0, Math.min(60, students.length)).forEach((s) => {
    const en = s.enrollments[0];
    if (!en) return;
    add(NotificationModel, { title: "Welcome", message: `You are enrolled in ${en.run.seed.name}.`, status: chance(0.7) ? "read" : "unread", userId: String(s.row._id), link: "/my-courses" }, en.enrolledAt);
  });

  // finally: write everything
  const counts = await flush();
  console.log("\nAdded:");
  counts.sort((a, b) => b[1] - a[1]).forEach(([name, n]) => console.log(`  ${String(n).padStart(5)} ${name}`));
  const completed = (bucket.get(EnrollmentModel) || []).filter((e) => e.status === "completed").length;
  console.log(`\n${attemptCount} quiz attempts, ${certIndex} certificates (2 revoked), ${completed} completed enrolments.`);
  console.log(`\nEvery seeded account uses the password: ${PASSWORD}`);
  console.log(`  instructor example: ${INSTRUCTORS[0].slug}@${INSTRUCTOR_EMAIL_DOMAIN}`);
  console.log(`  student example:    ${String(students[0].row.email)}`);
  console.log("Remove it all again with: npm run seed:stats -- --yes --remove");
  console.log("");
  await clearSiteCache([...staleCourseIds, ...(await seededCourseIds())]);
};

main()
  .catch((e) => { console.error("\nSeed failed:", e.message); process.exitCode = 1; })
  .finally(async () => {
    await mongoose.disconnect();
    process.exit(process.exitCode ?? 0);
  });
