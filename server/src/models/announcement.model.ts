import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAnnouncement extends Document {
  title: string;
  message: string;
  createdBy: string; // user id of the admin/instructor who posted it
  authorName?: string; // snapshot, so the author shows even if the account changes
  // Set  -> a course announcement: only that course's students (and its
  //         instructor/admin) can see it.
  // Unset -> a platform-wide announcement from an admin, visible to everyone.
  course?: mongoose.Types.ObjectId;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    createdBy: { type: String, required: true },
    authorName: { type: String },
    course: { type: Schema.Types.ObjectId, ref: "Course", index: true },
  },
  { timestamps: true }
);

const AnnouncementModel: Model<IAnnouncement> = mongoose.model(
  "Announcement",
  announcementSchema
);

export default AnnouncementModel;