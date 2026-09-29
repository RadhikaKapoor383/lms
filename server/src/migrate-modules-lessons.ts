// One-time migration for the move from a flat, embedded `Course.courseData`
// array to real Module and Lesson collections.
//
//   npm run migrate:modules
//
// Each distinct `videoSection` value on a course becomes one Module (in
// order of first appearance); each courseData item becomes a Lesson, KEEPING
// its original _id so existing LessonProgress rows (a student's completed
// lessons) still point at the right lesson afterwards.
//
// Safe to run more than once, including after a previous run failed partway
// through: a course still keeps its `courseData` until it's fully migrated,
// so a re-run finds it again, wipes any half-created Module/Lesson docs from
// the failed attempt, and redoes that course from scratch. One course's data
// problem (e.g. a lesson with no title) is logged and skipped rather than
// stopping every course after it.
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "./utils/db";
import { redis } from "./utils/redis";
import CourseModel from "./models/course.model";
import ModuleModel from "./models/module.model";
import LessonModel from "./models/lesson.model";

const migrate = async () => {
  await connectDB();

  // `courseData` isn't in the schema anymore, so this has to be a `.lean()`
  // read to actually see the old raw field (see migrate-categories.ts for
  // the same situation with the old `tags` field).
  const courses = await CourseModel.find({}).select("name courseData").lean();

  let coursesMigrated = 0;
  let coursesSkipped = 0;
  let coursesFailed = 0;
  let modulesCreated = 0;
  let lessonsCreated = 0;

  for (const course of courses) {
    const courseData = (course as any).courseData;
    if (!Array.isArray(courseData) || courseData.length === 0) {
      coursesSkipped++;
      continue;
    }

    try {
      // Clear out anything left behind by an earlier, failed attempt at this
      // same course before redoing it - courseData (read above) is still the
      // source of truth, so nothing is lost by starting this course over.
      await ModuleModel.deleteMany({ course: course._id });
      await LessonModel.deleteMany({ course: course._id });

      const groups = new Map<string, any[]>();
      for (const item of courseData) {
        const sectionName = String(item?.videoSection || "").trim() || "General";
        if (!groups.has(sectionName)) groups.set(sectionName, []);
        groups.get(sectionName)!.push(item);
      }

      let moduleOrder = 0;
      for (const [title, items] of groups) {
        const module = await ModuleModel.create({ course: course._id, title, order: moduleOrder++ });
        modulesCreated++;

        let lessonOrder = 0;
        for (const item of items) {
          await LessonModel.create({
            _id: item._id, // preserve the id so LessonProgress rows still match
            module: module._id,
            course: course._id,
            // A handful of lessons in real data turned out to have a blank
            // title, which used to be allowed - fall back rather than losing
            // the lesson's video/description content over a missing label.
            title: String(item.title || "").trim() || "Untitled lesson",
            description: item.description,
            videoUrl: item.videoUrl,
            videoThumbnail: item.videoThumbnail,
            videoLength: item.videoLength,
            videoPlayer: item.videoPlayer,
            links: item.links || [],
            suggestion: item.suggestion,
            questions: item.questions || [],
            order: lessonOrder++,
          });
          lessonsCreated++;
        }
      }

      await CourseModel.updateOne({ _id: course._id }, { $unset: { courseData: "" } });
      coursesMigrated++;
      console.log(`Migrated: ${course.name} (${groups.size} module(s))`);
    } catch (err: any) {
      coursesFailed++;
      console.error(`Failed to migrate "${course.name}": ${err.message}`);
      console.error("Its courseData was left in place - fix the bad lesson and re-run to retry just this course.");
    }
  }

  console.log(
    `\nCourses migrated: ${coursesMigrated}, skipped (already done or empty): ${coursesSkipped}, failed: ${coursesFailed}.`
  );
  console.log(`Modules created: ${modulesCreated}. Lessons created: ${lessonsCreated}.`);

  await mongoose.disconnect();
  await redis.quit();
  process.exit(coursesFailed > 0 ? 1 : 0);
};

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});