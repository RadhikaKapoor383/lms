import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAuditLog extends Document {
  userId: string;
  userName: string;
  action: string; // e.g. "course.create", "user.delete"
  targetLabel: string; // human-readable description of what was affected
  meta?: Record<string, any>;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    action: { type: String, required: true },
    targetLabel: { type: String, required: true },
    meta: { type: Object },
  },
  { timestamps: true }
);

const AuditLogModel: Model<IAuditLog> = mongoose.model(
  "AuditLog",
  auditLogSchema
);

export default AuditLogModel;