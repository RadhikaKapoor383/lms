import mongoose, { Document, Model, Schema } from "mongoose";

// A file (PDF, Word, PowerPoint, Excel) an instructor attaches to a course.
// The file itself lives in private storage; this record is what lets the server
// decide who may download it. The storage id is never sent to the browser.
export interface ICourseMaterial extends Document {
  course: mongoose.Types.ObjectId;
  lesson?: mongoose.Types.ObjectId; // optional: attach to one lesson
  title: string;
  fileName: string; // original name, for the download
  ext: string;
  mimeType: string;
  size: number; // bytes
  publicId: string; // storage id - server only
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const courseMaterialSchema = new Schema<ICourseMaterial>(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson" },
    title: { type: String, required: true, maxlength: 120 },
    fileName: { type: String, required: true, maxlength: 120 },
    ext: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    publicId: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const CourseMaterialModel: Model<ICourseMaterial> = mongoose.model(
  "CourseMaterial",
  courseMaterialSchema
);
export default CourseMaterialModel;
