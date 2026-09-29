import mongoose, { Document, Model, Schema } from "mongoose";

// One document per (student, lesson) the student has completed.
// lessonId points at a Lesson document (see lesson.model.ts).
export interface ILessonProgress extends Document {
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  enrollment: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  completedAt: Date;
}

const lessonProgressSchema = new Schema<ILessonProgress>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    enrollment: { type: Schema.Types.ObjectId, ref: "Enrollment", required: true },
    lessonId: { type: Schema.Types.ObjectId, required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// A lesson can only be "completed" once per student
lessonProgressSchema.index({ student: 1, lessonId: 1 }, { unique: true });
lessonProgressSchema.index({ student: 1, course: 1 });

const LessonProgressModel: Model<ILessonProgress> = mongoose.model(
  "LessonProgress",
  lessonProgressSchema
);
export default LessonProgressModel;
