import mongoose, { Document, Model, Schema } from "mongoose";

// One document per (assignment, student). Resubmitting updates this same
// document rather than creating a new one - see assignment.service.ts.
export interface IAssignmentSubmission extends Document {
  assignment: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  submissionText?: string;
  fileUrl?: string;
  submittedAt: Date;
  isLate: boolean;
  marks?: number;
  feedback?: string;
  gradedBy?: mongoose.Types.ObjectId;
  gradedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignment: { type: Schema.Types.ObjectId, ref: "Assignment", required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    submissionText: { type: String },
    fileUrl: { type: String },
    submittedAt: { type: Date, required: true },
    isLate: { type: Boolean, default: false },
    marks: { type: Number },
    feedback: { type: String },
    gradedBy: { type: Schema.Types.ObjectId, ref: "User" },
    gradedAt: { type: Date },
  },
  { timestamps: true }
);

// One submission per student per assignment - resubmission updates it.
assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

const AssignmentSubmissionModel: Model<IAssignmentSubmission> = mongoose.model(
  "AssignmentSubmission",
  assignmentSubmissionSchema
);
export default AssignmentSubmissionModel;
