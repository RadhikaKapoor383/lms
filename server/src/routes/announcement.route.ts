import express from "express";
import { authorizeCourseOwner, authorizeRoles, isAuthenticated, requirePermission } from "../middleware/auth";
import {
  createAnnouncement,
  createCourseAnnouncement,
  deleteAnnouncement,
  deleteCourseAnnouncement,
  getAnnouncements,
  getCourseAnnouncements,
  getMyAnnouncements,
} from "../controllers/announcement.controller";

const announcementRouter = express.Router();

announcementRouter.get("/announcements", getAnnouncements);

announcementRouter.post(
  "/admin/create-announcement",
  isAuthenticated,
  authorizeRoles("admin"),
  createAnnouncement
);

announcementRouter.delete(
  "/admin/announcement/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  deleteAnnouncement
);

// ---- course announcements ----
announcementRouter.get("/my-announcements", isAuthenticated, getMyAnnouncements);

announcementRouter.get("/courses/:id/announcements", isAuthenticated, getCourseAnnouncements);

announcementRouter.post(
  "/courses/:id/announcements",
  isAuthenticated,
  requirePermission("announcement.post"),
  authorizeRoles("admin", "instructor"),
  authorizeCourseOwner,
  createCourseAnnouncement
);

announcementRouter.delete(
  "/courses/:id/announcements/:announcementId",
  isAuthenticated,
  requirePermission("announcement.post"),
  authorizeRoles("admin", "instructor"),
  authorizeCourseOwner,
  deleteCourseAnnouncement
);

export default announcementRouter;