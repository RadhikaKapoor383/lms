import mongoose, { Document, Model, Schema } from "mongoose";

// The server's own "register entry" for a quiz attempt in progress.
// Created when a student opens the quiz (POST /quizzes/:id/start) and consumed
// when they submit. Because the start time lives HERE and not in the request
// body, a student can't claim a later start time to dodge the time limit.
export interface IQuizStart extends Document {
  quiz: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  startedAt: Date;
}

const quizStartSchema = new Schema<IQuizStart>({
  quiz: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
  student: { type: Schema.Types.ObjectId, ref: "User", required: true },
  // TTL: MongoDB deletes abandoned records after 1 day on its own.
  startedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

// One in-progress record per student per quiz.
quizStartSchema.index({ quiz: 1, student: 1 }, { unique: true });

const QuizStartModel: Model<IQuizStart> = mongoose.model("QuizStart", quizStartSchema);
export default QuizStartModel;
