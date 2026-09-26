import mongoose, { Document, Model, Schema } from "mongoose";

// A real entity (not a free-text string) so a category's name lives in exactly
// one place. Courses store a category's id, never its name.
export interface ICategory extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, unique: true },
  },
  { timestamps: true }
);

const CategoryModel: Model<ICategory> = mongoose.model("Category", categorySchema);
export default CategoryModel;
