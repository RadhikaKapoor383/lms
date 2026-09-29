import mongoose, { Document, Model, Schema } from "mongoose";
import { IComment, ILink, commentSchema, linkSchema } from "./course.model";

// One piece of content a student works through. Belongs to a Module; `course`
// is denormalized here too so progress tracking and access checks never need
// to hop through Module just to know which course a lesson belongs to.
export interface ILesson extends Document {
  module: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  title: string;
  description: string;
  videoUrl: string;
  videoThumbnail: object;
  videoLength: number;
  videoPlayer: string;
  links: ILink[];
  suggestion: string;
  questions: IComment[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new Schema<ILesson>(
  {
    module: { type: Schema.Types.ObjectId, ref: "Module", required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    videoUrl: { type: String },
    videoThumbnail: { type: Object },
    videoLength: { type: Number },
    videoPlayer: { type: String },
    links: [linkSchema],
    suggestion: { type: String },
    questions: [commentSchema],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

lessonSchema.index({ course: 1, order: 1 });
lessonSchema.index({ module: 1, order: 1 });

const LessonModel: Model<ILesson> = mongoose.model("Lesson", lessonSchema);
export default LessonModel;
