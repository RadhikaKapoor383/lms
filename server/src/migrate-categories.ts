// One-time migration for the move from a free-text "tags" string on each
// course to a real Category collection (course.category -> Category._id).
//
//   npm run migrate:categories
//
// Safe to run more than once: a category name that already exists is reused,
// and a course that already has `category` set is left alone.
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "./utils/db";
import { redis } from "./utils/redis";
import CourseModel from "./models/course.model";
import CategoryModel from "./models/category.model";
import LayoutModel from "./models/layout.model";

const findOrCreateCategory = async (rawName: string) => {
  const name = rawName.trim();
  if (!name) return null;

  const existing = await CategoryModel.findOne({
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });
  if (existing) return existing;

  return CategoryModel.create({ name });
};

const migrate = async () => {
  await connectDB();

  // 1. Bring in any category names an admin already typed into the old
  //    "Categories" layout, so the new dropdown isn't empty on day one.
  const layoutCategories = await LayoutModel.findOne({ type: "Categories" });
  let importedFromLayout = 0;
  for (const c of (layoutCategories as any)?.categories || []) {
    if (c?.title) {
      await findOrCreateCategory(c.title);
      importedFromLayout++;
    }
  }

  // 2. Every course's old free-text `tags` becomes (or reuses) a Category,
  //    and the course is pointed at it.
  // Old, unmigrated courses still have a raw `tags` string in MongoDB even
  // though the schema no longer declares that field. Mongoose strips
  // out-of-schema fields when it hydrates a normal document, so this has to
  // be a `.lean()` read to actually see `tags`.
  const courses = await CourseModel.find({
    category: { $exists: false },
  })
    .select("name tags category")
    .lean();

  console.log(`Found ${courses.length} course(s) without a category`);

  let migrated = 0;
  let skippedNoTag = 0;

  for (const course of courses) {
    const tag = (course as any).tags;
    if (!tag) {
      skippedNoTag++;
      continue;
    }
    const category = await findOrCreateCategory(tag);
    if (!category) {
      skippedNoTag++;
      continue;
    }
    await CourseModel.updateOne(
      { _id: course._id },
      { $set: { category: category._id }, $unset: { tags: "" } }
    );
    migrated++;
  }

  const totalCategories = await CategoryModel.countDocuments();
  console.log(
    `Categories imported from Layout: ${importedFromLayout}. Courses migrated: ${migrated}, skipped (no tag): ${skippedNoTag}. Total categories: ${totalCategories}.`
  );
  if (skippedNoTag > 0) {
    console.log(
      "Some courses had no tag at all - assign them a category from the admin panel."
    );
  }

  await mongoose.disconnect();
  await redis.quit();
  process.exit(0);
};

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
