import mongoose, { Document, Model, Schema } from "mongoose";

// One document per role (instructor / student) listing the permissions an
// admin switched OFF for that role. See services/permissions.service.ts.
export interface IRolePermissions extends Document {
  role: "instructor" | "student";
  denied: string[];
  updatedBy?: string;
  updatedAt: Date;
}

const rolePermissionsSchema = new Schema<IRolePermissions>(
  {
    role: { type: String, enum: ["instructor", "student"], required: true, unique: true },
    denied: { type: [String], default: [] },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const RolePermissionsModel: Model<IRolePermissions> = mongoose.model("RolePermissions", rolePermissionsSchema);
export default RolePermissionsModel;
