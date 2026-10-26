import mongoose, { Document, Model, Schema } from "mongoose";
import { emitToUser, notificationEvent } from "../utils/realtime";

export interface INotification extends Document {
  title: string;
  message: string;
  status: string;
  userId: string;
  // Where clicking the notification should go (a path on this site, e.g.
  // "/course-access/123/quizzes"). Optional - old notifications have none.
  link?: string;
}

const notificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, required: true, default: "unread" },
    userId: { type: String },
    link: { type: String },
  },
  { timestamps: true }
);

// "my latest notifications" and "my unread count" both filter by userId
notificationSchema.index({ userId: 1, createdAt: -1 });

// Every new notification, however it was created (create, save or
// insertMany), is pushed to its person's open browsers straight away.
notificationSchema.post("save", function (doc: any) {
  emitToUser(doc.userId, "notification:new", notificationEvent(doc));
});
notificationSchema.post("insertMany", function (docs: any) {
  for (const doc of Array.isArray(docs) ? docs : []) emitToUser(doc.userId, "notification:new", notificationEvent(doc));
});

const NotificationModel: Model<INotification> = mongoose.model(
  "Notification",
  notificationSchema
);
export default NotificationModel;
