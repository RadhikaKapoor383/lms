import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  getMyNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotification,
} from "../controllers/notification.controller";

const notificationRouter = express.Router();

notificationRouter.get(
  "/admin/notifications",
  isAuthenticated,
  authorizeRoles("admin"),
  getNotifications
);

notificationRouter.put(
  "/admin/update-notification/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  updateNotification
);

// Personal notifications - any logged-in role, always scoped to the caller.
// "read-all" is declared before "/:id/read" so the word isn't taken for an id.
notificationRouter.get("/notifications", isAuthenticated, getMyNotifications);
notificationRouter.put("/notifications/read-all", isAuthenticated, markAllNotificationsRead);
notificationRouter.put("/notifications/:id/read", isAuthenticated, markNotificationRead);

export default notificationRouter;
