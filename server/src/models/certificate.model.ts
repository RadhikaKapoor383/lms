import mongoose, { Document, Model, Schema } from "mongoose";

export const CERTIFICATE_STATUSES = ["valid", "revoked"] as const;
export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number];

// One certificate per (student, course). The names are SNAPSHOTS taken at the
// moment of issue: if the course is renamed or deleted later, or the instructor
// changes their name, a certificate that was already handed out must not change
// (and must still verify). The ObjectIds are kept only for linking/filtering.
export interface ICertificate extends Document {
  certificateId: string; // public, unguessable, printed on the certificate
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  instructor?: mongoose.Types.ObjectId;
  studentName: string;
  courseName: string;
  instructorName: string;
  platformName: string;
  completionDate: Date;
  issuedAt: Date;
  status: CertificateStatus;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificate>(
  {
    certificateId: { type: String, required: true, unique: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    instructor: { type: Schema.Types.ObjectId, ref: "User" },
    studentName: { type: String, required: true },
    courseName: { type: String, required: true },
    instructorName: { type: String, required: true },
    platformName: { type: String, required: true },
    completionDate: { type: Date, required: true },
    issuedAt: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: CERTIFICATE_STATUSES, default: "valid" },
    revokedAt: { type: Date },
    revokedReason: { type: String },
  },
  { timestamps: true }
);

// The database itself guarantees one certificate per student per course, even
// if two requests try to issue at the same instant.
certificateSchema.index({ student: 1, course: 1 }, { unique: true });
certificateSchema.index({ instructor: 1, issuedAt: -1 });

const CertificateModel: Model<ICertificate> = mongoose.model(
  "Certificate",
  certificateSchema
);
export default CertificateModel;
