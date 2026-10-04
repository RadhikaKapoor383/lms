import mongoose, { Document, Model, Schema } from "mongoose";

export const DISCUSSION_ROLES = ["student", "instructor", "admin"] as const;
export type DiscussionRole = (typeof DISCUSSION_ROLES)[number];

export const MAX_REPLIES_PER_THREAD = 500;

export interface IDiscussionReply {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  authorName: string;
  authorRole: DiscussionRole;
  body: string;
  createdAt: Date;
}

// One thread in a course's discussion area. Replies live inside the thread:
// a class thread is small, and keeping them together means one read shows the
// whole conversation and deleting a thread can't leave orphaned replies.
// The author's name and role are snapshots, so a thread still reads properly
// if the account is renamed, and "answered by staff" doesn't need a user lookup.
export interface IDiscussion extends Document {
  course: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  authorName: string;
  authorRole: DiscussionRole;
  title: string;
  body: string;
  pinned: boolean;
  replies: IDiscussionReply[];
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const replySchema = new Schema<IDiscussionReply>({
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  authorName: { type: String, required: true },
  authorRole: { type: String, enum: DISCUSSION_ROLES, required: true },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const discussionSchema = new Schema<IDiscussion>(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, enum: DISCUSSION_ROLES, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    pinned: { type: Boolean, default: false },
    replies: [replySchema],
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// the course list: pinned first, then most recently active
discussionSchema.index({ course: 1, pinned: -1, lastActivityAt: -1 });

const DiscussionModel: Model<IDiscussion> = mongoose.model("Discussion", discussionSchema);
export default DiscussionModel;
