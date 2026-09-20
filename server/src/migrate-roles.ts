// One-time migration for the move from 2 roles ("user" / "admin") to 3 roles
// ("student" / "instructor" / "admin").
//
// Run it ONCE, right after deploying the new user model:
//   npm run migrate:roles
//
// It is safe to run again - if nothing needs fixing it just reports 0.
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "./utils/db";
import { redis } from "./utils/redis";
import userModel, { USER_ROLES } from "./models/user.model";

const migrate = async () => {
  await connectDB();

  // Every user whose role is not one of the 3 valid roles ("user", or missing)
  // becomes a student. Admins are untouched.
  const legacyUsers = await userModel
    .find({ role: { $nin: [...USER_ROLES] } })
    .select("_id email");

  console.log(`Found ${legacyUsers.length} user(s) with a legacy role`);

  for (const user of legacyUsers) {
    await userModel.updateOne({ _id: user._id }, { $set: { role: "student" } });

    // The role is also cached inside the Redis session (see isAuthenticated),
    // so patch that too or the user keeps the old role until they log in again.
    const id = String(user._id);
    const cached = await redis.get(id);
    if (cached) {
      const session = JSON.parse(cached);
      session.role = "student";
      await redis.set(id, JSON.stringify(session), "EX", 7 * 24 * 60 * 60);
    }

    console.log(`  ${user.email}: -> student`);
  }

  console.log("Role migration complete.");
  await mongoose.disconnect();
  await redis.quit();
  process.exit(0);
};

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
