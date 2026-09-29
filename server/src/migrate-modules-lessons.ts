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
// Safe to run more than once: a course with no `courseData` left (already
// migrated) is skipped.
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
  let modulesCreated = 0;
  let lessonsCreated = 0;

  for (const course of courses) {
    const courseData = (course as any).courseData;
    if (!Array.isArray(courseData) || courseData.length === 0) {
      coursesSkipped++;
      continue;
    }

    const alreadyMigrated = await ModuleModel.exists({ course: course._id });
    if (alreadyMigrated) {
      coursesSkipped++;
      continue;
    }

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
          title: item.title,
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
  }

  console.log(
    `\nCourses migrated: ${coursesMigrated}, skipped (already done or empty): ${coursesSkipped}.`
  );
  console.log(`Modules created: ${modulesCreated}. Lessons created: ${lessonsCreated}.`);

  await mongoose.disconnect();
  await redis.quit();
  process.exit(0);
};

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
