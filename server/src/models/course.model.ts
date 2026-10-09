import mongoose, { Document, Model, Schema } from "mongoose";
import { IUser } from "./user.model";

export interface IComment extends Document {
  user: IUser;
  question: string;
  questionReplies: IComment[];
}

export interface IReview extends Document {
  user: IUser;
  rating: number;
  comment: string;
  createdAt?: Date;
  commentReplies: IComment[];
}

export interface ILink extends Document {
  title: string;
  url: string;
}

// Who can put a student into a course:
//   open   - students enroll themselves (free) or buy it (paid)
//   manual - only the instructor/admin enrolls students (private course)
//   code   - students need the course's enrollment code (invite-based)
export const ENROLLMENT_MODES = ["open", "manual", "code"] as const;
export type EnrollmentMode = (typeof ENROLLMENT_MODES)[number];

export interface ICourse extends Document {
  // The instructor who owns this course. Optional so courses created before
  // roles existed (or admin-created, not-yet-assigned courses) stay valid.
  instructor?: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  estimatedPrice?: number;
  thumbnail: {
    public_id: string;
    url: string;
  };
  // Optional so a course created before this field existed stays valid until
  // the category migration (or an admin edit) fills it in.
  category?: mongoose.Types.ObjectId;
  level: string;
  durationHours?: number;
  demoUrl: string;
  benefits: { title: string }[];
  prerequisites: { title: string }[];
  reviews: IReview[];
  ratings?: number;
  purchased?: number;
  status: "Draft" | "Pending Approval" | "Published" | "Rejected" | "Archived";
  enrollmentMode: EnrollmentMode;
  enrollmentCodeHash?: string; // bcrypt hash - never sent to the client
}

export const COURSE_STATUSES = [
  "Draft",
  "Pending Approval",
  "Published",
  "Rejected",
  "Archived",
] as const;

const reviewSchema = new Schema<IReview>({
  user: Object,
  rating: { type: Number, default: 0 },
  comment: String,
  createdAt: { type: Date, default: Date.now },
  commentReplies: [Object],
});

export const linkSchema = new Schema<ILink>({
  title: String,
  url: String,
});

export const commentSchema = new Schema<IComment>({
  user: Object,
  question: String,
  questionReplies: [Object],
});

const courseSchema = new Schema<ICourse>(
  {
    instructor: { type: Schema.Types.ObjectId, ref: "User", index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    estimatedPrice: { type: Number },
    thumbnail: {
      public_id: { type: String },
      url: { type: String },
    },
    category: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    level: { type: String, required: true },
    // Total learning time in hours (shown on the course page and cards).
    durationHours: { type: Number, min: 0, max: 10000 },
    demoUrl: { type: String, required: true },
    benefits: [{ title: String }],
    prerequisites: [{ title: String }],
    reviews: [reviewSchema],
    ratings: { type: Number, default: 0 },
    purchased: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Draft", "Pending Approval", "Published", "Rejected", "Archived"],
      default: "Draft",
    },
    enrollmentMode: {
      type: String,
      enum: ENROLLMENT_MODES,
      default: "open",
    },
    // select:false = excluded from every query unless explicitly asked for
    enrollmentCodeHash: { type: String, select: false },
  },
  { timestamps: true }
);

const CourseModel: Model<ICourse> = mongoose.model("Course", courseSchema);
export default CourseModel;