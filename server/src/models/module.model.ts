import mongoose, { Document, Model, Schema } from "mongoose";

// A named section of a course ("Getting Started", "Advanced Topics"...).
// Lessons point at a Module; a Module never stores lesson content itself.
export interface IModule extends Document {
  course: mongoose.Types.ObjectId;
  title: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const moduleSchema = new Schema<IModule>(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

moduleSchema.index({ course: 1, order: 1 });

const ModuleModel: Model<IModule> = mongoose.model("Module", moduleSchema);
export default ModuleModel;
