import mongoose, { Document, Model, Schema } from "mongoose";
import { ILink, linkSchema } from "./course.model";

// A task an instructor sets for a course. Not tied to a specific Module/Lesson -
// the spec treats assignments as a course-level tab, so this stays simple.
export interface IAssignment extends Document {
  course: mongoose.Types.ObjectId;
  instructor: mongoose.Types.ObjectId;
  title: string;
  instructions: string;
  resources: ILink[];
  maxMarks: number;
  deadline: Date;
  // If false, a student can only submit once - a second attempt is rejected
  // rather than silently overwriting their graded work.
  allowResubmission: boolean;
  // Set once the "due within 24h" reminder went out, so it is sent only once.
  // Reset when the deadline is changed.
  deadlineReminderSent?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    instructor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    instructions: { type: String, default: "" },
    resources: [linkSchema],
    maxMarks: { type: Number, required: true, min: 1 },
    deadline: { type: Date, required: true },
    allowResubmission: { type: Boolean, default: false },
    deadlineReminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const AssignmentModel: Model<IAssignment> = mongoose.model("Assignment", assignmentSchema);
export default AssignmentModel;
