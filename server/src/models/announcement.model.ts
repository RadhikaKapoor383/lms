import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAnnouncement extends Document {
  title: string;
  message: string;
  createdBy: string; // admin user id
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

const AnnouncementModel: Model<IAnnouncement> = mongoose.model(
  "Announcement",
  announcementSchema
);

export default AnnouncementModel;