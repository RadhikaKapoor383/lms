import mongoose, { Document, Model, Schema } from "mongoose";

// A department (e.g. "Computer Science", "Business School") groups courses and
// the instructors who teach them. Like Category it is a real record, so its
// name lives in one place: courses and instructors store the id, never the name.
// It is optional on both - a course or instructor without one is still valid.
export interface IDepartment extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 80 },
  },
  { timestamps: true }
);

const DepartmentModel: Model<IDepartment> = mongoose.model("Department", departmentSchema);
export default DepartmentModel;
