import mongoose, { Document, Model, Schema } from "mongoose";

export interface IQuizAnswer {
  questionId: mongoose.Types.ObjectId;
  // Indexes into that question's own `options` array. Only question ORDER is
  // ever shuffled for a student (see quiz.controller.ts) - each question's
  // own options stay in a fixed order, so an index here is always valid
  // regardless of how questions were presented.
  selectedOptionIndexes: number[];
}

// One document per attempt - unlike AssignmentSubmission, a quiz allows more
// than one (up to maxAttempts), so this is intentionally not a 1:1 upsert.
export interface IQuizAttempt extends Document {
  quiz: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  answers: IQuizAnswer[];
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  attemptNumber: number;
  startedAt: Date;
  submittedAt: Date;
}

const quizAnswerSchema = new Schema<IQuizAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    selectedOptionIndexes: [{ type: Number }],
  },
  { _id: false }
);

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    quiz: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    answers: [quizAnswerSchema],
    score: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    percentage: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    attemptNumber: { type: Number, required: true },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ quiz: 1, student: 1 });

const QuizAttemptModel: Model<IQuizAttempt> = mongoose.model("QuizAttempt", quizAttemptSchema);
export default QuizAttemptModel;
