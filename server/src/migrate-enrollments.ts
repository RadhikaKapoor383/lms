// One-time migration: turn the old "user.courses" list into real Enrollment records.
//
// Before, "who is enrolled in what" lived only in user.courses. Course access is
// now checked against the Enrollment collection, so every existing student needs
// their enrollments created - otherwise they lose access to courses they had.
//
//   npm run migrate:enrollments
//
// Safe to run more than once: an existing (student, course) pair is skipped.
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "./utils/db";
import { redis } from "./utils/redis";
import userModel from "./models/user.model";
import CourseModel from "./models/course.model";
import OrderModel from "./models/order.model";
import EnrollmentModel from "./models/enrollment.model";

const migrate = async () => {
  await connectDB();

  const users = await userModel.find({ "courses.0": { $exists: true } });
  console.log(`Found ${users.length} user(s) with enrolled courses`);

  let created = 0;
  let skipped = 0;
  let missingCourses = 0;

  for (const user of users) {
    for (const entry of user.courses) {
      const course = await CourseModel.findById(entry.courseId).select("instructor");
      if (!course) {
        missingCourses++; // course was deleted after the purchase
        continue;
      }

      // Had an order -> it was a purchase; otherwise treat it as a self-enrollment
      const order = await OrderModel.findOne({
        userId: String(user._id),
        courseId: String(entry.courseId),
      }).select("createdAt");

      const result = await EnrollmentModel.updateOne(
        { student: user._id, course: course._id },
        {
          $setOnInsert: {
            instructor: course.instructor,
            method: order ? "paid" : "self",
            status: "active",
            completionPercentage: 0,
            ...(order ? { createdAt: (order as any).createdAt } : {}),
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) created++;
      else skipped++;
    }
  }

  console.log(
    `Enrollments created: ${created}, already existed: ${skipped}, courses missing: ${missingCourses}`
  );

  await mongoose.disconnect();
  await redis.quit();
  process.exit(0);
};

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
