import mongoose, { Document, Model, Schema } from "mongoose";

// Platform-wide switches an admin can flip. There is exactly ONE document
// (key "platform"); the code reads it through services/settings.service.ts.
export interface ISettings extends Document {
  key: string;
  // Shown on certificates.
  platformName: string;
  // true  -> instructor courses must be approved by an admin before going live.
  // false -> "submit" publishes the course straight away.
  requireCourseApproval: boolean;
  // false -> students can't enroll themselves (free or with a code); only
  // instructors and admins can enroll people.
  allowSelfEnrollment: boolean;
  // true  -> a new student can verify their email but cannot log in until an
  //          admin approves the account.
  // false -> verifying the email is enough (default).
  requireStudentApproval: boolean;
  updatedBy?: string;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true, default: "platform" },
    platformName: { type: String, required: true },
    requireCourseApproval: { type: Boolean, default: true },
    allowSelfEnrollment: { type: Boolean, default: true },
    requireStudentApproval: { type: Boolean, default: false },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const SettingsModel: Model<ISettings> = mongoose.model("Settings", settingsSchema);
export default SettingsModel;
