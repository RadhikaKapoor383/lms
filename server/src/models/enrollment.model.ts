import mongoose, { Document, Model, Schema } from "mongoose";

// How the student got into the course
export const ENROLLMENT_METHODS = ["self", "paid", "instructor", "code"] as const;
export type EnrollmentMethod = (typeof ENROLLMENT_METHODS)[number];

// "revoked" = removed by an instructor/admin. We keep the record (history)
// instead of deleting it, and access checks ignore revoked enrollments.
export const ENROLLMENT_STATUSES = ["active", "completed", "revoked"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export interface IEnrollment extends Document {
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  instructor?: mongoose.Types.ObjectId; // course owner at enrollment time
  method: EnrollmentMethod;
  status: EnrollmentStatus;
  completionPercentage: number;
  completedAt?: Date;
  createdAt: Date; // = enrollment date
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    instructor: { type: Schema.Types.ObjectId, ref: "User" },
    method: { type: String, enum: ENROLLMENT_METHODS, required: true },
    status: { type: String, enum: ENROLLMENT_STATUSES, default: "active" },
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// The database itself refuses a second enrollment for the same student + course,
// so duplicates are impossible even if two requests arrive at the same moment.
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1, status: 1 });

const EnrollmentModel: Model<IEnrollment> = mongoose.model(
  "Enrollment",
  enrollmentSchema
);
export default EnrollmentModel;
