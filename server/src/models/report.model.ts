import mongoose, { Document, Model, Schema } from "mongoose";

export const REPORT_REASONS = ["spam", "abuse", "inappropriate", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// A user flagging a discussion thread or reply for the admins to look at.
// The text is copied into the report (excerpt): if the post is deleted before
// anyone reviews the report, the admin can still see what was reported.
export interface IReport extends Document {
  reporter: mongoose.Types.ObjectId;
  reporterName: string;
  targetType: "discussion" | "reply";
  course: mongoose.Types.ObjectId;
  discussion: mongoose.Types.ObjectId;
  replyId?: mongoose.Types.ObjectId;
  // "<discussionId>:thread" or "<discussionId>:<replyId>" - lets the database
  // allow each person to report each post only once.
  targetKey: string;
  excerpt: string;
  contentAuthor: mongoose.Types.ObjectId;
  contentAuthorName: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reporterName: { type: String, required: true },
    targetType: { type: String, enum: ["discussion", "reply"], required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    discussion: { type: Schema.Types.ObjectId, ref: "Discussion", required: true },
    replyId: { type: Schema.Types.ObjectId },
    targetKey: { type: String, required: true },
    excerpt: { type: String, required: true },
    contentAuthor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contentAuthorName: { type: String, required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String },
    status: { type: String, enum: REPORT_STATUSES, default: "open" },
    resolutionNote: { type: String },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

reportSchema.index({ reporter: 1, targetKey: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });

const ReportModel: Model<IReport> = mongoose.model("Report", reportSchema);
export default ReportModel;
