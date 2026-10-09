import mongoose, { Document, Model, Schema } from "mongoose";

// A question lives inside its Quiz (unlike Lesson, nothing outside the quiz
// needs to reference a question by a stable id across edits, so there's no
// need for a separate collection here).
export interface IQuizOption {
  _id: mongoose.Types.ObjectId;
  text: string;
  // Never sent to a student before they submit an attempt - see
  // sanitizeQuizForAttempt in quiz.controller.ts.
  isCorrect: boolean;
}

export interface IQuizQuestion {
  _id: mongoose.Types.ObjectId;
  questionText: string;
  // "trueFalse" is just a 2-option "single" underneath - kept as its own
  // label so the client can render it differently, but graded identically.
  type: "single" | "multiple" | "trueFalse" | "shortAnswer";
  options: IQuizOption[];
  // Only for "shortAnswer": the answers that count as correct (compared
  // ignoring case and extra spaces). Never sent to a student.
  acceptedAnswers: string[];
  marks: number;
}

export interface IQuiz extends Document {
  course: mongoose.Types.ObjectId;
  instructor: mongoose.Types.ObjectId;
  title: string;
  description: string;
  questions: IQuizQuestion[];
  timeLimitMinutes?: number; // 0/undefined = untimed
  maxAttempts: number;
  passingScore: number; // percentage, e.g. 60
  randomizeQuestions: boolean;
  showResultsImmediately: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// isCorrect is NOT hidden at the schema level (select:false on a field nested
// two levels into an array of subdocuments is unreliable in Mongoose) - it's
// explicitly stripped in the controller before anything is sent to a student.
// See sanitizeQuizForStudent in quiz.controller.ts.
const quizOptionSchema = new Schema<IQuizOption>({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
});

const quizQuestionSchema = new Schema<IQuizQuestion>({
  questionText: { type: String, required: true },
  type: {
    type: String,
    enum: ["single", "multiple", "trueFalse", "shortAnswer"],
    default: "single",
  },
  acceptedAnswers: { type: [String], default: [] },
  options: {
    type: [quizOptionSchema],
    validate: {
      // short-answer questions have no options; the per-type rules are
      // checked in validateQuestion before a quiz is saved
      validator: (opts: IQuizOption[]) => opts.length === 0 || opts.length >= 2,
      message: "A question needs at least 2 options",
    },
  },
  marks: { type: Number, default: 1, min: 1 },
});

const quizSchema = new Schema<IQuiz>(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    instructor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    questions: [quizQuestionSchema],
    timeLimitMinutes: { type: Number },
    maxAttempts: { type: Number, default: 1, min: 1 },
    passingScore: { type: Number, default: 60, min: 0, max: 100 },
    randomizeQuestions: { type: Boolean, default: false },
    showResultsImmediately: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const QuizModel: Model<IQuiz> = mongoose.model("Quiz", quizSchema);
export default QuizModel;
