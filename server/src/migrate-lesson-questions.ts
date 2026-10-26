// One-time move: the old per-lesson Q&A ("Ask a question" under a lesson) into
// Discussions. Each question becomes a thread about that lesson, its answers
// become replies, and names, roles and dates are kept.
//
//   npm run migrate:lesson-questions             copy questions into Discussions
//   npm run migrate:lesson-questions -- --clear  copy, then remove the old Q&A
//                                                from the lessons
//
// Safe to run more than once: a question already copied is skipped (each
// thread remembers which question it came from). --clear only removes a
// lesson's old questions once every one of them is in Discussions.
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "./utils/db";
import { redis } from "./utils/redis";
import DiscussionModel from "./models/discussion.model";
import userModel from "./models/user.model";
import { questionToThread } from "./services/lessonQaMigration.service";

const CLEAR = process.argv.slice(2).includes("--clear");

const migrate = async () => {
  await connectDB();
  // The lesson model no longer has a "questions" field, so read it raw.
  const lessons = mongoose.connection.collection("lessons");
  const withQuestions = await lessons
    .find({ "questions.0": { $exists: true } }, { projection: { course: 1, title: 1, questions: 1, createdAt: 1 } })
    .toArray();
  console.log(`Lessons with old questions: ${withQuestions.length}`);

  // roles for snapshots that didn't store one
  const userIds = new Set<string>();
  for (const l of withQuestions) {
    for (const q of (l as any).questions || []) {
      if (q?.user?._id) userIds.add(String(q.user._id));
      for (const r of q?.questionReplies || []) if (r?.user?._id) userIds.add(String(r.user._id));
    }
  }
  const roles = new Map<string, string>(
    (await userModel.find({ _id: { $in: [...userIds] } }).select("role").lean()).map(
      (u: any) => [String(u._id), String(u.role)] as [string, string]
    )
  );

  let copied = 0, skipped = 0, unusable = 0, cleared = 0, failed = 0;
  for (const lesson of withQuestions as any[]) {
    let lessonComplete = true;
    for (const q of lesson.questions) {
      const thread = questionToThread(q, lesson, roles, lesson.createdAt || new Date());
      if (!thread) {
        unusable++;
        continue; // nothing to copy (empty text or no asker) - nothing lost by clearing it
      }
      try {
        if (await DiscussionModel.exists({ migratedFrom: thread.migratedFrom })) {
          skipped++;
          continue;
        }
        // insert raw so the old dates are kept (timestamps would overwrite them)
        await DiscussionModel.collection.insertOne({
          ...thread,
          replies: thread.replies.map((r) => ({ _id: new mongoose.Types.ObjectId(), ...r })),
        } as any);
        copied++;
      } catch (error: any) {
        if (error?.code === 11000) {
          skipped++; // another run copied it at the same moment
        } else {
          lessonComplete = false;
          failed++;
          console.error(`Lesson ${lesson._id}: could not copy a question -`, error.message);
        }
      }
    }
    if (CLEAR && lessonComplete) {
      await lessons.updateOne({ _id: lesson._id }, { $unset: { questions: 1 } });
      cleared++;
    }
  }

  console.log(
    `Threads created: ${copied}, already copied: ${skipped}, empty questions ignored: ${unusable}, failed: ${failed}` +
      (CLEAR ? `, lessons cleared: ${cleared}` : "\nOld questions are still in the lessons; run again with --clear to remove them.")
  );

  await mongoose.disconnect();
  await redis.quit();
  process.exit(failed ? 1 : 0);
};

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
